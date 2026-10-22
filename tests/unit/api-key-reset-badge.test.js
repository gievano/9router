import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const page = readFileSync(
  resolve(root, "src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js"),
  "utf8"
);

describe("key card: one reset badge, the one that counts down", () => {
  it("no longer prints the static interval", () => {
    expect(page).not.toMatch(/Reset: every/);
  });

  it("still renders the live countdown for a capped key on a reset window", () => {
    expect(page).toMatch(
      /limitCapOf\(key\) > 0 && key\.resetInterval && key\.resetInterval !== "never" && \(\s*<ResetCountdown resetInterval=\{key\.resetInterval\} lastResetAt=\{key\.lastResetAt\} \/>/
    );
  });

  it("labels the countdown as the next reset", () => {
    const countdown = page.slice(page.indexOf("function ResetCountdown"), page.indexOf("ResetCountdown.propTypes"));
    expect(countdown).toMatch(/Next reset: \$\{formatDuration\(remaining\)\}/);
    expect(countdown).toMatch(/Resetting\.\.\./);
  });

  it("ticks, so the number moves without a reload", () => {
    const countdown = page.slice(page.indexOf("function ResetCountdown"), page.indexOf("ResetCountdown.propTypes"));
    expect(countdown).toMatch(/useNow\(true\)/);
  });

  it("hides itself for a key with no reset window", () => {
    const countdown = page.slice(page.indexOf("function ResetCountdown"), page.indexOf("ResetCountdown.propTypes"));
    expect(countdown).toMatch(/if \(!resetInterval \|\| resetInterval === "never"\) return null;/);
  });
});
