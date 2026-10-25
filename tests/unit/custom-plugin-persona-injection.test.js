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
  it("changes the composed persona when Adaptive Thinking is enabled for the model", async () => {
    enable({ adaptiveThinking: { enabled: true, models: [MODEL] } });
    const body = chatBody();

    const result = await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(result.isAdaptiveThinkingActive).toBe(true);
    // Depth & Cognitive Architecture persona
    expect(systemText(body)).toContain("Cognitive Architecture: Multi-Framework Adaptive Thinking Active");
    // Native half
    expect(body.reasoning_effort).toBe("high");
  });

  it("leaves the persona alone while the plugin is disabled", async () => {
    enable({ adaptiveThinking: { enabled: false, models: [MODEL] } });
    const body = chatBody();

    const result = await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(result.isAdaptiveThinkingActive).toBe(false);
    expect(systemText(body)).toBe("");
    expect(body.messages).toHaveLength(1);
  });

  it("leaves the persona alone when the plugin is on but for another model", async () => {
    enable({ adaptiveThinking: { enabled: true, models: ["prov/other"] } });
    const body = chatBody();

    await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    expect(systemText(body)).toBe("");
  });

  it("does not stack a second copy of the instruction on a repeated run", async () => {
    enable({ adaptiveThinking: { enabled: true, models: [MODEL] } });
    const body = chatBody();

    await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);
    await applyCustomPlugins(body, "prov", "m1", FORMATS.OPENAI, MODEL);

    const systems = body.messages.filter((m) => m.role === "system");
    expect(systems).toHaveLength(1);
    expect(systems[0].content.match(/Adaptive Thinking/g)).toHaveLength(1);
  });

  it("injects into body.system on the Claude wire shape", async () => {
    enable({ adaptiveThinking: { enabled: true, models: [MODEL] } });
    const body = { model: "m1", system: "You are terse.", messages: [] };

    await applyCustomPlugins(body, "prov", "m1", FORMATS.CLAUDE, MODEL);

    expect(body.system).toContain("Cognitive Architecture: Multi-Framework Adaptive Thinking Active");
    // The model's own persona stays in front of the plugin line.
    expect(body.system.startsWith("You are terse.")).toBe(true);
  });
});
