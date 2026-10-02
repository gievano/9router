const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");

const origCreate = http.createServer.bind(http);

// Per-process secret proving x-9r-real-ip was stamped below rather than sent by the client.
// A bare `next start` / `next dev` never loads this file, so it cannot produce a matching
// header even though the env var is inherited by child processes. Named like x-9r-cli-token
// so the request-detail header sanitizer redacts it too.
const PEER_TOKEN = crypto.randomBytes(24).toString("hex");
process.env.NINEROUTER_PEER_TOKEN = PEER_TOKEN;

let backgroundRefreshStarted = false;

// Arm the automatic-backup scheduler as soon as the HTTP server is listening.
// The Next-side bootstrap also starts it, but only when a page render runs;
// on a quiet server the timer would otherwise stay dead until the settings
// page is opened. configureTelegramBackup reads the stored config and no-ops
// when backups are disabled, so calling it unconditionally is safe.
let autoBackupStarted = false;
function startAutoBackupFromCustomServer() {
  if (autoBackupStarted) return;
  autoBackupStarted = true;
  const candidates = [
    path.join(__dirname, "src", "shared", "services", "telegramBackup.js"),
    path.join(__dirname, "..", "src", "shared", "services", "telegramBackup.js"),
  ];
  const modPath = candidates.find((p) => fs.existsSync(p));
  if (!modPath) {
    if (process.env.DEBUG_AUTO_BACKUP) console.error("[AutoBackup] module not found in standalone build");
    return;
  }
  import(pathToFileURL(modPath).href)
    .then((m) => {
      m.configureTelegramBackup().catch((e) => {
        console.error("[AutoBackup] configure failed:", e && e.message ? e.message : e);
      });
    })
    .catch((e) => {
      if (process.env.DEBUG_AUTO_BACKUP) console.error("[AutoBackup] import failed:", e && e.message ? e.message : e);
    });
}

function startBackgroundTokenRefreshFromCustomServer() {
  if (backgroundRefreshStarted) return;
  backgroundRefreshStarted = true;
  // Prefer source path (repo / standalone that still has src). Fail-open if missing
  // — initializeApp also starts the same scheduler when the Next app boots.
  const modPath = path.join(__dirname, "src", "sse", "services", "backgroundTokenRefresh.js");
  import(pathToFileURL(modPath).href)
    .then((m) => {
      try {
        m.startBackgroundTokenRefresh();
      } catch (e) {
        console.error("[BackgroundTokenRefresh] start failed:", e && e.message ? e.message : e);
      }
      const stop = () => {
        try {
          m.stopBackgroundTokenRefresh();
        } catch {
          /* ignore */
        }
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    })
    .catch((e) => {
      // Expected in published CLI standalone (src/ not on disk). App bootstrap covers it.
      if (process.env.DEBUG_BACKGROUND_TOKEN_REFRESH) {
        console.error("[BackgroundTokenRefresh] import failed:", e && e.message ? e.message : e);
      }
    });
}

// --- Dashboard auth guard (loader hooks: scripts/auth-guard-hooks.mjs) -----
// Upstream enforces auth in middleware.js -> proxy.js (Next.js 16, Node
// runtime). This fork runs Next.js 14, whose middleware is Edge-only, so the
// Node-dependent guard could never execute there: the app answered every
// /api/* route unauthenticated and never asked for a password. Wrapping the
// HTTP handler keeps src/dashboardGuard.js the single source of truth for which
// paths are public, so no path list is duplicated here.
let guardModulePromise = null;
function getGuardModule() {
  if (!guardModulePromise) {
    guardModulePromise = (async () => {
      const hooksPath = path.join(__dirname, "scripts", "auth-guard-hooks.mjs");
      const guardPath = path.join(__dirname, "src", "dashboardGuard.js");
      if (!fs.existsSync(hooksPath) || !fs.existsSync(guardPath)) return null;
      require("node:module").register(pathToFileURL(hooksPath).href);
      return await import(pathToFileURL(guardPath).href);
    })().catch((error) => {
      console.error("[AuthGuard] load failed:", error && error.message);
      return null;
    });
  }
  return guardModulePromise;
}

const GUARD_SKIP = /^\/(_next\/(static|image)|favicon\.ico)/;

// NextRequest-shaped view of a raw IncomingMessage: the guard reads only
// headers.get(), nextUrl.pathname/searchParams, cookies, method and url.
function toGuardRequest(req) {
  const url = req.url || "/";
  const qIndex = url.indexOf("?");
  const pathname = qIndex === -1 ? url : url.slice(0, qIndex);
  const search = qIndex === -1 ? "" : url.slice(qIndex + 1);
  const rawCookies = req.headers && req.headers.cookie ? req.headers.cookie : "";
  return {
    method: req.method || "GET",
    url: "http://" + ((req.headers && req.headers.host) || "localhost") + url,
    nextUrl: { pathname, searchParams: new URLSearchParams(search) },
    headers: {
      get(name) {
        const v = req.headers ? req.headers[String(name).toLowerCase()] : undefined;
        if (v === undefined) return null;
        return Array.isArray(v) ? v[0] : v;
      },
    },
    cookies: {
      get(name) {
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const m = rawCookies.match(new RegExp("(?:^|;\\s*)" + esc + "=([^;]*)"));
        return m ? { name, value: decodeURIComponent(m[1]) } : undefined;
      },
    },
  };
}

// True when the guard answered the request itself (deny or redirect).
async function runAuthGuard(req, res) {
  if (GUARD_SKIP.test(req.url || "/")) return false;
  const guard = await getGuardModule();
  if (!guard) {
    if (!runAuthGuard._warned) {
      runAuthGuard._warned = true;
      console.error("[AuthGuard] guard unavailable, requests NOT authenticated (src/ missing?)");
    }
    return false;
  }
  let response;
  try {
    response = await guard.proxy(toGuardRequest(req));
  } catch (error) {
    console.error("[AuthGuard] proxy threw:", error && error.message);
    return false;
  }
  if (!response || response.headers.get("x-middleware-next") === "1") return false;
  res.statusCode = response.status || 500;
  response.headers.forEach((value, key) => {
    if (key === "set-cookie") res.setHeader("set-cookie", Array.isArray(value) ? value : [value]);
    else if (key !== "content-length") res.setHeader(key, value);
  });
  if (response.body) {
    const buf = Buffer.from(await new Response(response.body).arrayBuffer());
    res.setHeader("content-length", buf.length);
    res.end(buf);
  } else {
    res.end();
  }
  return true;
}

// Wrap Next standalone HTTP server: derive client IP from the TCP socket
// (unspoofable) and strip client-supplied forwarding headers so downstream
// rate-limiting keys on the real peer address instead of attacker-controlled XFF.
http.createServer = (...args) => {
  const handler = args.find((a) => typeof a === "function");
  const rest = args.filter((a) => typeof a !== "function");
  if (!handler) return origCreate(...args);
  const wrapped = (req, res) => {
    const socketIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
    const xff = req.headers["x-forwarded-for"];
    const xRealIp = req.headers["x-real-ip"];
    const viaProxy = !!(xff || xRealIp);
    const isLoopbackProxy = socketIp === "127.0.0.1" || socketIp === "::1" || socketIp === "::ffff:127.0.0.1";
    // Trust forwarding headers only when the TCP peer is a local reverse proxy.
    // Direct/public sockets remain keyed by the unspoofable peer address.
    const proxyIp = xRealIp || (xff ? String(xff).split(",")[0].trim() : "");
    const ip = isLoopbackProxy && proxyIp ? proxyIp : socketIp;
    delete req.headers["x-9r-real-ip"];
    delete req.headers["x-forwarded-for"];
    delete req.headers["x-9r-via-proxy"];
    delete req.headers["x-9r-peer-token"];
    req.headers["x-9r-real-ip"] = ip;
    req.headers["x-9r-peer-token"] = PEER_TOKEN;
    if (viaProxy) req.headers["x-9r-via-proxy"] = "1";
    // Auth gate ahead of Next; runAuthGuard resolves false when the request
    // may pass through, true when it already answered (401 or redirect).
    return runAuthGuard(req, res)
      .then((handled) => { if (!handled) return handler(req, res); })
      .catch((error) => {
        console.error("[AuthGuard] request failed:", error && error.message);
        return handler(req, res);
      });
  };
  const server = origCreate(...rest, wrapped);
  server.once("listening", () => {
    startBackgroundTokenRefreshFromCustomServer();
    startAutoBackupFromCustomServer();
  });
  const origEmit = server.emit;
  // JBR 25 sends h2c upgrades that the HTTP/1.1 server would otherwise close.
  server.emit = function (event, ...eventArgs) {
    const [req, socket, head] = eventArgs;
    if (event !== "upgrade" || String(req.headers.upgrade || "").toLowerCase() !== "h2c") {
      return origEmit.call(this, event, ...eventArgs);
    }

    const contentLength = Number(req.headers["content-length"] || 0);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      socket.destroy();
      return true;
    }
    const chunks = [head];
    let received = head.length;
    const serve = () => {
      // Replay the upgraded request through the existing HTTP/1.1 handler.
      const replay = new http.IncomingMessage(socket);
      Object.assign(replay, { method: req.method, url: req.url, headers: req.headers, complete: true });
      if (received) replay.push(Buffer.concat(chunks, received).subarray(0, contentLength));
      replay.push(null);
      const res = new http.ServerResponse(replay);
      res.shouldKeepAlive = false;
      res.assignSocket(socket);
      res.once("finish", () => socket.end());
      Promise.resolve().then(() => wrapped(replay, res)).catch((error) => {
        console.error("Failed to downgrade h2c request", error);
        socket.destroy();
      });
    };
    if (received >= contentLength) serve();
    else {
      socket.on("data", function readBody(chunk) {
        chunks.push(chunk);
        received += chunk.length;
        if (received < contentLength) return;
        socket.off("data", readBody);
        serve();
      });
      socket.resume();
    }
    delete req.headers.upgrade;
    delete req.headers["http2-settings"];
    req.headers.connection = "close";
    return true;
  };
  return server;
};

if (require.main === module) {
  const standalone = path.join(__dirname, "server.js");
  if (fs.existsSync(standalone)) {
    require(standalone);
  } else {
    // Repo checkout has no standalone build next to us. `next start` builds its HTTP
    // server in-process, so the wrapper above still sanitizes every request.
    const nextBin = require.resolve("next/dist/bin/next");
    process.argv = [process.argv[0], nextBin, "start", ...process.argv.slice(2)];
    require(nextBin);
  }
}
