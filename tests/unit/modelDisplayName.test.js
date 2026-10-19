import { describe, expect, it } from "vitest";
import { modelDisplayName, resolveModelDisplayName } from "../../src/shared/utils/modelDisplayName.js";

describe("modelDisplayName", () => {
  it("capitalizes brand tokens and keeps their canonical casing", () => {
    expect(modelDisplayName("claude-opus-5-5")).toBe("Claude Opus 5.5");
    expect(modelDisplayName("glm-5.3-flash")).toBe("GLM 5.3 Flash");
    expect(modelDisplayName("kimi-k2.7-code")).toBe("Kimi K2.7 Code");
    expect(modelDisplayName("deepseek-v4.1-flash")).toBe("DeepSeek V4.1 Flash");
    expect(modelDisplayName("gpt-oss-120b")).toBe("GPT OSS 120B");
  });

  it("glues a version to GPT with a dash and to everything else with a space", () => {
    expect(modelDisplayName("gpt-6.1-sol")).toBe("GPT-6.1 Sol");
    expect(modelDisplayName("gpt-5.6-luna")).toBe("GPT-5.6 Luna");
    // Only the version right behind the brand attaches: "GPT-4 Turbo", not "GPT-Turbo".
    expect(modelDisplayName("gpt-4-turbo")).toBe("GPT-4 Turbo");
    expect(modelDisplayName("claude-opus-5-5")).toBe("Claude Opus 5.5");
  });

  it("folds a version split over dash tokens back into one number", () => {
    expect(modelDisplayName("claude-fable-5-1")).toBe("Claude Fable 5.1");
    expect(modelDisplayName("claude-3-5-sonnet-20241022")).toBe("Claude 3.5 Sonnet");
  });

  it("drops release-date stamps without merging them into the version", () => {
    expect(modelDisplayName("claude-sonnet-4-20250514")).toBe("Claude Sonnet 4");
    expect(modelDisplayName("claude-opus-4-5-20251101")).toBe("Claude Opus 4.5");
  });

  it("names from the last path segment of a routed id", () => {
    expect(modelDisplayName("cmc/deepseek/deepseek-v4.1-flash")).toBe("DeepSeek V4.1 Flash");
    expect(modelDisplayName("cmc/z-ai/glm-5.3-flash")).toBe("GLM 5.3 Flash");
    expect(modelDisplayName("oc/muse-spark-1.3-contributor-free")).toBe("Muse Spark 1.3 Contributor Free");
    expect(modelDisplayName("mmf/mimo-auto")).toBe("MiMo Auto");
  });

  it("keeps a v-prefixed version marker when the brand is unknown", () => {
    expect(modelDisplayName("oc/mimo-v2.6-flash-free")).toBe("MiMo V2.6 Flash Free");
    expect(modelDisplayName("oc/jev-1.13-free")).toBe("Jev 1.13 Free");
  });

  it("splits a brand written together with its version", () => {
    expect(modelDisplayName("qwen3.8-max")).toBe("Qwen 3.8 Max");
  });

  it("round-trips a name that is already human-readable", () => {
    for (const name of [
      "Claude Opus 5.5",
      "GPT-6.1 Sol",
      "GLM 5.3 Flash",
      "MiMo V2.6 Flash Free",
      "Muse Spark 1.3 Contributor Free",
      "My Daily Driver",
    ]) {
      expect(modelDisplayName(name)).toBe(name);
    }
  });

  it("returns an empty string for a missing id so callers can fall back", () => {
    expect(modelDisplayName("")).toBe("");
    expect(modelDisplayName(undefined)).toBe("");
    expect(modelDisplayName(null)).toBe("");
  });
});

describe("resolveModelDisplayName", () => {
  it("keeps the name a registry entry, combo or custom model already published", () => {
    expect(resolveModelDisplayName("claude-sonnet-4-20250514", "Claude Sonnet 4")).toBe("Claude Sonnet 4");
    expect(resolveModelDisplayName("claude-opus-5-5", "My Daily Driver")).toBe("My Daily Driver");
  });

  it("derives a name when the published name is the raw id", () => {
    expect(resolveModelDisplayName("claude-opus-5-5", "claude-opus-5-5")).toBe("Claude Opus 5.5");
    expect(resolveModelDisplayName("oc/space-bunny-free", "")).toBe("Space Bunny Free");
  });

  it("falls back to the other argument when one side is missing", () => {
    expect(resolveModelDisplayName("", "claude-opus-5-5")).toBe("Claude Opus 5.5");
    expect(resolveModelDisplayName("claude-opus-5-5", undefined)).toBe("Claude Opus 5.5");
    expect(resolveModelDisplayName("", "")).toBe("");
  });
});
