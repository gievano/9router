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
  // - initializeApp also starts the same scheduler when the Next app boots.
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

// --- Port/agent configuration from .env ---------------------------------
// No dotenv dependency exists here, and `npm start` bakes `--port 20127` into
// its argv, so a PORT written in .env was ignored on every startup. Load the
// file ourselves (shell-exported env still wins) and make argv agree, since
// the next-bin path reads argv while the standalone server reads env.
function applyDotEnvPort() {
  for (const name of [".env.local", ".env"]) {
    let text;
    try {
      text = fs.readFileSync(path.join(__dirname, name), "utf8");
    } catch {
      continue; // no such file - fine
    }
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || m[1] === "" || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  const port = String(process.env.PORT || "");
  if (!/^\d+$/.test(port)) return;
  const argv = process.argv;
  let seen = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--port" || argv[i] === "-p") {
      if (seen) {
        argv.splice(i, 2);
        i--;
        continue;
      }
      argv[i + 1] = port;
      seen = true;
    } else if (argv[i].startsWith("--port=")) {
      argv[i] = `--port=${port}`;
      seen = true;
    }
  }
  if (!seen) argv.push("--port", port);
}
applyDotEnvPort();

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

// --- Request/refusal trail -------------------------------------------------
// Security-relevant branches write directly into securityEvents; ordinary
// dashboard traffic goes to accessEvents. Both use the same src/ tree the guard
// loader already resolved, so the hooks registered by getGuardModule() are in
// place by the time any of this runs.
let securityRepoPromise = null;
function getSecurityRepo() {
  if (!securityRepoPromise) {
    securityRepoPromise = import(
      pathToFileURL(path.join(__dirname, "src", "lib", "db", "repos", "securityLogRepo.js")).href
    );
  }
  return securityRepoPromise;
}

let sessionModulePromise = null;
function getSessionModule() {
  if (!sessionModulePromise) {
    sessionModulePromise = import(
      pathToFileURL(path.join(__dirname, "src", "lib", "auth", "dashboardSession.js")).href
    );
  }
  return sessionModulePromise;
}

function readCookie(req, name) {
  const raw = (req.headers && req.headers.cookie) || "";
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = raw.match(new RegExp("(?:^|;\\s*)" + esc + "=([^;]*)"));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

// Paths that answer on every poll or page shell; logging them would bury the
// events that matter.
const LOG_SKIP_EXACT = new Set([
  "/api/auth/status",
  "/api/health",
  "/api/locale",
  "/api/init",
  "/api/version",
]);
const LOG_SKIP_PREFIX = ["/_next/", "/favicon", "/v1/", "/api/v1/", "/codex", "/responses"];

function shouldLogPath(pathname) {
  if (LOG_SKIP_EXACT.has(pathname)) return false;
  return !LOG_SKIP_PREFIX.some((p) => pathname === p || pathname.startsWith(p));
}

// Dedupe windows: healthy polls collapse quickly, refusals slower, so a stuck
// client retrying once a second leaves a readable trail instead of thousands of
// identical rows.
const recentLog = new Map();
function isDuplicate(key, windowMs) {
  const last = recentLog.get(key);
  const now = Date.now();
  if (last && now - last < windowMs) return true;
  recentLog.set(key, now);
  if (recentLog.size > 500) {
    for (const [k, t] of recentLog) {
      if (now - t > windowMs) recentLog.delete(k);
      if (recentLog.size <= 250) break;
    }
  }
  return false;
}

async function roleOfRequest(req) {
  const token = readCookie(req, "auth_token");
  if (!token) return "anonymous";
  try {
    const session = await (await getSessionModule()).getDashboardAuthSession(token);
    if (!session) return "anonymous";
    return session.role === "apikey" ? "apikey" : "password";
  } catch {
    return "anonymous";
  }
}

function onRequestFinished(req, res, ms) {
  try {
    const url = req.url || "/";
    const pathname = url.split("?")[0];
    if (GUARD_SKIP.test(pathname) || !shouldLogPath(pathname)) return;
    const status = res.statusCode || 0;
    const method = (req.method || "GET").toUpperCase();
    const ip =
      (req.headers && (req.headers["x-9r-real-ip"] || req.headers["x-real-ip"])) ||
      (req.socket && req.socket.remoteAddress) ||
      "";

    const guardDenial = res.__secDeny || null;
    const isDenial = guardDenial || status === 401 || status === 403;
    const key = method + " " + pathname + " " + status;
    if (isDenial) {
      if (isDuplicate("deny:" + key + ":" + ip, 60000)) return;
    } else if (status < 400 && isDuplicate("ok:" + key, 15000)) {
      return;
    }

    (async () => {
      const repo = await getSecurityRepo();
      const role = await roleOfRequest(req);
      if (isDenial) {
        await repo.recordSecurityEvent({
          type: guardDenial ? "guard_denied" : "request_denied",
          severity: "warn",
          ip,
          actor: role,
          method,
          path: pathname,
          status,
          detail:
            (guardDenial && guardDenial.detail) ||
            (status === 401 ? "Unauthorized" : "Permission refused"),
        });
      }
      await repo.recordAccessEvent({ method, path: pathname, status, ms, ip, role });
    })().catch(() => {});
  } catch {
    // Observability must never break the request it observes.
  }
}


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
        if (!m) return undefined;
        // A malformed percent-escape must not throw: see the note above. Only
        // the raw value is used to decide whether a session exists, so an
        // undecodable cookie is passed through and then rejected as invalid.
        let value = m[1];
        try {
          value = decodeURIComponent(value);
        } catch {
          value = m[1];
        }
        return { name, value };
      },
    },
  };
}

// Answer a request whose authorization could not be determined. This is a
// server-side fault, not an authentication failure, so it is a 503 and it must
// not carry a body that could be mistaken for a successful response. Static
// assets keep flowing: they are skipped before the guard runs.
function denyUnresolved(req, res) {
  const accept = String((req.headers && req.headers.accept) || "");
  const wantsHtml = accept.includes("text/html");
  if (wantsHtml && !String(req.url || "").startsWith("/api/")) {
    const body = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>503</title></head>"
      + "<body style=\"font-family:system-ui;padding:2rem\"><h1>503</h1>"
      + "<p>The dashboard authorization check could not run. Reload once the server reports ready.</p>"
      + "</body></html>";
    res.statusCode = 503;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("content-length", Buffer.byteLength(body));
    res.end(body);
  } else {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Authorization check unavailable" }));
  }
  return true;
}

// True when the guard answered the request itself (deny or redirect).
async function runAuthGuard(req, res) {
  if (GUARD_SKIP.test(req.url || "/")) return false;
  const guard = await getGuardModule();
  if (!guard) {
    if (!runAuthGuard._warned) {
      runAuthGuard._warned = true;
      console.error("[AuthGuard] guard unavailable: answering 503 instead of serving (src/ missing?)");
    }
    return denyUnresolved(req, res);
  }
  let response;
  try {
    response = await guard.proxy(toGuardRequest(req));
  } catch (error) {
    console.error("[AuthGuard] proxy threw:", error && error.message);
    return denyUnresolved(req, res);
  }
  // Remember the guard's own refusal text for the request trail: it distinguishes
  // "no session" from "key lacks the permission for this endpoint".
  if (response && response.status >= 400 && response.status < 500) {
    res.__secGuardStatus = response.status;
  }
  if (!response || response.headers.get("x-middleware-next") === "1") return false;
  res.statusCode = response.status || 500;
  response.headers.forEach((value, key) => {
    if (key === "set-cookie") res.setHeader("set-cookie", Array.isArray(value) ? value : [value]);
    else if (key !== "content-length") res.setHeader(key, value);
  });
  if (response.body) {
    const buf = Buffer.from(await new Response(response.body).arrayBuffer());
    if (res.__secGuardStatus) {
      res.__secDeny = { status: res.__secGuardStatus, detail: buf.toString("utf8").slice(0, 300) };
    }
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
        return denyUnresolved(req, res);
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
