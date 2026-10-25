import { describe, expect, it } from "vitest";
import { isOpencodeFreeModel, resolveModelTier } from "../../src/shared/utils/modelTier.js";
import { applyUsageMultipliers } from "../../open-sse/utils/usageTracking.js";

describe("Model Tier Resolution", () => {
  it("resolves free models correctly with FREE tag", () => {
    expect(isOpencodeFreeModel("oc1/beam-free")).toBe(true);
    expect(isOpencodeFreeModel("oc2/deepseek-v4.1-flash-free")).toBe(true);
    expect(isOpencodeFreeModel("big-pickle")).toBe(true);
    expect(isOpencodeFreeModel("union-alpha")).toBe(true);
    expect(isOpencodeFreeModel("flint-40b-free")).toBe(true);
    expect(isOpencodeFreeModel({ id: "custom-free", isFree: true })).toBe(true);
    expect(resolveModelTier("oc1/beam-free")).toBe("free");
  });

  it("does not tag non-free models (no PAID, no UNKNOWN)", () => {
    expect(isOpencodeFreeModel("claude-opus-5-5", "anthropic")).toBe(false);
    expect(isOpencodeFreeModel("claude-fable-5-1", "oc2")).toBe(false);
    expect(isOpencodeFreeModel("gpt-4o", "openai")).toBe(false);
    expect(isOpencodeFreeModel("custom-random-slug-99", "custom-node")).toBe(false);
    expect(resolveModelTier("claude-opus-5-5")).toBe("");
  });
});

describe("Usage Multipliers", () => {
  it("multiplies input and output tokens accurately", () => {
    const rawUsage = {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
    };

    const multiplied = applyUsageMultipliers(rawUsage, {
      inputMultiplier: 2,
      outputMultiplier: 5,
    });

    expect(multiplied.prompt_tokens).toBe(200);
    expect(multiplied.completion_tokens).toBe(1000);
    expect(multiplied.total_tokens).toBe(1200);
  });

  it("handles empty or default multipliers cleanly", () => {
    const rawUsage = {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
    };

    const unchanged = applyUsageMultipliers(rawUsage, {});
    expect(unchanged.prompt_tokens).toBe(100);
    expect(unchanged.completion_tokens).toBe(200);
  });
});
