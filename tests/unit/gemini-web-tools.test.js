import { describe, expect, it } from "vitest";
import {
  buildInnerPayload,
  buildModelHeader,
  buildPromptWithTools,
  cleanGeminiText,
  makeSapisidHash,
  parseStreamReasoning,
  resolveGeminiWebModel,
} from "../../open-sse/executors/gemini-web.js";
import {
  buildToolInstructions,
  buildToolReminder,
  hasTools,
  parseToolCallReply,
} from "../../open-sse/executors/webCookieToolBridge.js";

describe("gemini-web model table", () => {
  it("defaults to 3.6 Flash", () => {
    expect(resolveGeminiWebModel("").id).toBe("gemini-3.6-flash");
  });

  it("resolves each shipped model to a server-side hex", () => {
    expect(resolveGeminiWebModel("gemini-3.1-pro").hexID).toBe("9d8ca3786ebdfbea");
    expect(resolveGeminiWebModel("gemini-3.6-flash").hexID).toBe("fbb127bbb056c959");
    expect(resolveGeminiWebModel("gemini-3.5-flash-lite").hexID).toBe("cf41b0e0dd7d53e5");
    expect(resolveGeminiWebModel("gemini-4-argon").hexID).toBe("95a4c0abcba24364");
  });

  it("treats 3.7 as an alias of 3.8 (same hex)", () => {
    expect(resolveGeminiWebModel("gemini-3.7-flash").hexID).toBe(
      resolveGeminiWebModel("gemini-3.8-flash").hexID
    );
  });

  it("marks -thinking variants as thinking, base models as not", () => {
    expect(resolveGeminiWebModel("gemini-3.6-flash-thinking").thinking).toBe(true);
    expect(resolveGeminiWebModel("gemini-3.6-flash").thinking).toBe(false);
  });

  it("gates pro/3.8/argon behind a cookie, leaves 3.6 open", () => {
    expect(resolveGeminiWebModel("gemini-3.1-pro").needsCookie).toBe(true);
    expect(resolveGeminiWebModel("gemini-3.6-flash").needsCookie).toBe(false);
  });

  it("selects argon by mode 8", () => {
    expect(resolveGeminiWebModel("gemini-4-argon").mode).toBe(8);
  });

  it("sends no model header for an unknown model", () => {
    const cfg = resolveGeminiWebModel("no-such-model");
    expect(cfg.hexID).toBe("");
    expect(buildModelHeader(cfg.hexID, 1, 1, "x")).toBe("");
  });
});

describe("gemini-web model header", () => {
  it("carries hex, mode, thinking and uuid", () => {
    const h = buildModelHeader("fbb127bbb056c959", 1, 2, "u-1");
    expect(h).toContain('fbb127bbb056c959');
    expect(h).toContain(',1,2,"u-1"]');
    expect(h).toMatch(/^\[1,null,null,null,"[^"]+",null,null,0,\[4,5,6,8\]/);
  });

  it("falls back to the minimal form without a uuid", () => {
    expect(buildModelHeader("abc", 1, 1, "")).toBe('[1,null,null,null,"abc"]');
  });
});

describe("gemini-web inner payload", () => {
  it("has the browser's slot count", () => {
    expect(JSON.parse(buildInnerPayload("x", {})).length).toBe(97);
  });

  it("places prompt, mode, thinking and uuid in the captured slots", () => {
    const inner = JSON.parse(buildInnerPayload("halo", { mode: 8, thinking: true, uuid: "r1" }));
    expect(JSON.stringify(inner[0])).toContain("halo");
    expect(inner[79]).toBe(8);
    expect(inner[80]).toBe(2);
    expect(inner[96]).toBe(1);
    expect(inner[59]).toBe("r1");
    expect(inner[41]).toEqual([1]);
  });

  it("uses the normal thinking value when thinking is off", () => {
    const inner = JSON.parse(buildInnerPayload("x", { mode: 1, thinking: false, uuid: "r" }));
    expect(inner[80]).toBe(1);
    expect(inner[96]).toBe(0);
  });
});

describe("gemini-web SAPISID hash", () => {
  it("matches the SAPISIDHASH <ts>_<sha1> shape", () => {
    expect(makeSapisidHash(1700000000, "abc")).toMatch(
      /^SAPISIDHASH 1700000000_[0-9a-f]{40}$/
    );
  });
});

describe("web-cookie tool bridge", () => {
  const body = {
    messages: [{ role: "user", content: "list files" }],
    tools: [
      {
        type: "function",
        function: {
          name: "run_command",
          description: "run",
          parameters: {
            type: "object",
            properties: { command: { type: "string" } },
          },
        },
      },
    ],
  };

  it("detects the tools array", () => {
    expect(hasTools(body)).toBe(true);
    expect(hasTools({ messages: [] })).toBe(false);
  });

  it("builds instructions carrying the schema and fence", () => {
    const i = buildToolInstructions(body, "marker");
    expect(i).toContain("run_command");
    expect(i).toContain("<<TOOL_CALL>>");
    expect(buildToolInstructions(body, "fenced")).toContain("```tool_call");
  });

  it("honours a forced tool_choice function name", () => {
    const i = buildToolInstructions(
      { tool_choice: { type: "function", function: { name: "run_command" } }, tools: body.tools },
      "marker"
    );
    expect(i).toContain('MUST call the tool "run_command"');
  });

  it("reminds the model that a code block is not an execution channel", () => {
    expect(buildToolReminder("marker")).toContain("code block is NOT executed");
  });

  it("assembles the prompt with instructions, question and reminder", () => {
    const p = buildPromptWithTools([{ role: "user", content: "list files" }], body);
    expect(p.toolMode).toBe(true);
    expect(p.prompt).toContain("```tool_call");
    expect(p.prompt).toContain("list files");
    expect(p.prompt).toContain("highest priority");
    expect(buildPromptWithTools([{ role: "user", content: "hi" }], { messages: [] }).toolMode).toBe(
      false
    );
  });

  it("parses a fenced tool call out of a reply", () => {
    const r = parseToolCallReply(
      'here you go\n```tool_call\n{"name": "run_command", "arguments": {"command": "ls"}}\n```'
    );
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0].name).toBe("run_command");
    expect(r.calls[0].arguments.command).toBe("ls");
    expect(r.content).not.toContain("tool_call");
  });

  it("parses the marker style too", () => {
    const r = parseToolCallReply(
      'ok <<TOOL_CALL>> {"name": "read", "arguments": {"p": "a"}} <<TOOL_CALL>> done'
    );
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0].name).toBe("read");
  });

  it("returns plain content untouched when there is no call", () => {
    const r = parseToolCallReply("just a normal answer");
    expect(r.calls).toHaveLength(0);
    expect(r.content).toBe("just a normal answer");
  });

  it("tolerates a trailing comma", () => {
    const r = parseToolCallReply('run it\n{"name": "x", "arguments": {"a": 1,}}');
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0].arguments.a).toBe(1);
  });
});

describe("gemini-web response parsing", () => {
  it("strips code execution artifacts", () => {
    expect(cleanGeminiText("```python?code_reference&code_event_index=1\nprint(1)\n```\nhello")).toBe(
      "hello"
    );
  });

  it("returns empty reasoning when there is no wrb.fr stream", () => {
    expect(parseStreamReasoning("hello world")).toBe("");
  });
});
