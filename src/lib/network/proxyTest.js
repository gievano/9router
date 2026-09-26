import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

const DEFAULT_TEST_URL = "https://google.com/";
const DEFAULT_TIMEOUT_MS = 8000;

function getErrorMessage(err) {
  if (!err) return "Unknown error";
  const base = err?.message || String(err);
  const causeCode = err?.cause?.code || err?.code;
  const causeMessage = err?.cause?.message;

  if (causeMessage && causeMessage !== base) {
    return causeCode ? `${base}: ${causeMessage} (${causeCode})` : `${base}: ${causeMessage}`;
  }
  if (causeCode && !base.includes(causeCode)) {
    return `${base} (${causeCode})`;
  }
  return base;
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

/**
 * Test a proxy URL.
 *
 * Rides proxyAwareFetch instead of building an undici ProxyAgent directly:
 * ProxyAgent rejects socks4/socks5 URIs outright, so the pool's socks entries
 * could never be tested (or used). strictProxy=true guarantees a failure means
 * "this proxy is dead" — the test must never be retried on a direct connection.
 */
export async function testProxyUrl({ proxyUrl, testUrl, timeoutMs } = {}) {
  const normalizedProxyUrl = normalizeString(proxyUrl);
  if (!normalizedProxyUrl) {
    return { ok: false, status: 400, error: "proxyUrl is required" };
  }

  const normalizedTestUrl = normalizeString(testUrl) || DEFAULT_TEST_URL;
  const timeoutMsRaw = Number(timeoutMs);
  const normalizedTimeoutMs =
    Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0
      ? Math.min(timeoutMsRaw, 30000)
      : DEFAULT_TIMEOUT_MS;

  const startedAt = Date.now();
  try {
    const res = await proxyAwareFetch(
      normalizedTestUrl,
      {
        method: "HEAD",
        signal: AbortSignal.timeout(normalizedTimeoutMs),
        headers: { "User-Agent": "9Router" },
      },
      { enabled: true, url: normalizedProxyUrl, strictProxy: true }
    );
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: normalizedTestUrl,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (err) {
    const message =
      err?.name === "AbortError" || err?.name === "TimeoutError"
        ? "Proxy test timed out"
        : getErrorMessage(err);
    return {
      ok: false,
      status: /invalid proxy url/i.test(message) ? 400 : 500,
      error: message,
      elapsedMs: Date.now() - startedAt,
    };
  }
}
