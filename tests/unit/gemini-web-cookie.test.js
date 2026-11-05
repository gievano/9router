import { describe, it, expect, vi } from "vitest";
import {
  normalizeGeminiCookie,
  hasGeminiSessionRotation,
  probeGeminiWebCookie,
} from "../../open-sse/services/geminiWebCookie.js";

const PSID = "g.a000ExampleSessionValue-1234567890";
const PSIDTS = "sidts-CjIBExampleTimestampValue";

function htmlResponse({ ok = true, status = 200, html = "" } = {}) {
  return { ok, status, text: async () => html };
}

describe("normalizeGeminiCookie", () => {
  it("prefixes a bare cookie value with the cookie name", () => {
    expect(normalizeGeminiCookie(PSID)).toBe(`__Secure-1PSID=${PSID}`);
  });

  it("keeps a full cookie pair untouched", () => {
    expect(normalizeGeminiCookie(`__Secure-1PSID=${PSID}`)).toBe(`__Secure-1PSID=${PSID}`);
  });

  it("drops a Cookie: header prefix", () => {
    expect(normalizeGeminiCookie(`Cookie: __Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}`)).toBe(
      `__Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}`,
    );
  });

  it("strips the quotes a copy-paste adds around the value", () => {
    expect(normalizeGeminiCookie(`__Secure-1PSID="${PSID}"`)).toBe(`__Secure-1PSID=${PSID}`);
    expect(normalizeGeminiCookie(`"${PSID}"`)).toBe(`__Secure-1PSID=${PSID}`);
  });

  it("trims whitespace and trailing semicolons", () => {
    expect(normalizeGeminiCookie(`  __Secure-1PSID=${PSID};  `)).toBe(`__Secure-1PSID=${PSID}`);
  });

  it("reads a flat JSON export", () => {
    expect(normalizeGeminiCookie(JSON.stringify({ "__Secure-1PSID": PSID }))).toBe(
      `__Secure-1PSID=${PSID}`,
    );
  });

  it("reads the { cookies: [...] } shape browser extensions export", () => {
    const raw = JSON.stringify({
      cookies: [
        { name: "__Secure-1PSID", value: PSID },
        { name: "__Secure-1PSIDTS", value: PSIDTS },
      ],
    });
    expect(normalizeGeminiCookie(raw)).toBe(
      `__Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}`,
    );
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeGeminiCookie("")).toBe("");
    expect(normalizeGeminiCookie(null)).toBe("");
  });
});

describe("hasGeminiSessionRotation", () => {
  it("is false for a 1PSID-only cookie", () => {
    expect(hasGeminiSessionRotation(`__Secure-1PSID=${PSID}`)).toBe(false);
  });

  it("is true once the timestamp cookie is included", () => {
    expect(hasGeminiSessionRotation(`__Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}`)).toBe(true);
  });
});

describe("probeGeminiWebCookie", () => {
  it("accepts a session whose page carries the XSRF token", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse({ html: '<html data-x="SNlM0e":"abc"</html>' }));
    const result = await probeGeminiWebCookie(PSID, { fetchImpl });
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(fetchImpl.mock.calls[0][1].headers.Cookie).toBe(`__Secure-1PSID=${PSID}`);
  });

  it("warns when only 1PSID is stored, because the session cannot rotate", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse({ html: 'SNlM0e":"AIzaFakeToken"' }));
    const result = await probeGeminiWebCookie(PSID, { fetchImpl });
    expect(result.valid).toBe(true);
    expect(result.hasSessionRotation).toBe(false);
    expect(result.warning).toMatch(/1PSIDTS/);
  });

  it("rejects the logged-out shell even though it ships BardChatUi", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse({ html: "<script>BardChatUi</script>" }));
    const result = await probeGeminiWebCookie(PSID, { fetchImpl });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/signed-out shell/);
  });

  it("rejects the signed-out page", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse({ html: "<html>Sign in</html>" }));
    const result = await probeGeminiWebCookie(PSID, { fetchImpl });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/signed-out/);
  });

  it("reports a non-200 answer as an invalid cookie", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse({ ok: false, status: 403, html: "" }));
    const result = await probeGeminiWebCookie(PSID, { fetchImpl });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/403/);
  });

  it("marks a network failure as transient instead of blaming the cookie", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("getaddrinfo ENOTFOUND gemini.google.com");
    });
    const result = await probeGeminiWebCookie(PSID, { fetchImpl });
    expect(result.valid).toBe(false);
    expect(result.transient).toBe(true);
    expect(result.error).toMatch(/not rejected/);
  });

  it("rejects a cookie that carries no Google session at all", async () => {
    const fetchImpl = vi.fn(async () => htmlResponse({ html: 'SNlM0e\":\"AIzaFakeToken\"' }));
    const result = await probeGeminiWebCookie(`foo=${PSID}`, { fetchImpl });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Google session cookie/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
