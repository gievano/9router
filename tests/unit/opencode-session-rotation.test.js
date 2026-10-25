import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rotateOpencodeSession, stableSessionId } from "open-sse/executors/opencode.js";

// process.cwd() in a test run is tests/, so anchor on the file instead.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

describe("opencode session rotation on FreeUsageLimitError", () => {
  it("mints a fresh canonical session per rotate call", () => {
    const first = stableSessionId({});
    const second = rotateOpencodeSession({});
    expect(second).toMatch(/^ses_[0-9a-f]{12}[A-Za-z0-9]{14}$/);
    expect(second).not.toBe(first);
    // The fresh session becomes the new stable one.
    expect(stableSessionId({})).toBe(second);
  });

  it("rotates only that identity, not the others", () => {
    const credsA = { connectionId: "proxy:aaa" };
    const credsB = { connectionId: "proxy:bbb" };
    const sessionA = stableSessionId(credsA);
    const sessionB = stableSessionId(credsB);
    const rotatedA = rotateOpencodeSession(credsA);
    expect(rotatedA).not.toBe(sessionA);
    expect(stableSessionId(credsB)).toBe(sessionB);
  });

  it("the chat fallback rotates before moving to the next account", () => {
    const chat = read("src/sse/handlers/chat.js");
    expect(chat).toContain("rotateOpencodeSession");
    expect(chat).toMatch(/provider === "opencode" && result\.status === 429/);
    expect(chat).toMatch(/free\\s\*usage\\s\*limit/);
  });
});
