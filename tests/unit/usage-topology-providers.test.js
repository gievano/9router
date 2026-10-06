/**
 * Provider topology visibility: only providers the owner actually uses.
 *
 * A regression here (e.g. re-adding every free noAuth provider to the
 * topology list) would make unused providers like Devin CLI render as live
 * nodes in the Usage map, reading as traffic the owner never sent.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const usageStats = readFileSync(resolve(here, "../../src/shared/components/UsageStats.js"), "utf-8");

describe("topology provider list", () => {
  it("derives noAuth free providers from lifetime recorded traffic", () => {
    expect(usageStats).toContain("period=all");
    expect(usageStats).toContain("usedProviders");
    expect(usageStats).toContain("usedProviders.has(p.id)");
  });

  it("never lists noAuth providers unconditionally", () => {
    // The old behaviour: every free noAuth provider got a node. If this
    // pattern returns, the map shows providers with zero traffic.
    expect(usageStats).not.toMatch(
      /\.filter\(\(p\) => p\.noAuth && !seen\.has\(p\.id\) && isLLMProvider\(p\.id\)\)\s*\n/,
    );
  });

  it("still includes active connections regardless of recorded traffic", () => {
    expect(usageStats).toContain("setProviders([...unique, ...noAuthProviders])");
  });
});
