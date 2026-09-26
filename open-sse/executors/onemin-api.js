import { randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

// 1min.ai (API) — official API-key access via /api/chat-with-ai.
//
// Sibling of the cookie/JWT executor. Uses a revocable API key instead of a
// dashboard JWT. The chat-with-ai endpoint is preferred over /api/features
// because it supports true SSE streaming (event: content | result | done).
//
// Auth: custom `API-KEY: <key>` header (NOT Authorization: Bearer).
//
// Body: { type:"UNIFY_CHAT_WITH_AI", model, promptObject:{ prompt, ... } }
// Stream response: SSE with `event: content` / `data: {"content":"..."}`.
// Non-stream response: single JSON { aiRecord: { resultObject: [...] } }.
//
// The custom execute() bypasses BaseExecutor's retry loop (the cookie executor
// follows the same pattern) because the request/response shapes are non-standard.

const API_BASE = "https://api.1min.ai";
const CHAT_STREAM_URL = `${API_BASE}/api/chat-with-ai?isStreaming=true`;
const CHAT_URL = `${API_BASE}/api/chat-with-ai`;

function normalizeKey(raw) {
  let v = String(raw || "").trim();
  if (v.toLowerCase().startsWith("bearer ")) v = v.slice(7).trim();
  return v;
}

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error", code: "ONEMIN_API_ERROR" } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function buildHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Accept: "text/event-stream,application/json;q=0.9",
    "API-KEY": apiKey,
  };
}

// Flatten the OpenAI-style messages array into the single `prompt` string that
// 1min.ai's chat-with-ai endpoint expects. System messages are prepended.
function flattenPrompt(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const userMsgs = list.filter((m) => m.role === "user");
  const sysMsgs = list.filter((m) => m.role === "system");
  const lastUser = userMsgs[userMsgs.length - 1];

  const userText = typeof lastUser?.content === "string"
    ? lastUser.content
    : Array.isArray(lastUser?.content)
      ? lastUser.content.filter((c) => c.type === "text").map((c) => c.text).join("\n")
      : "";

  const sysText = sysMsgs.length > 0
    ? (typeof sysMsgs[0].content === "string" ? sysMsgs[0].content : "")
    : null;

  return sysText ? `${sysText}\n\n${userText}` : userText;
}

// Parse a single SSE frame from the 1min.ai dialect.
// Returns { event, data } or null if the chunk is incomplete.
function parseSseFrame(eventBuf, dataBuf) {
  const event = (eventBuf || "content").trim() || "content";
  let data;
  try {
    data = dataBuf.trim() ? JSON.parse(dataBuf) : {};
  } catch {
    // Non-JSON data line — treat the raw text as content if it's a content event.
    if (event === "content") data = { content: dataBuf };
    else data = { raw: dataBuf };
  }
  return { event, data };
}

export class OneMinApiExecutor extends BaseExecutor {
  constructor() {
    super("1min-api", null);
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions = null }) {
    const apiKey = normalizeKey(credentials?.apiKey || "");
    if (!apiKey) {
      return {
        response: errorResponse(401, "1min.ai API: no API key provided. Create one at app.1min.ai → API."),
        url: CHAT_URL, headers: {}, transformedBody: body,
      };
    }

    const prompt = flattenPrompt(body?.messages || []);
    if (!prompt.trim()) {
      return {
        response: errorResponse(400, "1min.ai API: request has no user message content."),
        url: CHAT_URL, headers: {}, transformedBody: body,
      };
    }

    const modelId = model || "gpt-4o-mini";
    const headers = buildHeaders(apiKey);
    const requestBody = {
      type: "UNIFY_CHAT_WITH_AI",
      model: modelId,
      promptObject: { prompt },
    };

    const cid = `chatcmpl-1ma-${randomUUID().slice(0, 12)}`;
    const created = Math.floor(Date.now() / 1000);
    const targetUrl = stream ? CHAT_STREAM_URL : CHAT_URL;

    let upstream;
    try {
      log?.info?.("1MIN-API", `chat model=${modelId} stream=${stream} len=${prompt.length}`);
      upstream = await proxyAwareFetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal,
      }, proxyOptions);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      return {
        response: errorResponse(502, `1min.ai API fetch failed: ${err?.message || err}`),
        url: targetUrl, headers, transformedBody: requestBody,
      };
    }

    if (upstream.status === 401 || upstream.status === 403) {
      const errText = await upstream.text().catch(() => "");
      return {
        response: errorResponse(401, `1min.ai API: key rejected (${upstream.status}). ${errText.slice(0, 200)}`),
        url: targetUrl, headers, transformedBody: requestBody,
      };
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return {
        response: errorResponse(upstream.status, `1min.ai API error: ${errText.slice(0, 300)}`),
        url: targetUrl, headers, transformedBody: requestBody,
      };
    }

    // ---------- Non-streaming: single JSON response ----------
    if (!stream || !upstream.body) {
      let raw;
      try {
        raw = await upstream.json();
      } catch {
        const text = await upstream.text().catch(() => "");
        return {
          response: errorResponse(502, `1min.ai API: invalid JSON response. ${text.slice(0, 200)}`),
          url: targetUrl, headers, transformedBody: requestBody,
        };
      }
      // aiRecord.resultObject is an array of string chunks; join them.
      const content = Array.isArray(raw?.aiRecord?.resultObject)
        ? raw.aiRecord.resultObject.join("")
        : (raw?.aiRecord?.result || raw?.content || "");
      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(content.length / 4);
      return {
        response: new Response(
          JSON.stringify({
            id: cid, object: "chat.completion", created, model: modelId,
            choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
            usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
        url: targetUrl, headers, transformedBody: requestBody,
      };
    }

    // ---------- Streaming: translate 1min SSE → OpenAI chat.completion.chunk ----------
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body.getReader();

        // Initial role delta.
        controller.enqueue(encoder.encode(sseChunk({
          id: cid, object: "chat.completion.chunk", created, model: modelId,
          choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
        })));

        let buffer = "";
        let eventBuf = "";
        let dataBuf = "";
        let totalContent = "";

        const flushFrame = () => {
          const frame = parseSseFrame(eventBuf, dataBuf);
          if (!frame) return;
          if (frame.event === "content" && frame.data?.content) {
            totalContent += frame.data.content;
            controller.enqueue(encoder.encode(sseChunk({
              id: cid, object: "chat.completion.chunk", created, model: modelId,
              choices: [{ index: 0, delta: { content: frame.data.content }, finish_reason: null }],
            })));
          } else if (frame.event === "error") {
            const errMsg = frame.data?.message || frame.data?.error || "1min.ai stream error";
            log?.warn?.("1MIN-API", `stream error event: ${errMsg}`);
          }
          // `result` and `done` events are handled on stream close.
        };

        try {
          while (true) {
            if (signal?.aborted) break;
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE frames (separated by \n\n).
            let nl;
            while ((nl = buffer.indexOf("\n\n")) !== -1) {
              const frameText = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 2);

              // Reset per-frame buffers.
              eventBuf = "";
              dataBuf = "";
              const lines = frameText.split("\n");
              for (const line of lines) {
                if (line.startsWith("event:")) {
                  eventBuf = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                  dataBuf += (dataBuf ? "\n" : "") + line.slice(5).trim();
                }
              }
              if (dataBuf) flushFrame();
            }
          }
        } catch (err) {
          if (!signal?.aborted) {
            try { controller.error(err); } catch { /* already closed */ }
            return;
          }
        } finally {
          // Flush any trailing partial frame.
          if (dataBuf) flushFrame();

          try {
            const promptTokens = Math.ceil(prompt.length / 4);
            const completionTokens = Math.ceil(totalContent.length / 4);
            controller.enqueue(encoder.encode(sseChunk({
              id: cid, object: "chat.completion.chunk", created, model: modelId,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
            })));
            controller.enqueue(encoder.encode(SSE_DONE));
            controller.close();
          } catch {
            // Controller already errored or closed.
          }
        }
      },
    });

    return {
      response: new Response(responseStream, { status: 200, headers: { ...SSE_HEADERS_NO_BUFFER } }),
      url: targetUrl, headers, transformedBody: requestBody,
    };
  }
}

export default OneMinApiExecutor;
