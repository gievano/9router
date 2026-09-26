// Conol credential resolution — conol.ai browser-session auth.
// Ported from OmniRoute open-sse/services/conolAuth.ts.
//
// Conol authenticates with the `__Secure-better-auth.session_token` cookie from
// the browser session. Users paste either the raw token, the full Cookie
// header, a JSON blob ({ cookie / session_token / <cookie-name> }), or the
// stored value in providerSpecificData. Everything normalizes to a Cookie
// header value that the executor sends verbatim.

export const CONOL_SESSION_COOKIE_NAME = "__Secure-better-auth.session_token";

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readStoredValue(value) {
  const raw = readString(value);
  if (!raw || !raw.startsWith("{")) return raw;
  try {
    const parsed = JSON.parse(raw);
    return (
      readString(parsed.cookie) ||
      readString(parsed[CONOL_SESSION_COOKIE_NAME]) ||
      readString(parsed.sessionToken)
    );
  } catch {
    return raw;
  }
}

export function normalizeConolCookie(rawValue) {
  const raw = readStoredValue(rawValue).replace(/^Cookie:\s*/i, "").trim();
  if (!raw) return "";
  if (raw.includes("=")) return raw;
  return `${CONOL_SESSION_COOKIE_NAME}=${raw}`;
}

export function resolveConolCredentials(credentials) {
  const providerData =
    credentials?.providerSpecificData &&
    typeof credentials.providerSpecificData === "object" &&
    !Array.isArray(credentials.providerSpecificData)
      ? credentials.providerSpecificData
      : {};

  const raw =
    readStoredValue(providerData.cookie) ||
    readStoredValue(providerData[CONOL_SESSION_COOKIE_NAME]) ||
    readStoredValue(providerData.sessionToken) ||
    readStoredValue(credentials?.cookie) ||
    readStoredValue(credentials?.apiKey) ||
    readStoredValue(credentials?.accessToken);

  return { cookie: normalizeConolCookie(raw) };
}
