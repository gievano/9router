import { describe, expect, it } from "vitest";
import { WEB_COOKIE_PROVIDERS, SLOW_FALLBACK_PROVIDERS, probeTimeoutMs, PROBE_TIMEOUT_MS, WEB_COOKIE_PROBE_TIMEOUT_MS, SLOW_FALLBACK_PROBE_TIMEOUT_MS } from "../../src/app/api/models/test/probeBudget.js";

describe("model probe budget", () => {
  it("treats web-cookie providers as empty set (all removed)", () => {
    expect(WEB_COOKIE_PROVIDERS.size).toBe(0);
  });

  it("keeps REST providers out of the slow set", () => {
    for (const provider of ["openai", "anthropic", "gemini", "opencode-zen"]) {
      expect(WEB_COOKIE_PROVIDERS.has(provider)).toBe(false);
    }
  });

  it("gives REST probes 15s", () => {
    expect(probeTimeoutMs("openai/gpt-4o")).toBe(PROBE_TIMEOUT_MS);
  });

  it("gives slow-fallback free-tier probes 120s so rotation can finish", () => {
    for (const provider of ["opencode", "opencode-go", "opencode-zen"]) {
      expect(SLOW_FALLBACK_PROVIDERS.has(provider)).toBe(true);
      expect(probeTimeoutMs(`${provider}/some-model`)).toBe(SLOW_FALLBACK_PROBE_TIMEOUT_MS);
    }
    expect(SLOW_FALLBACK_PROBE_TIMEOUT_MS).toBeGreaterThan(WEB_COOKIE_PROBE_TIMEOUT_MS);
  });

  it("resolves provider aliases before picking the budget", () => {
    // The dashboard probes alias-prefixed ids ("oc/beam-free"); an unresolved
    // alias would fall through to the 15s REST budget and abort mid-rotation.
    expect(probeTimeoutMs("oc/beam-free")).toBe(SLOW_FALLBACK_PROBE_TIMEOUT_MS);
    expect(probeTimeoutMs("ocg/some-model")).toBe(SLOW_FALLBACK_PROBE_TIMEOUT_MS);
    expect(probeTimeoutMs("openai/gpt-4o")).toBe(PROBE_TIMEOUT_MS);
  });
});
