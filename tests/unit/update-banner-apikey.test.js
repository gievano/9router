import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const banner = readFileSync(
  resolve(root, "src/shared/components/UpdateBanner.js"),
  "utf8"
);

describe("update banner: hidden for API-key sessions without a flash", () => {
  it("reads the role from the shared session store, not a private fetch", () => {
    expect(banner).toMatch(
      /const sessionRole = useSessionStore\(\(state\) => state\.role\);/
    );
    // A second /api/auth/status fetch was both a duplicate request and the cause
    // of the flash: until it returned, isApiKeyUser was still false.
    expect(banner).not.toContain('fetch("/api/auth/status")');
  });

  it("derives isApiKeyUser only once the session has loaded", () => {
    expect(banner).toMatch(
      /const isApiKeyUser = sessionReady && sessionRole === "apikey";/
    );
    expect(banner).toMatch(/const sessionReady = sessionLoaded === true;/);
  });

  it("holds the version poll until the session is resolved", () => {
    const effectStart = banner.indexOf('if (!sessionReady || isApiKeyUser) return undefined;');
    expect(effectStart, "poll gate must exist").toBeGreaterThan(-1);
    // The gate sits inside the poll effect, before the poll's own fetch.
    const poll = banner.slice(effectStart, effectStart + 900);
    expect(poll.indexOf('fetch("/api/version"')).toBeGreaterThan(-1);
    expect(poll).toMatch(/\[pollMs, sessionReady, isApiKeyUser\]/);
  });

  it("still renders nothing for a key session", () => {
    expect(banner).toContain("if (isApiKeyUser) return null;");
  });
});