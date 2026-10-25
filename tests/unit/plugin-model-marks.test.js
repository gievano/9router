import { describe, it, expect } from "vitest";
import { pluginAppliesToModel, matchesModel, modelKeys } from "@/shared/utils/pluginModelMatch";

// The request runtime and the badge both import this module, so these cases are
// the contract that keeps them agreeing about which plugin runs for which model.
const CONFIG = {
  thinkDeeper: { enabled: true, models: ["gpt-4o"] },
  imageVision: { enabled: true, models: ["claude-3-5-sonnet"] },
  jsonGuard: { enabled: false, models: ["gpt-4o"] },
  antiSlop: { enabled: true, models: [] },
};

const marksFor = (modelId) =>
  Object.entries(CONFIG)
    .filter(([, entry]) => pluginAppliesToModel(entry, modelId))
    .map(([key]) => key);

describe("TASK 9 - plugin selection rule shared by runtime and badge", () => {
  it("selects only enabled plugins whose model list matches", () => {
    expect(marksFor("openai/gpt-4o")).toEqual(["thinkDeeper"]);
    expect(marksFor("anthropic/claude-3-5-sonnet")).toEqual(["imageVision"]);
    expect(marksFor("openai/nothing-enabled")).toEqual([]);
    expect(marksFor("openai/gpt-4o-mini")).toEqual([]);
  });

  it("treats a disabled plugin as off even when the model matches", () => {
    expect(pluginAppliesToModel({ enabled: false, models: ["gpt-4o"] }, "openai/gpt-4o")).toBe(false);
  });

  it("never claims a match on malformed config", () => {
    expect(pluginAppliesToModel(null, "gpt-4o")).toBe(false);
    expect(pluginAppliesToModel(undefined, "gpt-4o")).toBe(false);
    expect(pluginAppliesToModel({ enabled: true }, "gpt-4o")).toBe(false);
    expect(pluginAppliesToModel({ enabled: true, models: "gpt-4o" }, "gpt-4o")).toBe(false);
    expect(pluginAppliesToModel({ enabled: true, models: ["gpt-4o"] }, "")).toBe(false);
    expect(pluginAppliesToModel({ enabled: true, models: [null, 42] }, "gpt-4o")).toBe(false);
  });

  it("matches across a namespace boundary, and its key set is sane", () => {
    expect(matchesModel(["gpt-4o"], "openai/gpt-4o")).toBe(true);
    expect(matchesModel(["openai/gpt-4o"], "gpt-4o")).toBe(true);
    expect(matchesModel(["gpt-4o"], "gpt-4o-mini")).toBe(false);
    expect(matchesModel(null, "gpt-4o")).toBe(false);
    expect(modelKeys("openai/gpt-4o")).toEqual(["openai/gpt-4o", "gpt-4o"]);
    expect(modelKeys("gpt-4o")).toEqual(["gpt-4o"]);
    expect(modelKeys("")).toEqual([]);
  });
});