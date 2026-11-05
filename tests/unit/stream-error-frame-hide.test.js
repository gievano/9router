import { describe, it, expect } from "vitest";
import { createSSEStream } from "../../open-sse/utils/stream.js";
import { HIDDEN_ERROR_MESSAGE } from "../../open-sse/utils/error.js";

const SECRET = "SECRET_UPSTREAM_DETAIL_123";

async function run(frames, opts) {
  const src = new ReadableStream({
    start(c) {
      const enc = new TextEncoder();
      for (const f of frames) c.enqueue(enc.encode(f));
      c.close();
    },
  });
  const out = src.pipeThrough(createSSEStream(opts));
  const reader = out.getReader();
  const dec = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value);
  }
  return text;
}

const errorFrames = [
  `data: {"error":{"message":"${SECRET}","type":"upstream_error","code":"x"}}\n\n`,
  "data: [DONE]\n\n",
];

describe("upstream error frames never leak when Hide Raw Errors is on", () => {
  it("passthrough masks the message and keeps type/code", async () => {
    const text = await run(errorFrames, {
      mode: "passthrough",
      targetFormat: "openai",
      sourceFormat: "openai",
      provider: "test",
      model: "m",
      hideError: true,
    });
    expect(text).not.toContain(SECRET);
    expect(text).toContain(HIDDEN_ERROR_MESSAGE);
    expect(text).toContain("upstream_error");
  });

  it("translate emits a masked error frame instead of dropping it", async () => {
    const text = await run(errorFrames, {
      mode: "translate",
      targetFormat: "claude",
      sourceFormat: "openai",
      provider: "test",
      model: "m",
      hideError: true,
    });
    expect(text).not.toContain(SECRET);
    expect(text).toContain(HIDDEN_ERROR_MESSAGE);
  });

  it("translate to claude client uses event: error", async () => {
    const text = await run(errorFrames, {
      mode: "translate",
      targetFormat: "openai",
      sourceFormat: "claude",
      provider: "test",
      model: "m",
      hideError: true,
    });
    expect(text).not.toContain(SECRET);
    expect(text).toContain("event: error");
  });

  it("toggle off still passes the upstream text through (unchanged behaviour)", async () => {
    const text = await run(errorFrames, {
      mode: "passthrough",
      targetFormat: "openai",
      sourceFormat: "openai",
      provider: "test",
      model: "m",
      hideError: false,
    });
    expect(text).toContain(SECRET);
  });
});

describe("maskHiddenError never forwards a non-JSON upstream body", () => {
  it("rebuilds an HTML error page as a masked JSON error", async () => {
    const { maskHiddenError } = await import("../../open-sse/utils/error.js");
    const upstream = new Response(`<html><title>${SECRET}</title></html>`, {
      status: 502,
      headers: { "content-type": "text/html" },
    });
    const masked = await maskHiddenError(upstream, true);
    const text = await masked.text();
    expect(masked.status).toBe(502);
    expect(text).not.toContain(SECRET);
    expect(text).toContain(HIDDEN_ERROR_MESSAGE);
    expect(masked.headers.get("content-type")).toContain("application/json");
  });

  it("keeps retry-after while masking a JSON 429", async () => {
    const { maskHiddenError } = await import("../../open-sse/utils/error.js");
    const upstream = new Response(JSON.stringify({ error: { message: SECRET, type: "rate_limit_error" } }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "42" },
    });
    const masked = await maskHiddenError(upstream, true);
    const body = await masked.json();
    expect(masked.headers.get("retry-after")).toBe("42");
    expect(body.error.message).toBe(HIDDEN_ERROR_MESSAGE);
    expect(body.error.type).toBe("rate_limit_error");
  });

  it("leaves the response untouched when the toggle is off", async () => {
    const { maskHiddenError } = await import("../../open-sse/utils/error.js");
    const upstream = new Response(`<html>${SECRET}</html>`, { status: 502, headers: { "content-type": "text/html" } });
    const out = await maskHiddenError(upstream, false);
    expect(await out.text()).toContain(SECRET);
  });
});
