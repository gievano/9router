// JSON Guard + Context Squeezer: repair a machine-readable answer and fit a
// conversation into the model's window. Both are pure functions imported
// straight from the translator concerns they ship in.
import { describe, it, expect } from "vitest";
import {
  coerceJsonOutput,
  coerceToolArguments,
  applyJsonGuard,
  scanBalancedJson,
  fencedBlock,
  repairJsonText,
  closeTruncatedJson,
  filterArguments,
} from "../open-sse/translator/concerns/jsonGuard.js";
import {
  squeezeContext,
  estimateConversationTokens,
  buildRecap,
} from "../open-sse/translator/concerns/contextSqueezer.js";

describe("jsonGuard: coerceJsonOutput", () => {
  it("leaves valid JSON untouched", () => {
    const r = coerceJsonOutput('{"a":1,"b":[1,2]}');
    expect(r.repaired).toBe(false);
    expect(r.value).toEqual({ a: 1, b: [1, 2] });
  });

  it("extracts a fenced payload out of prose", () => {
    const r = coerceJsonOutput("Sure! Here it is:\n```json\n{\"ok\":true}\n```\nHope that helps.");
    expect(r.value).toEqual({ ok: true });
    expect(r.repaired).toBe(true);
  });

  it("extracts a balanced value from surrounding prose", () => {
    const r = coerceJsonOutput('The result is {"name":"x","tags":["a","b"]} as requested.');
    expect(r.value).toEqual({ name: "x", tags: ["a", "b"] });
  });

  it("repairs Python literals, single quotes and trailing commas", () => {
    expect(coerceJsonOutput('{"a":True,"b":False,"c":None}').value).toEqual({ a: true, b: false, c: null });
    expect(coerceJsonOutput("{'name': 'budi'}").value).toEqual({ name: "budi" });
    expect(coerceJsonOutput('{"a":1,"b":2,}').value).toEqual({ a: 1, b: 2 });
  });

  it("closes a payload the output limit cut off", () => {
    const r = coerceJsonOutput('{"path":"/tmp/x","content":"abc","opt');
    expect(r.truncated).toBe(true);
    expect(r.value).toEqual({ path: "/tmp/x", content: "abc" });
  });

  it("keeps a complete trailing value when closing", () => {
    // The 3 is a finished value, not a torn one — closing must keep it.
    expect(coerceJsonOutput('{"outer":{"inner":[1,2,3').value).toEqual({ outer: { inner: [1, 2, 3] } });
  });

  it("refuses plain prose and unbalanced garbage", () => {
    expect(coerceJsonOutput("I cannot answer that question.")).toBeNull();
    expect(coerceJsonOutput("{{{{{ not json")).toBeNull();
    expect(coerceJsonOutput("")).toBeNull();
    expect(coerceJsonOutput(null)).toBeNull();
  });

  it("never rewrites values inside string literals", () => {
    expect(JSON.parse(repairJsonText('{"msg":"the answer is True here"}')).msg).toBe("the answer is True here");
  });
});

describe("jsonGuard: scanBalancedJson and helpers", () => {
  it("ignores braces inside strings", () => {
    expect(scanBalancedJson('prefix {"text":"a } b { c","n":1}')).toBe('{"text":"a } b { c","n":1}');
  });

  it("fencedBlock extracts and trims", () => {
    expect(fencedBlock("x ```json\n[1,2]\n``` y")).toBe("[1,2]");
    expect(fencedBlock("no fence here")).toBeNull();
  });

  it("closeTruncatedJson is idempotent on balanced input", () => {
    expect(closeTruncatedJson('{"a":1}')).toBe('{"a":1}');
  });
});

describe("jsonGuard: tool arguments", () => {
  const schema = {
    type: "object",
    properties: { path: { type: "string" }, verbose: { type: "boolean" }, limit: { type: "number" }, tags: { type: "array" } },
    required: ["path", "verbose", "limit", "tags"],
  };

  it("repairs a stringified argument list", () => {
    const r = coerceToolArguments('{"file": "a.txt", "lines": 10,}');
    expect(r.args).toEqual({ file: "a.txt", lines: 10 });
    expect(r.repaired).toBe(true);
  });

  it("rejects non-object JSON and flags unparseable input", () => {
    expect(coerceToolArguments("[1,2,3]").args).toBeNull();
    expect(coerceToolArguments("not json at all").unparseable).toBe(true);
  });

  it("drops undeclared keys and fills required ones with safe defaults", () => {
    const r = filterArguments({ nope: 1 }, { type: "object", properties: { path: { type: "string" } }, required: ["path"] });
    expect(r.dropped).toEqual(["nope"]);
    expect(r.missing).toEqual(["path"]); // strings have no safe default to fill
  });

  it("fills scalar defaults from the schema", () => {
    const r = filterArguments({ path: "a" }, schema);
    expect(r.args).toEqual({ path: "a", verbose: false, limit: 0, tags: [] });
    expect(r.filled.sort()).toEqual(["limit", "tags", "verbose"]);
  });
});

describe("jsonGuard: applyJsonGuard on a completion payload", () => {
  const tools = [{
    type: "function",
    function: {
      name: "read",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  }];

  it("repairs text and schema-cleans tool calls in one pass", () => {
    const payload = {
      choices: [{
        message: {
          content: '```json\n{"x":True}\n```',
          tool_calls: [{ function: { name: "read", arguments: '{"path":"a","nope":1,}' } }],
        },
      }],
    };
    const { changed, stats } = applyJsonGuard(payload, tools);
    expect(changed).toBe(true);
    expect(stats.textRepaired).toBe(1);
    expect(payload.choices[0].message.content).toBe('{"x":true}');
    expect(JSON.parse(payload.choices[0].message.tool_calls[0].function.arguments)).toEqual({ path: "a" });
  });

  it("leaves normal prose and vision content alone", () => {
    const prose = { choices: [{ message: { content: "Just a normal answer.", tool_calls: [] } }] };
    expect(applyJsonGuard(prose).changed).toBe(false);
    expect(prose.choices[0].message.content).toBe("Just a normal answer.");

    const vision = { choices: [{ message: { content: [{ type: "text", text: "hi" }] } }] };
    expect(applyJsonGuard(vision).changed).toBe(false);
  });

  it("repairs a stringified Claude tool_use input", () => {
    const payload = { content: [{ type: "tool_use", input: '{"a":1,}' }] };
    expect(applyJsonGuard(payload).changed).toBe(true);
    expect(payload.content[0].input).toEqual({ a: 1 });
  });

  it("tolerates empty payloads", () => {
    expect(applyJsonGuard(null).changed).toBe(false);
    expect(applyJsonGuard({}).changed).toBe(false);
    expect(applyJsonGuard({ choices: [] }).changed).toBe(false);
  });
});

describe("contextSqueezer: squeezeContext", () => {
  it("leaves a fitting conversation untouched", () => {
    const msgs = [
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    const r = squeezeContext(msgs, { contextWindow: 100000 });
    expect(r.changed).toBe(false);
    expect(r.stats.reason).toBe("fits");
  });

  it("does nothing without a window", () => {
    const r = squeezeContext([{ role: "user", content: "x".repeat(50000) }], { contextWindow: 0 });
    expect(r.changed).toBe(false);
    expect(r.stats.reason).toBe("no-window");
  });

  it("trims the oldest turns, keeps the system prompt and the newest turn", () => {
    const msgs = [
      { role: "system", content: "IMPORTANT SYSTEM PROMPT" },
      ...Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `turn ${i}: ${"y".repeat(3000)}` })),
      { role: "user", content: "latest question" },
    ];
    const before = estimateConversationTokens(msgs);
    const r = squeezeContext(msgs, { contextWindow: 10000 });
    expect(r.changed).toBe(true);
    expect(r.stats.tokensBefore).toBe(before);
    expect(r.stats.tokensAfter).toBeLessThanOrEqual(r.stats.tokensBefore);
    expect(r.stats.droppedTurns).toBeGreaterThan(0);
    expect(r.messages[0].content).toBe("IMPORTANT SYSTEM PROMPT");
    expect(r.messages[r.messages.length - 1].content).toBe("latest question");
    expect(r.messages.some((m) => typeof m.content === "string" && m.content.startsWith("[Context Squeezer]"))).toBe(true);
  });

  it("never mutates the input", () => {
    const msgs = [
      { role: "system", content: "sys" },
      ...Array.from({ length: 30 }, (_, i) => ({ role: "user", content: `z${i}: ${"z".repeat(4000)}` })),
    ];
    const snapshot = JSON.stringify(msgs);
    squeezeContext(msgs, { contextWindow: 8000 });
    expect(JSON.stringify(msgs)).toBe(snapshot);
  });

  it("keeps at least minTurns even under a tiny window", () => {
    const msgs = [
      { role: "system", content: "sys" },
      ...Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `q${i}: ${"q".repeat(2000)}` })),
    ];
    const r = squeezeContext(msgs, { contextWindow: 1000, minTurns: 4 });
    const turns = r.messages.filter((m) => m.role !== "system" || !String(m.content).startsWith("[Context Squeezer]"));
    expect(turns.length).toBeGreaterThanOrEqual(4);
  });

  it("recap names the dropped roles", () => {
    const recap = buildRecap([{ role: "user" }, { role: "assistant" }, { role: "tool" }, { role: "user" }]);
    expect(recap).toMatch(/2 user messages/);
    expect(recap).toMatch(/1 tool result/);
  });
});
