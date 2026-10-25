import { describe, it, expect } from "vitest";
import { canonicalizeUsage, extractUsage } from "../../open-sse/utils/usageTracking.js";

describe("zero-output tokens rescue and usage canonicalization", () => {
  it("folds reasoning_tokens into completion_tokens when upstream returns completion_tokens: 0", () => {
    const rawUsage = {
      prompt_tokens: 4024,
      completion_tokens: 0,
      completion_tokens_details: {
        reasoning_tokens: 2500,
      },
    };
    const extracted = extractUsage({ usage: rawUsage });
    expect(extracted.completion_tokens).toBe(2500);
    expect(extracted.reasoning_tokens).toBe(2500);

    const canonical = canonicalizeUsage(extracted);
    expect(canonical.prompt_tokens).toBe(4024);
    expect(canonical.completion_tokens).toBe(2500);
    expect(canonical.total_tokens).toBe(6524);
  });

  it("canonicalizeUsage preserves completion_tokens if already greater than reasoning_tokens", () => {
    const canonical = canonicalizeUsage({
      prompt_tokens: 100,
      completion_tokens: 300,
      reasoning_tokens: 120,
    });
    expect(canonical.completion_tokens).toBe(300);
    expect(canonical.reasoning_tokens).toBe(120);
    expect(canonical.total_tokens).toBe(400);
  });
});
