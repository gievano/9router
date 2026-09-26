import { randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

// InxoraStudio Labs (Web) — web dashboard chat (labs.inxorastudio.com).
//
// Bridges the InxoraStudio web API to an OpenAI-compatible interface via a
// 3-step flow:
//   1. POST /api/conversations { model } → { id }  (create conversation)
//   2. POST /api/conversations/{id}/messages/stream { content, model, mode, search, attachments }
//      → SSE stream of { t, d } events:
//        - { t:"chunk", d:"text" }      → content delta
//        - { t:"gen", d:{genId} }       → generation start (ignored)
//        - { t:"user_message", d:{...} } → echoed user message (ignored)
//        - { t:"done", d:{ assistantMessage:{ tokens, inputTokens, outputTokens, ... } } }
//          → terminal: usage + finish_reason: stop
//   3. Parse SSE → OpenAI chat.completion.chunk frames
//
// Auth: Bearer JWT token from labs.inxorastudio.com dashboard login.
// User pastes the Authorization header value (eyJ...).

const API_BASE = "https://labs.inxorastudio.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

function normalizeToken(raw) {
  let v = String(raw || "").trim();
  if (v.toLowerCase().startsWith("bearer ")) v = v.slice(7).trim();
  if (v.toLowerCase().startsWith("cookie:")) v = v.replace(/^cookie:\s*/i, "").trim();
  return v;
}

function errorResponse(status, message, code = "INXORA_ERROR") {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error", code } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    Accept: "*/*",
    Authorization: `Bearer ${token}`,
    Origin: API_BASE,
    Referer: `${API_BASE}/dashboard`,
    "User-Agent": USER_AGENT,
  };
}

export class InxorastudioWebExecutor extends BaseExecutor {
  constructor() {
    super("inxorastudio-web", null);
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions = null }) {
    const token = normalizeToken(credentials?.apiKey || "");
    if (!token) {
      return {
        response: errorResponse(401, "InxoraStudio: no token provided. Log in at labs.inxorastudio.com and copy the Bearer JWT from DevTools."),
        url: API_BASE, headers: {}, transformedBody: body,
      };
    }

    // Flatten messages into a single content string (InxoraStudio web only
    // accepts one text field per message — no multi-turn history).
    const messages = body?.messages || [];
    const userMessages = messages.filter((m) => m.role === "user");
    const sysMessages = messages.filter((m) => m.role === "system");
    const lastUser = userMessages[userMessages.length - 1];
    const userText = typeof lastUser?.content === "string"
      ? lastUser.content
      : Array.isArray(lastUser?.content)
        ? lastUser.content.filter((c) => c.type === "text").map((c) => c.text).join("\n")
        : "";
    if (!userText.trim()) {
      return {
        response: errorResponse(400, "InxoraStudio: request has no user message content."),
        url: API_BASE, headers: {}, transformedBody: body,
      };
    }
    const sysText = sysMessages.length > 0
      ? (typeof sysMessages[0].content === "string" ? sysMessages[0].content : "")
      : null;
    const fullText = sysText ? `${sysText}\n\n${userText}` : userText;

    const modelId = model || "ixlabs/gpt-5.5";
    const headers = buildHeaders(token);

    // Step 1: Create conversation.
    let conversationId;
    try {
      log?.info?.("INXORA", `create conversation model=${modelId} len=${fullText.length}`);
      const convRes = await proxyAwareFetch(`${API_BASE}/api/conversations`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: modelId }),
        signal,
      }, proxyOptions);

      if (convRes.status === 401 || convRes.status === 403) {
        return {
          response: errorResponse(401, "InxoraStudio: token is invalid or expired — re-copy from labs.inxorastudio.com DevTools."),
          url: `${API_BASE}/api/conversations`, headers, transformedBody: body,
        };
      }
      if (!convRes.ok) {
        const errText = await convRes.text().catch(() => "");
        return {
          response: errorResponse(convRes.status, `InxoraStudio create conversation failed: ${errText.slice(0, 300)}`),
          url: `${API_BASE}/api/conversations`, headers, transformedBody: body,
        };
      }
      const convData = await convRes.json().catch(() => null);
      conversationId = convData?.id;
      if (!conversationId) {
        return {
          response: errorResponse(502, "InxoraStudio: conversation creation returned no id."),
          url: `${API_BASE}/api/conversations`, headers, transformedBody: body,
        };
      }
    } catch (err) {
      if (err.name === "AbortError") throw err;
      return {
        response: errorResponse(502, `InxoraStudio create conversation error: ${err?.message || err}`),
        url: `${API_BASE}/api/conversations`, headers, transformedBody: body,
      };
    }

    // Step 2: Stream message to conversation.
    const streamUrl = `${API_BASE}/api/conversations/${conversationId}/messages/stream`;
    const streamBody = {
      content: fullText,
      model: modelId,
      mode: "deep",
      search: false,
      attachments: [],
    };

    let upstream;
    try {
      log?.debug?.("INXORA", `stream to conversation ${conversationId}`);
      upstream = await proxyAwareFetch(streamUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(streamBody),
        signal,
      }, proxyOptions);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      return {
        response: errorResponse(502, `InxoraStudio stream fetch failed: ${err?.message || err}`),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return {
        response: errorResponse(401, "InxoraStudio: token is invalid or expired."),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return {
        response: errorResponse(upstream.status, `InxoraStudio stream error: ${errText.slice(0, 300)}`),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }
    if (!upstream.body) {
      return {
        response: errorResponse(502, "InxoraStudio: empty stream body"),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }

    const cid = `chatcmpl-ix-${randomUUID().slice(0, 12)}`;
    const created = Math.floor(Date.now() / 1000);

    // Non-streaming: collect all text + usage, return single JSON
    if (!stream) {
      const { content, usage } = await collectStream(upstream.body, signal);
      const promptTokens = usage?.inputTokens || Math.ceil(fullText.length / 4);
      const completionTokens = usage?.outputTokens || Math.ceil(content.length / 4);
      return {
        response: new Response(
          JSON.stringify({
            id: cid, object: "chat.completion", created, model: modelId,
            choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
            usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }

    // Streaming: translate InxoraStudio SSE → OpenAI SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body.getReader();
        let buffer = "";

        // Initial role delta
        controller.enqueue(encoder.encode(sseChunk({
          id: cid, object: "chat.completion.chunk", created, model: modelId,
          choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
        })));

        try {
          while (true) {
            if (signal?.aborted) break;
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data: ")) continue;
              const raw = t.slice(6);
              if (raw === "[DONE]") continue;
              try {
                const evt = JSON.parse(raw);
                const type = evt?.t;
                const data = evt?.d;

                if (type === "chunk" && typeof data === "string") {
                  // Content delta
                  controller.enqueue(encoder.encode(sseChunk({
                    id: cid, object: "chat.completion.chunk", created, model: modelId,
                    choices: [{ index: 0, delta: { content: data }, finish_reason: null }],
                  })));
                } else if (type === "done") {
                  // Terminal: emit finish chunk with usage (if available)
                  const assistant = data?.assistantMessage;
                  const finalChunk = {
                    id: cid, object: "chat.completion.chunk", created, model: modelId,
                    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                  };
                  if (Number.isFinite(assistant?.inputTokens) && Number.isFinite(assistant?.outputTokens)) {
                    finalChunk.usage = {
                      prompt_tokens: assistant.inputTokens,
                      completion_tokens: assistant.outputTokens,
                      total_tokens: assistant.tokens || (assistant.inputTokens + assistant.outputTokens),
                    };
                  }
                  controller.enqueue(encoder.encode(sseChunk(finalChunk)));
                }
                // "gen", "user_message" → ignored
              } catch { /* skip malformed */ }
            }
          }
        } catch (err) {
          if (!signal?.aborted) {
            controller.error(err);
            return;
          }
        } finally {
          // Only enqueue DONE + close if controller is not already errored.
          // After controller.error(), enqueue/close throw TypeError and
          // produce an unhandled rejection that masks the original error.
          try {
            controller.enqueue(encoder.encode(SSE_DONE));
            controller.close();
          } catch {
            // Controller already errored or closed — nothing to do.
          }
        }
      },
    });

    return {
      response: new Response(responseStream, { status: 200, headers: { ...SSE_HEADERS_NO_BUFFER } }),
      url: streamUrl, headers, transformedBody: streamBody,
    };
  }
}

/**
 * Collect content + usage from an InxoraStudio SSE stream body.
 * Parses { t:"chunk", d:"..." } for content and { t:"done", d:{assistantMessage:{...}} } for usage.
 */
async function collectStream(body, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  let usage = null;
  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data: ")) continue;
        const raw = t.slice(6);
        if (raw === "[DONE]") continue;
        try {
          const evt = JSON.parse(raw);
          if (evt?.t === "chunk" && typeof evt.d === "string") {
            content += evt.d;
          } else if (evt?.t === "done" && evt.d?.assistantMessage) {
            const a = evt.d.assistantMessage;
            usage = { inputTokens: a.inputTokens, outputTokens: a.outputTokens, tokens: a.tokens };
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
  return { content, usage };
}

export default InxorastudioWebExecutor;
