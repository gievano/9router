import { describe, expect, it } from "vitest";
import {
  composeGeminiCookie,
  mergeGeminiCookie,
  resolveGeminiCookieUpdate,
  splitGeminiCookie,
} from "@/shared/utils/geminiCookieFields";

const PSID = "g.a000DgnfB2DNshcQJfZHA3q7CpVbAnGJuCTiXWiFvO-nxkNXEeBxINxlXwKVZNUuBE7FI8PV3QACgYKASc";
const PSIDTS = "sidts-CjIB3EgAi9bYsu2p_L5YvBfY5m6Hnn2vcR2hCSAtM5-O";

describe("splitGeminiCookie", () => {
  it("treats a bare value as PSID", () => {
    expect(splitGeminiCookie(PSID)).toEqual({ psid: PSID, psidts: "", extra: "" });
  });

  it("strips quotes and a Cookie: prefix", () => {
    const parts = splitGeminiCookie(`Cookie: "__Secure-1PSID=${PSID}"`);
    expect(parts.psid).toBe(PSID);
  });

  it("splits a full session cookie into the two managed parts", () => {
    const parts = splitGeminiCookie(`__Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}`);
    expect(parts.psid).toBe(PSID);
    expect(parts.psidts).toBe(PSIDTS);
  });

  it("keeps unrelated pairs instead of dropping them", () => {
    const parts = splitGeminiCookie(`SAPISID=abc123; __Secure-1PSID=${PSID}; __Secure-3PSID=def`);
    expect(parts.extra).toBe("SAPISID=abc123; __Secure-3PSID=def");
  });

  it("keeps look-alike cookie names such as __Secure-1PSIDCC", () => {
    const parts = splitGeminiCookie(`__Secure-1PSID=${PSID}; __Secure-1PSIDCC=xyz`);
    expect(parts.psid).toBe(PSID);
    expect(parts.extra).toBe("__Secure-1PSIDCC=xyz");
  });

  it("reads a PSIDTS-only paste", () => {
    const parts = splitGeminiCookie(`__Secure-1PSIDTS=${PSIDTS}`);
    expect(parts.psid).toBe("");
    expect(parts.psidts).toBe(PSIDTS);
  });
});

describe("composeGeminiCookie", () => {
  it("omits the timestamp when it is empty", () => {
    expect(composeGeminiCookie({ psid: PSID })).toBe(`__Secure-1PSID=${PSID}`);
  });

  it("appends PSIDTS and the preserved extras", () => {
    expect(composeGeminiCookie({ psid: PSID, psidts: PSIDTS, extra: "SAPISID=abc" })).toBe(
      `__Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}; SAPISID=abc`,
    );
  });

  it("returns an empty string when nothing is filled in", () => {
    expect(composeGeminiCookie({})).toBe("");
  });
});

describe("mergeGeminiCookie", () => {
  const stored = `__Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}; SAPISID=abc`;

  it("keeps the stored PSID when only a new timestamp arrives", () => {
    const merged = mergeGeminiCookie(stored, { psidts: "new-ts" });
    expect(merged).toBe(`__Secure-1PSID=${PSID}; __Secure-1PSIDTS=new-ts; SAPISID=abc`);
  });

  it("keeps the stored timestamp when only a new PSID arrives", () => {
    const merged = mergeGeminiCookie(stored, { psid: "new-psid" });
    expect(merged).toBe(`__Secure-1PSID=new-psid; __Secure-1PSIDTS=${PSIDTS}; SAPISID=abc`);
  });

  it("adds a timestamp to a cookie that never had one", () => {
    const merged = mergeGeminiCookie(`__Secure-1PSID=${PSID}`, { psidts: "ts" });
    expect(merged).toBe(`__Secure-1PSID=${PSID}; __Secure-1PSIDTS=ts`);
  });

  it("removes the timestamp on null and ignores blank input", () => {
    expect(mergeGeminiCookie(stored, { psidts: null })).toBe(`__Secure-1PSID=${PSID}; SAPISID=abc`);
    expect(mergeGeminiCookie(stored, { psid: "", psidts: "" })).toBe(stored);
  });
});

describe("resolveGeminiCookieUpdate", () => {
  const stored = `__Secure-1PSID=${PSID}; __Secure-1PSIDTS=${PSIDTS}; SAPISID=abc`;

  it("replaces the cookie wholesale when the paste carries a PSID", () => {
    expect(resolveGeminiCookieUpdate(stored, `__Secure-1PSID=fresh; __Secure-1PSIDTS=ts2`)).toBe(
      "__Secure-1PSID=fresh; __Secure-1PSIDTS=ts2",
    );
  });

  it("only refreshes the timestamp when no PSID is supplied", () => {
    expect(resolveGeminiCookieUpdate(stored, `__Secure-1PSIDTS=ts3`)).toBe(
      `__Secure-1PSID=${PSID}; __Secure-1PSIDTS=ts3; SAPISID=abc`,
    );
  });

  it("treats a bare value as a PSID replacement, not a timestamp", () => {
    expect(resolveGeminiCookieUpdate(stored, "bare-psid")).toBe("__Secure-1PSID=bare-psid");
  });
});
