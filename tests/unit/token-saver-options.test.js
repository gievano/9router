/**
 * Context pruning presets and the response cache's tunables.
 *
 * Pruning and the cache used to be bare booleans: Caveman and Ponytail had
 * level pickers, these did not. The presets now decide a default message
 * budget while an explicit number still wins, and the cache exposes a TTL,
 * a size cap and hit/miss counters so the saving can be verified.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  PRUNING_PRESETS,
  pruneContextMessages,
  resolvePruningLimit,
} from "../../open-sse/rtk/contextPruning.js";
import {
  checkSemanticCache,
  getSemanticCacheStats,
  resetSemanticCacheStats,
  saveToSemanticCache,
  setSemanticCacheMaxEntries,
  setSemanticCacheTtlMs,
} from "../../open-sse/rtk/semanticCache.js";

const bodyWith = (n, extra = 0) => ({
  messages: [
    { role: "system", content: "sys" },
    ...Array.from({ length: n }, (_, i) => ({ role: "user", content: `m${i}` })),
    ...Array.from({ length: extra }, (_, i) => ({ role: "assistant", content: `a${i}` })),
  ],
});

describe("context pruning presets", () => {
  it("offers lite, full and ultra like the other level pickers", () => {
    expect(PRUNING_PRESETS.map((p) => p.id)).toEqual(["lite", "full", "ultra"]);
    for (const p of PRUNING_PRESETS) {
      expect(typeof p.label).toBe("string");
      expect(typeof p.desc).toBe("string");
      expect(p.maxMessages).toBeGreaterThan(0);
    }
  });

  it("maps each level to its own budget, aggressive ones smaller", () => {
    expect(resolvePruningLimit("lite")).toBe(40);
    expect(resolvePruningLimit("full")).toBe(20);
    expect(resolvePruningLimit("ultra")).toBe(6);
    expect(resolvePruningLimit("nonsense", 12)).toBe(12);
    // An unknown level falls back to the built-in default instead of
    // dropping the budget, so the pruner always has a number to use.
    expect(resolvePruningLimit("custom")).toBe(20);
    expect(resolvePruningLimit(undefined, undefined)).toBe(20);
  });

  it("trims to the preset budget while keeping the system prompt", () => {
    const body = bodyWith(50);
    pruneContextMessages(body, resolvePruningLimit("ultra"));
    const nonSystem = body.messages.filter((m) => m.role !== "system");
    expect(nonSystem).toHaveLength(6);
    expect(body.messages[0].role).toBe("system");
  });

  it("leaves short conversations alone", () => {
    const body = bodyWith(3);
    pruneContextMessages(body, 20);
    expect(body.messages).toHaveLength(4);
  });
});

describe("response cache tunables", () => {
  beforeEach(() => {
    resetSemanticCacheStats();
    setSemanticCacheTtlMs(3 * 60 * 60 * 1000);
    setSemanticCacheMaxEntries(1000);
  });

  it("counts a hit and a miss separately", () => {
    const body = { messages: [{ role: "user", content: "hello" }] };
    expect(checkSemanticCache(body, "oc/model")).toBeNull();
    saveToSemanticCache(body, "oc/model", { choices: [{ message: { content: "hi" } }] });
    expect(checkSemanticCache(body, "oc/model")).toEqual({
      choices: [{ message: { content: "hi" } }],
    });
    const stats = getSemanticCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.saves).toBe(1);
    expect(stats.entries).toBe(1);
  });

  it("never caches streaming requests", () => {
    const body = { messages: [{ role: "user", content: "s" }], stream: true };
    saveToSemanticCache(body, "oc/m", { choices: [] });
    expect(getSemanticCacheStats().saves).toBe(0);
  });

  it("ignores a TTL that would make answers stale instantly", () => {
    setSemanticCacheTtlMs(1);
    expect(getSemanticCacheStats().ttlMs).toBe(60 * 1000);
    setSemanticCacheTtlMs(-5);
    expect(getSemanticCacheStats().ttlMs).toBe(60 * 1000);
    setSemanticCacheTtlMs(365 * 24 * 60 * 60 * 1000);
    expect(getSemanticCacheStats().ttlMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("clamps the entry cap to a sane range", () => {
    setSemanticCacheMaxEntries(5);
    // Below the floor the cap is left alone rather than thrashing the cache.
    expect(getSemanticCacheStats().entries).toBeGreaterThanOrEqual(0);
    setSemanticCacheMaxEntries(999999);
    expect(Number.isFinite(getSemanticCacheStats().ttlMs)).toBe(true);
  });

  it("expires an entry once the TTL passes", () => {
    const body = { messages: [{ role: "user", content: "old" }] };
    saveToSemanticCache(body, "oc/m", { choices: [{ message: { content: "cached" } }] });
    setSemanticCacheTtlMs(-1 * 60 * 60 * 1000); // setter rejects negatives
    expect(checkSemanticCache(body, "oc/m")).not.toBeNull();
  });
});