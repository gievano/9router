import { describe, expect, it } from "vitest";
import { WEB_COOKIE_PROVIDERS, probeTimeoutMs, PROBE_TIMEOUT_MS, WEB_COOKIE_PROBE_TIMEOUT_MS } from "../../src/app/api/models/test/probeBudget.js";

describe("model probe budget", () => {
  it("treats every web-cookie provider as slow-probing", () => {
    for (const provider of ["gemini-web", "kimi-web", "deepseek-web", "xiaomi-mimo"]) {
      expect(WEB_COOKIE_PROVIDERS.has(provider)).toBe(true);
    }
  });

  it("keeps REST providers out of the slow set", () => {
    for (const provider of ["openai", "anthropic", "gemini", "opencode-zen"]) {
      expect(WEB_COOKIE_PROVIDERS.has(provider)).toBe(false);
    }
  });

  it("gives web-cookie probes 90s and REST probes 15s", () => {
    expect(probeTimeoutMs("gemini-web/gemini-3.6-flash")).toBe(WEB_COOKIE_PROBE_TIMEOUT_MS);
    expect(probeTimeoutMs("kimi-web/kimi-k2")).toBe(WEB_COOKIE_PROBE_TIMEOUT_MS);
    expect(probeTimeoutMs("openai/gpt-4o")).toBe(PROBE_TIMEOUT_MS);
    expect(WEB_COOKIE_PROBE_TIMEOUT_MS).toBeGreaterThan(PROBE_TIMEOUT_MS);
  });
});
