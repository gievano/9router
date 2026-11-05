const GEMINI_WEB_APP_URL = "https://gemini.google.com/app";
const GEMINI_XSRF_PATTERN = /SNlM0e"\s*:\s*"[^"]+"/;
const GEMINI_WEB_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

function stripQuotes(value) {
  return value.replace(/^["']+/, "").replace(/["']+$/, "").trim();
}

function pairsFromObject(cookies) {
  return Object.entries(cookies)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([k, v]) => `${String(k).trim()}=${stripQuotes(String(v))}`);
}

// Accepts every shape a browser export can produce: a bare `__Secure-1PSID`
// value, a `name=value; name=value` header, a `Cookie:` header prefix, a
// { name: value } JSON object, or a { cookies: [...] } JSON export. Without
// this the plain value only worked when it happened to be copied raw, and a
// quoted or prefixed paste was reported as an invalid session.
export function normalizeGeminiCookie(raw) {
  let cookie = String(raw ?? "").trim();
  if (!cookie) return "";

  if (/^cookie\s*:/i.test(cookie)) cookie = cookie.replace(/^cookie\s*:/i, "").trim();

  if (cookie.startsWith("{")) {
    try {
      const parsed = JSON.parse(cookie);
      const source = Array.isArray(parsed?.cookies)
        ? Object.fromEntries(
            parsed.cookies
              .filter((c) => c && typeof c.name === "string" && typeof c.value === "string")
              .map((c) => [c.name, c.value]),
          )
        : parsed?.cookies && typeof parsed.cookies === "object"
          ? parsed.cookies
          : parsed;
      const pairs = pairsFromObject(source && typeof source === "object" ? source : {});
      if (pairs.length > 0) return pairs.join("; ");
    } catch {}
  }

  if ((cookie.startsWith('"') && cookie.endsWith('"')) || (cookie.startsWith("'") && cookie.endsWith("'"))) {
    cookie = cookie.slice(1, -1).trim();
  }

  const parts = cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return part;
      return `${part.slice(0, eq).trim()}=${stripQuotes(part.slice(eq + 1))}`;
    })
    .filter((part) => part.length > 0);

  if (parts.length === 0) return "";
  if (parts.length === 1 && !parts[0].includes("=")) return `__Secure-1PSID=${parts[0]}`;
  return parts.join("; ");
}

// __Secure-1PSID alone authenticates the HTML shell, but 1PSIDTS is what the
// session rotates on. A cookie without it works until Google re-issues the
// timestamp, which is why "it worked yesterday" cookies go dead.
export function hasGeminiSessionRotation(cookie) {
  const lower = String(cookie || "").toLowerCase();
  return lower.includes("__secure-1psidts") || lower.includes("__secure-3psidts");
}

export function describeGeminiCookieIssue(cookie) {
  const lower = String(cookie || "").toLowerCase();
  if (!lower.includes("__secure-1psid") && !lower.includes("sapisid") && !lower.includes("__secure-3psid")) {
    return "Cookie does not contain a Google session cookie - copy __Secure-1PSID from gemini.google.com";
  }
  return null;
}

// A live browser session is the one whose /app HTML still carries the
// BardChatUi bootstrap and the SNlM0e XSRF token. Fetching that page is the
// only probe that does not depend on the slow (and rate-limited) chat queue,
// so it is what both the Check button and the connection Test use.
export async function probeGeminiWebCookie(raw, { timeoutMs = 10000, fetchImpl = fetch } = {}) {
  const cookie = normalizeGeminiCookie(raw);
  if (!cookie) return { valid: false, error: "Invalid cookie format - paste the __Secure-1PSID value", cookie };

  const shapeIssue = describeGeminiCookieIssue(cookie);
  if (shapeIssue) return { valid: false, error: shapeIssue, cookie };

  let res;
  try {
    res = await fetchImpl(GEMINI_WEB_APP_URL, {
      method: "GET",
      headers: {
        Cookie: cookie,
        "User-Agent": GEMINI_WEB_USER_AGENT,
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err?.name === "TimeoutError" ? "timed out" : err?.message || "network error";
    return {
      valid: false,
      error: `Could not reach gemini.google.com (${reason}) - the cookie itself was not rejected`,
      cookie,
      transient: true,
    };
  }

  if (!res.ok) {
    return {
      valid: false,
      error: `Invalid cookie - gemini.google.com answered ${res.status}; re-copy __Secure-1PSID from DevTools -> Application -> Cookies`,
      cookie,
    };
  }

  const html = await res.text().catch(() => "");
  // The logged-out shell ships the same BardChatUi bundle, so its presence proves
  // nothing - a made-up cookie passed that check. The SNlM0e XSRF token is only
  // rendered for a real session, which makes it the marker to require.
  if (!GEMINI_XSRF_PATTERN.test(html)) {
    return {
      valid: false,
      error: html.includes("BardChatUi")
        ? "Invalid cookie - Gemini served the signed-out shell (no SNlM0e session token); re-copy __Secure-1PSID for the signed-in account"
        : "Invalid cookie - gemini.google.com served the signed-out page; re-copy __Secure-1PSID (and __Secure-1PSIDTS) for the account",
      cookie,
    };
  }

  const rotates = hasGeminiSessionRotation(cookie);
  return {
    valid: true,
    error: null,
    warning: rotates
      ? null
      : "Only __Secure-1PSID is stored - add __Secure-1PSIDTS so the session survives Google's rotation",
    hasSessionRotation: rotates,
    cookie,
  };
}
