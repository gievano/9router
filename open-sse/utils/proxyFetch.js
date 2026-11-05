import { Readable } from "stream";
import { MEMORY_CONFIG } from "../config/runtimeConfig.js";
import { dbg } from "./debugLog.js";
import { normalizeString, normalizeProxyUrl, resolveEffectiveProxyUrl } from "./proxyResolution.js";
import { isSocksProxyUrl, socksFetch } from "./socksTunnel.js";

const originalFetch = globalThis.fetch;
const proxyDispatchers = new Map();

// DNS cache — use Map to avoid prototype pollution via malformed hostnames
const DNS_CACHE = new Map();
const TLS_CERT_ERRORS = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function isTlsCertError(err) {
  const code = err?.cause?.code || err?.code;
  return TLS_CERT_ERRORS.has(code);
}

function socksOptions(init, insecure) {
  return {
    servername: init?.servername,
    rejectUnauthorized: !insecure,
  };
}

const MITM_BYPASS_HOSTS = [
  "cloudcode-pa.googleapis.com",
  "daily-cloudcode-pa.googleapis.com",
  "api.individual.githubcopilot.com",
  "q.us-east-1.amazonaws.com",
  "codewhisperer.us-east-1.amazonaws.com",
  "api2.cursor.sh",
];
const GOOGLE_DNS_SERVERS = ["8.8.8.8", "8.8.4.4"];
const HTTPS_PORT = 443;
const HTTP_SUCCESS_MIN = 200;
const HTTP_SUCCESS_MAX = 300;

/**
 * Resolve real IP using Google DNS (bypass system DNS)
 */
async function resolveRealIP(hostname) {
  const cached = DNS_CACHE.get(hostname);
  if (cached && Date.now() < cached.expiry) return cached.ip;

  try {
    const dns = await import("dns");
    const { promisify } = await import("util");
    const resolver = new dns.Resolver();
    resolver.setServers(GOOGLE_DNS_SERVERS);
    const resolve4 = promisify(resolver.resolve4.bind(resolver));
    const addresses = await resolve4(hostname);
    DNS_CACHE.set(hostname, { ip: addresses[0], expiry: Date.now() + MEMORY_CONFIG.dnsCacheTtlMs });
    return addresses[0];
  } catch (error) {
    console.warn(`[ProxyFetch] DNS resolve failed for ${hostname}:`, error.message);
    return null;
  }
}

/**
 * Check if request should bypass MITM DNS redirect
 */
function shouldBypassMitmDns(url) {
  try {
    const hostname = new URL(url).hostname;
    return MITM_BYPASS_HOSTS.some(host => hostname.includes(host));
  } catch { return false; }
}

/**
 * Create proxy dispatcher lazily (undici-compatible)
 */
async function getDispatcher(proxyUrl, insecure = false) {
  const normalized = normalizeProxyUrl(proxyUrl);
  if (!normalized && !insecure) return null;

  const key = `${normalized || "direct"}::${insecure ? "insecure" : "secure"}`;
  if (!proxyDispatchers.has(key)) {
    // Evict oldest entry if max size reached
    if (proxyDispatchers.size >= MEMORY_CONFIG.proxyDispatchersMaxSize) {
      proxyDispatchers.delete(proxyDispatchers.keys().next().value);
    }
    const { Agent, ProxyAgent } = await import("undici");
    const connect = insecure ? { rejectUnauthorized: false } : undefined;
    const dispatcher = normalized
      ? new ProxyAgent({ uri: normalized, ...(insecure ? { requestTls: connect } : {}) })
      : new Agent({ connect });
    proxyDispatchers.set(key, dispatcher);
  }

  return proxyDispatchers.get(key);
}

const FREE_TIER_ERROR_MARKER = "FreeTierError";

function bufferedResponse(text, original) {
  const headers = new Headers(original.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(text, { status: original.status, statusText: original.statusText, headers });
}

function targetHost(url) {
  try {
    return new URL(typeof url === "string" ? url : url.toString()).host;
  } catch {
    return String(url);
  }
}

async function replayFreeTierRejectionDirect(url, options, proxied, proxyUrl) {
  if (proxied.status !== 403) return proxied;
  let text;
  try {
    text = await proxied.text();
  } catch {
    return proxied;
  }
  if (!text.includes(FREE_TIER_ERROR_MARKER)) return bufferedResponse(text, proxied);
  if (options?.body && typeof options.body.getReader === "function" && options.body.locked) {
    return bufferedResponse(text, proxied);
  }
  console.warn(`[ProxyFetch] Proxy egress rejected by the OpenCode free-tier gate (403 FreeTierError); replaying direct: ${targetHost(url)}`);
  try {
    return await originalFetch(url, options);
  } catch (directError) {
    console.warn(`[ProxyFetch] Direct replay failed: ${directError.message}`);
    return bufferedResponse(text, proxied);
  }
}

async function fetchWithTlsFallback(url, options, proxyUrl) {
  try {
    // Protocol adapters may need Node's HTTP/1 transport on the direct path.
    // Keep proxy/no-proxy resolution and strict-proxy enforcement here.
    if (!proxyUrl && options.directFetch) return await options.directFetch(url, options);
    if (proxyUrl && isSocksProxyUrl(proxyUrl)) {
      return await socksFetch(url, options, proxyUrl, socksOptions(options, false));
    }
    const dispatcher = proxyUrl ? await getDispatcher(proxyUrl) : undefined;
    return await originalFetch(url, dispatcher ? { ...options, dispatcher } : options);
  } catch (err) {
    const isStrictSsl = options.strictTls === true || process.env.STRICT_SSL === "true" || process.env.STRICT_SSL === "1";
    if (!isStrictSsl && isTlsCertError(err)) {
      if (options.body && typeof options.body.getReader === "function" && options.body.locked) {
        throw err;
      }
      console.warn(`[ProxyFetch] TLS cert verification failed (${err.cause?.code || err.code}), retrying with insecure TLS: ${url}`);
      if (proxyUrl && isSocksProxyUrl(proxyUrl)) {
        return await socksFetch(url, options, proxyUrl, socksOptions(options, true));
      }
      const insecureDispatcher = await getDispatcher(proxyUrl, true);
      return await originalFetch(url, { ...options, dispatcher: insecureDispatcher });
    }
    throw err;
  }
}

// ─── socks proxies ────────────────────────────────────────────────────
// undici's ProxyAgent only speaks http/https ("URL must start with http: or
// https:"), so socks4/socks5 have to ride node:http/https with an agent from
// socks-proxy-agent — same approach as mimoLoginSession's socksFetch.
const SOCKS_URL_RE = /^socks[45]h?:/i;
function isSocksUrl(url) {
  return SOCKS_URL_RE.test(normalizeString(url));
}

let _SocksAgentClass; // undefined = not tried yet, null = unavailable
async function getSocksAgentClass() {
  if (_SocksAgentClass === undefined) {
    const m = await import("socks-proxy-agent").catch(() => null);
    _SocksAgentClass = (m && (m.SocksProxyAgent || m.default)) || null;
  }
  return _SocksAgentClass;
}

// Body -> Buffer, accepting every fetch BodyInit plus node streams.
async function toPayload(body) {
  if (body == null) return null;
  if (typeof body === "string") return Buffer.from(body);
  if (Buffer.isBuffer(body)) return body;
  if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer) return Buffer.from(body);
  try {
    return Buffer.from(await new Response(body).arrayBuffer());
  } catch {
    const { buffer } = await import("node:stream/consumers");
    return await buffer(body);
  }
}

async function socksFetchViaAgent(targetUrl, options, proxyUrl) {
  const SocksAgent = await getSocksAgentClass();
  if (!SocksAgent) throw new Error("socks-proxy-agent unavailable");

  const parsed = new URL(targetUrl);
  // Literal specifiers on both branches — webpack forbids fully dynamic import().
  const mod = parsed.protocol === "http:" ? await import("node:http") : await import("node:https");
  const lib = mod.default ?? mod;
  // NOTE: use the top-level `Readable` (imported from "stream" at module scope).
  // A local `await import("node:stream")` here does not resolve correctly in the
  // webpack server bundle and shadows it with undefined → TypeError on .toWeb().

  const headers = {};
  const raw = options.headers;
  if (raw instanceof Headers) { for (const [k, v] of raw) headers[k] = v; }
  else if (raw) Object.assign(headers, raw);

  const payload = await toPayload(options.body);
  if (payload && headers["content-length"] == null && headers["Content-Length"] == null) {
    headers["content-length"] = String(payload.byteLength);
  }

  return new Promise((resolve, reject) => {
    const req = lib.request(
      parsed,
      { method: options.method || "GET", headers, agent: new SocksAgent(proxyUrl) },
      (res) => {
        const out = new Headers();
        for (const [k, v] of Object.entries(res.headers || {})) {
          if (Array.isArray(v)) v.forEach(x => out.append(k, String(x)));
          else if (v != null) out.append(k, String(v));
        }
        resolve(new Response(Readable.toWeb(res), {
          status: res.statusCode || 502,
          statusText: res.statusMessage,
          headers: out,
        }));
      }
    );
    const signal = options.signal;
    if (signal) {
      if (signal.aborted) req.destroy(new Error("aborted"));
      else signal.addEventListener("abort", () => req.destroy(new Error("aborted")), { once: true });
    }
    req.setTimeout(30000, () => req.destroy(new Error("socks proxy timeout")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Create HTTPS request with manual socket connection (bypass DNS)
 */
async function createBypassRequest(parsedUrl, realIP, options) {
  const httpsModule = await import("https");
  const netModule = await import("net");
  // CJS modules expose exports via .default in ESM dynamic import context
  const https = httpsModule.default ?? httpsModule;
  const net = netModule.default ?? netModule;

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

    socket.connect(HTTPS_PORT, realIP, () => {
      const reqOptions = {
        socket,
        // SNI + cert hostname are validated against the hostname the caller
        // asked for, not the IP we connected to. This keeps the DNS-bypass
        // (avoiding /etc/hosts MITM) while still rejecting on-path attackers
        // that present a different cert. The MITM_BYPASS_HOSTS targets are
        // all public-CA-issued (Google / GitHub / AWS / Cursor) so default
        // verification works without any extra trust store.
        servername: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || "POST",
        headers: {
          ...options.headers,
          Host: parsedUrl.hostname,
        },
      };

      const req = https.request(reqOptions, (res) => {
        const response = {
          ok: res.statusCode >= HTTP_SUCCESS_MIN && res.statusCode < HTTP_SUCCESS_MAX,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: new Map(Object.entries(res.headers)),
          body: Readable.toWeb(res),
          text: async () => {
            const chunks = [];
            for await (const chunk of res) chunks.push(chunk);
            return Buffer.concat(chunks).toString();
          },
          json: async () => JSON.parse(await response.text()),
        };
        resolve(response);
      });

      req.on("error", reject);
      if (options.body) {
        req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });

    socket.on("error", reject);
  });
}

export async function proxyAwareFetch(url, options = {}, proxyOptions = null) {
  const targetUrl = typeof url === "string" ? url : url.toString();

  // Vercel relay: forward request via relay headers
  const vercelRelayUrl = normalizeString(proxyOptions?.vercelRelayUrl);
  if (vercelRelayUrl) {
    const parsed = new URL(targetUrl);
    const baseHeaders = options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : { ...(options.headers || {}) };
    const relayHeaders = {
      ...baseHeaders,
      "x-relay-target": `${parsed.protocol}//${parsed.host}`,
      "x-relay-path": `${parsed.pathname}${parsed.search}`,
    };
    return originalFetch(vercelRelayUrl, { ...options, headers: relayHeaders });
  }

  const { url: proxyUrl } = resolveEffectiveProxyUrl(targetUrl, proxyOptions);

  // socks: undici has no socks dispatcher, so it never reaches getDispatcher().
  if (proxyUrl && isSocksUrl(proxyUrl)) {
    try {
      return await socksFetchViaAgent(targetUrl, options, proxyUrl);
    } catch (proxyError) {
      if (proxyOptions?.strictProxy === true) {
        throw new Error(`[ProxyFetch] Proxy required but failed (strictProxy=true): ${proxyError.message}`);
      }
      console.warn(`[ProxyFetch] Socks proxy failed, falling back to direct: ${proxyError.message}`);
      return originalFetch(url, options);
    }
  }

  // MITM DNS bypass: for known MITM-intercepted hosts, resolve real IP to avoid DNS spoof
  if (shouldBypassMitmDns(targetUrl)) {
    if (proxyUrl) {
      // Proxy resolves DNS externally (not affected by /etc/hosts) — use proxy directly
      try {
        return await fetchWithTlsFallback(url, options, proxyUrl);
      } catch (proxyError) {
        if (proxyOptions?.strictProxy === true) {
          throw new Error(`[ProxyFetch] Proxy required but failed (strictProxy=true): ${proxyError.message}`);
        }
        console.warn(`[ProxyFetch] Proxy failed, falling back to direct bypass: ${proxyError.message}`);
      }
    }
    // No proxy — manually resolve real IP to bypass DNS spoof
    try {
      const parsedUrl = new URL(targetUrl);
      const realIP = await resolveRealIP(parsedUrl.hostname);
      if (realIP) return await createBypassRequest(parsedUrl, realIP, options);
    } catch (error) {
      console.warn(`[ProxyFetch] MITM bypass failed: ${error.message}`);
    }
  }

  if (proxyUrl) {
    try {
      const res = await fetchWithTlsFallback(url, options, proxyUrl);
      if (res.status === 407) {
        throw new Error("HTTP 407 Proxy Authentication Required (credentials invalid or plan expired)");
      }
      if (proxyOptions?.strictProxy === true) return res;
      return await replayFreeTierRejectionDirect(url, options, res, proxyUrl);
    } catch (proxyError) {
      // If strictProxy is enabled, fail hard instead of falling back to direct
      if (proxyOptions?.strictProxy === true) {
        throw new Error(`[ProxyFetch] Proxy required but failed (strictProxy=true): ${proxyError.message}`);
      }
      console.warn(`[ProxyFetch] Proxy failed, falling back to direct: ${proxyError.message}`);
      return fetchWithTlsFallback(url, options, null);
    }
  }

  // Strict mode means "never leave over the direct IP". Reaching here with a
  // proxy configured but unresolved is exactly that case — an inactive or
  // empty pool, or every proxy removed — so refuse instead of silently
  // exposing the real address (#4333). The catch blocks above only cover a
  // proxy that was actually tried.
  const proxyIntended = proxyOptions?.proxyPoolId
    || proxyOptions?.enabled === true
    || proxyOptions?.connectionProxyEnabled === true
    || !!normalizeString(proxyOptions?.url ?? proxyOptions?.connectionProxyUrl);
  if (proxyOptions?.strictProxy === true && proxyIntended) {
    throw new Error("[ProxyFetch] Proxy required but none resolved (strictProxy=true)");
  }

  return fetchWithTlsFallback(url, options, null);
}

/**
 * Patched global fetch with env-proxy support and MITM DNS bypass
 */
async function patchedFetch(url, options = {}) {
  return proxyAwareFetch(url, options, null);
}

// Idempotency guard — only patch once to avoid wrapping multiple times
if (globalThis.fetch !== patchedFetch) {
  globalThis.fetch = patchedFetch;
}

export default patchedFetch;
