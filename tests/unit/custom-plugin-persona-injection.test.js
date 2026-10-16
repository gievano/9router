// A custom plugin must change the model's behaviour, not just draw a badge on
// the model row. Think Deeper and Speed Mode carry native reasoning params, but
// most OpenAI-compatible providers ignore the reasoning_* fields they do not
// implement - a plugin that only sets those fields is enabled-but-inert on
// those providers. What every model-facing plugin therefore owes the request is
// a line in the persona (the composed system prompt), injected through the same
// shared injector Ponytail, Caveman and Anti Slop use.
//
// Pins the persona half for every plugin that speaks to the model:
//   - the instruction lands when the plugin is enabled for the called model;
//   - the native param half still lands next to it;
//   - repeats do not stack a second copy;
//   - a plugin selected for some other model injects nothing;
//   - the Claude wire shape (body.system string) gets the same instruction.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(async () => ({ customPlugins: {} })),
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: mocks.getSettings,
}));

import {
  applyCustomPlugins,
  clearPluginCache,
} from "@/lib/plugins/customPluginsRuntime.js";
import { FORMATS } from "open-sse/translator/formats.js";

const MODEL = "prov/m1";

function enable(customPlugins) {
  mocks.getSettings.mockResolvedValue({ customPlugins });
  clearPluginCache();
}

function chatBody() {
  return { model: "m1", messages: [{ role: "user", content: "hi" }] };
}

function systemText(body) {
  return body.messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n");
}

beforeEach(() => {
  clearPluginCache();
  mocks.getSettings.mockReset();
  mocks.getSettings.mockResolvedValue({ customPlugins: {} });
});

describe("custom plugin → persona injection", () => {
  it("changes the composed persona when Think Deeper is enabled for the model", async () => {
    enable({ thinkDeeper: { enabled: true, models: [MODEL] } });
    const body = chatBody();

    const result = await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(result.isThinkDeeperActive).toBe(true);
    // Persona half.
    expect(systemText(body)).toContain("Think Deeper is active");
    // Native half is untouched.
    expect(body.reasoning_effort).toBe("high");
  });

  it("changes the composed persona when Speed Mode is enabled for the model", async () => {
    enable({ speedMode: { enabled: true, models: [MODEL] } });
    const body = chatBody();

    const result = await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(result.isSpeedModeActive).toBe(true);
    expect(systemText(body)).toContain("Speed Mode is active");
    expect(body.reasoning_effort).toBe("none");
  });

  it("leaves the persona alone while the plugin is disabled", async () => {
    enable({ thinkDeeper: { enabled: false, models: [MODEL] } });
    const body = chatBody();

    const result = await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(result.isThinkDeeperActive).toBe(false);
    expect(systemText(body)).toBe("");
    expect(body.messages).toHaveLength(1);
  });

  it("leaves the persona alone when the plugin is on but for another model", async () => {
    enable({ thinkDeeper: { enabled: true, models: ["prov/other"] } });
    const body = chatBody();

    await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(systemText(body)).toBe("");
  });

  it("does not stack a second copy of the instruction on a repeated run", async () => {
    enable({ thinkDeeper: { enabled: true, models: [MODEL] } });
    const body = chatBody();

    await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);
    await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    const systems = body.messages.filter((m) => m.role === "system");
    expect(systems).toHaveLength(1);
    expect(systems[0].content.match(/Think Deeper is active/g)).toHaveLength(1);
  });

  it("injects into body.system on the Claude wire shape", async () => {
    enable({ speedMode: { enabled: true, models: [MODEL] } });
    const body = { model: "m1", system: "You are terse.", messages: [] };

    await applyCustomPlugins(body, "prov", "m1", FORMATS.CLAUDE, MODEL);

    expect(body.system).toContain("Speed Mode is active");
    // The model's own persona stays in front of the plugin line.
    expect(body.system.startsWith("You are terse.")).toBe(true);
  });

  it("keeps the existing Anti Slop persona plugin injecting its rules", async () => {
    enable({ antiSlop: { enabled: true, models: [MODEL], level: "lite" } });
    const body = chatBody();

    const result = await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(result.isAntiSlopActive).toBe(true);
    expect(systemText(body)).toContain("antislop");
  });
});
