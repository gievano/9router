import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(async () => ({ customPlugins: {} })),
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: mocks.getSettings,
}));

import {
  applyCustomPlugins,
  applyToolCallingBridge,
  isWebSessionProvider,
  clearPluginCache,
} from "@/lib/plugins/customPluginsRuntime.js";
import { bridgeOpenAIChatResponse } from "open-sse/handlers/chatCore/nonStreamingHandler.js";
import { FORMATS } from "open-sse/translator/formats.js";

const WEB_MODEL = "gemini-web/gemini-3.8-flash";
const NATIVE_MODEL = "openai/gpt-4o";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
];

function enable(customPlugins) {
  mocks.getSettings.mockResolvedValue({ customPlugins });
  clearPluginCache();
}

function chatBody(extra = {}) {
  return {
    model: "gemini-3.8-flash",
    messages: [{ role: "user", content: "list the files" }],
    ...extra,
  };
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

describe("tool calling bridge — request side", () => {
  it("folds the catalogue into the prompt and drops the tools array", () => {
    const body = chatBody({ tools: TOOLS });

    const applied = applyToolCallingBridge(body, FORMATS.OPENAI);

    expect(applied).toBe(true);
    expect(body.tools).toBeUndefined();
    expect(systemText(body)).toContain("You have access to tools");
    expect(systemText(body)).toContain("read_file");
    // The reminder must land last, so it rides on the final user turn.
    const last = body.messages[body.messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toContain("highest priority");
    // The response side reads the catalogue from here because tools is gone.
    expect(body._openaiToolBridge.tools).toHaveLength(1);
    expect(body._openaiToolBridge.bridged).toBe(true);
  });

  it("leaves a request with no tools untouched", () => {
    const body = chatBody();

    expect(applyToolCallingBridge(body, FORMATS.OPENAI)).toBe(false);
    expect(body.tools).toBeUndefined();
    expect(body._openaiToolBridge).toBeUndefined();
  });

  it("flattens assistant tool_calls and tool results into readable turns", () => {
    const body = chatBody({
      tools: TOOLS,
      messages: [
        { role: "user", content: "read a.js" },
        {
          role: "assistant",
          content: "on it",
          tool_calls: [
            { id: "call_1", type: "function", function: { name: "read_file", arguments: '{"path":"a.js"}' } },
          ],
        },
        { role: "tool", tool_call_id: "call_1", name: "read_file", content: "file body" },
      ],
    });

    applyToolCallingBridge(body, FORMATS.OPENAI);

    const roles = body.messages.map((m) => m.role);
    expect(roles).not.toContain("tool");
    const assistant = body.messages.find((m) => m.role === "assistant");
    expect(assistant.tool_calls).toBeUndefined();
    expect(assistant.content).toContain("```tool_call");
    expect(assistant.content).toContain("read_file");
    const resultTurn = body.messages.find((m) => m.content.includes("<<TOOL_RESULT>>"));
    expect(resultTurn).toBeTruthy();
    expect(resultTurn.content).toContain("file body");
  });
});

describe("tool calling bridge — dispatch", () => {
  it("rewrites a browser-session model, which has no tools lane at all", async () => {
    enable({ openaiToolBridge: { enabled: true, models: [WEB_MODEL] } });
    const body = chatBody({ tools: TOOLS });

    const result = await applyCustomPlugins(body, "gemini-web", "gemini-3.8-flash", FORMATS.OPENAI, WEB_MODEL);

    expect(result.isToolBridgeActive).toBe(true);
    expect(result.isToolBridgeRewritten).toBe(true);
    expect(body.tools).toBeUndefined();
  });

  it("keeps a native tool lane intact", async () => {
    enable({ openaiToolBridge: { enabled: true, models: [NATIVE_MODEL] } });
    const body = chatBody({ tools: TOOLS });

    const result = await applyCustomPlugins(body, "openai", "gpt-4o", FORMATS.OPENAI, NATIVE_MODEL);

    expect(result.isToolBridgeActive).toBe(true);
    expect(result.isToolBridgeRewritten).toBe(false);
    expect(body.tools).toHaveLength(1);
  });

  it("does nothing while the plugin is off or aimed at another model", async () => {
    enable({ openaiToolBridge: { enabled: false, models: [WEB_MODEL] } });
    const off = chatBody({ tools: TOOLS });
    const offResult = await applyCustomPlugins(off, "gemini-web", "gemini-3.8-flash", FORMATS.OPENAI, WEB_MODEL);
    expect(offResult.isToolBridgeActive).toBe(false);
    expect(off.tools).toHaveLength(1);

    enable({ openaiToolBridge: { enabled: true, models: ["openai/gpt-4o"] } });
    const other = chatBody({ tools: TOOLS });
    const otherResult = await applyCustomPlugins(other, "gemini-web", "gemini-3.8-flash", FORMATS.OPENAI, WEB_MODEL);
    expect(otherResult.isToolBridgeActive).toBe(false);
    expect(other.tools).toHaveLength(1);
  });

  it("knows which providers are browser sessions", async () => {
    expect(await isWebSessionProvider("gemini-web")).toBe(true);
    expect(await isWebSessionProvider("gweb")).toBe(true);
    expect(await isWebSessionProvider("openai")).toBe(false);
  });
  it("tells the model when the client forces one tool", () => {
    const body = chatBody({ tools: TOOLS, tool_choice: { type: "function", function: { name: "read_file" } } });

    applyToolCallingBridge(body, FORMATS.OPENAI);

    const last = body.messages[body.messages.length - 1];
    expect(last.content).toContain("FORCED");
    expect(last.content).toContain('"read_file"');
  });

  it("recovers several calls emitted in one reply", () => {
    const body = { _openaiToolBridge: { tools: TOOLS } };
    const response = {
      choices: [
        {
          message: {
            role: "assistant",
            content:
              '```tool_call\n{"name": "read_file", "arguments": {"path": "a.js"}}\n```\n```tool_call\n{"name": "read_file", "arguments": {"path": "b.js"}}\n```',
          },
        },
      ],
    };

    expect(bridgeOpenAIChatResponse(response, body)).toBe(2);
    expect(response.choices[0].message.tool_calls.map((c) => JSON.parse(c.function.arguments).path)).toEqual(["a.js", "b.js"]);
  });
});

describe("tool calling bridge — response side", () => {
  it("recovers the call the bridge taught the model to write", () => {
    const body = { _openaiToolBridge: { tools: TOOLS } };
    const response = {
      choices: [
        {
          message: {
            role: "assistant",
            content: 'Sure.\n```tool_call\n{"name": "read_file", "arguments": {"path": "a.js"}}\n```',
          },
        },
      ],
    };

    const applied = bridgeOpenAIChatResponse(response, body);

    expect(applied).toBe(1);
    expect(response.choices[0].message.tool_calls).toHaveLength(1);
    expect(response.choices[0].message.tool_calls[0].function.name).toBe("read_file");
    expect(JSON.parse(response.choices[0].message.tool_calls[0].function.arguments)).toEqual({ path: "a.js" });
  });

  it("drops a call naming a tool the client never offered", () => {
    const body = { _openaiToolBridge: { tools: TOOLS } };
    const response = {
      choices: [
        {
          message: {
            role: "assistant",
            content: '```tool_call\n{"name": "delete_everything", "arguments": {}}\n```',
          },
        },
      ],
    };

    expect(bridgeOpenAIChatResponse(response, body)).toBe(0);
    expect(response.choices[0].message.tool_calls).toBeUndefined();
  });

  it("never touches a reply that already carries structured calls", () => {
    const body = { _openaiToolBridge: { tools: TOOLS } };
    const existing = [{ id: "call_x", type: "function", function: { name: "read_file", arguments: "{}" } }];
    const response = { choices: [{ message: { role: "assistant", content: "hi", tool_calls: existing } }] };

    expect(bridgeOpenAIChatResponse(response, body)).toBe(0);
    expect(response.choices[0].message.tool_calls).toBe(existing);
  });
});
