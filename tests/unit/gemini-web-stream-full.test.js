import { describe, expect, it } from "vitest";
import { readGeminiStream, parseStreamResponse } from "../../open-sse/executors/gemini-web.js";

function candidateFrame(text) {
  const payload = JSON.stringify([
    null,
    "c_test",
    null,
    null,
    [[`rc_${"a".repeat(20)}`, [text], null, null, null, null, null, null, "response"]],
  ]);
  const line = JSON.stringify([["wrb.fr", null, payload]]);
  return `${line.length}\n${line}\n`;
}

function endFrame() {
  const line = JSON.stringify([["e", 12, null, null, 100]]);
  return `${line.length}\n${line}\n`;
}

function streamOf(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("gemini-web stream reader", () => {
  it("keeps reading past a parseable mid-stream frame so the reply is complete", async () => {
    const raw = await readGeminiStream({
      body: streamOf([
        candidateFrame("1, 2"),
        candidateFrame("1, 2, 3, 4"),
        endFrame(),
      ]),
    });

    expect(parseStreamResponse(raw)).toBe("1, 2, 3, 4");
  });

  it("returns a tool-call fence whole instead of cut in half", async () => {
    const fence = '```tool_call\n{"name": "get_weather", "arguments": {"city": "Jakarta"}}\n```';
    const raw = await readGeminiStream({
      body: streamOf([
        candidateFrame('```tool_call\n{"name": "get_weather", "arguments": {'),
        candidateFrame(fence),
        endFrame(),
      ]),
    });

    expect(parseStreamResponse(raw)).toBe(fence);
  });
});
