import { randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";
import { estimateInputTokens, estimateOutputTokens } from "../utils/usageTracking.js";

// Agnes (Web) — agentic AI assistant at app.agnes-ai.com.
//
// Chat flow (single request, SSE):
//   POST /api/v1/agnes/chat/stream
//   Body: { conversation_id, query, agent_type:"super", files:[], extra_context:{} }
//   → SSE events: AgentStart → NodeStart → MessageDelta {data:{content}} → NodeEnd → AgentEnd
//
// Auth: Authorization: Bearer <jwt>
// Required headers: X-Platform, X-App-Timezone, X-Client-Time-Ms, X-User-Language

const API_BASE = "https://api.agnes-ai.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

function normalizeToken(raw) {
  let v = String(raw || "").trim();
  if (v.toLowerCase().startsWith("bearer ")) v = v.slice(7).trim();
  if (v.toLowerCase().startsWith("token=")) v = v.slice(6).trim();
  return v;
}

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error", code: "AGNES_ERROR" } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    Authorization: `Bearer ${token}`,
    "X-Platform": "1",
    "X-App-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    "X-Client-Time-Ms": String(Date.now()),
    "X-User-Language": "en",
    Origin: "https://app.agnes-ai.com",
    Referer: "https://app.agnes-ai.com/",
    "User-Agent": USER_AGENT,
  };
}

// Flatten messages to single query string for Agnes (single prompt field).
function flattenQuery(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const userMsgs = list.filter((m) => m.role === "user");
  const sysMsgs = list.filter((m) => m.role === "system");
  const assistantMsgs = list.filter((m) => m.role === "assistant");
  const lastUser = userMsgs[userMsgs.length - 1];

  const userText = typeof lastUser?.content === "string"
    ? lastUser.content
    : Array.isArray(lastUser?.content)
      ? lastUser.content.filter((c) => c.type === "text").map((c) => c.text).join("\n")
      : "";

  const sysText = sysMsgs.length > 0
    ? (typeof sysMsgs[0].content === "string" ? sysMsgs[0].content : "")
    : null;

  // Build conversation context from prior turns.
  let contextParts = [];
  if (sysText) contextParts.push(`[System]: ${sysText}`);
  // Include prior assistant messages for multi-turn context.
  for (const msg of assistantMsgs) {
    const text = typeof msg.content === "string" ? msg.content : "";
    if (text) contextParts.push(`[Assistant]: ${text}`);
  }
  // Include prior user messages (except the last one which is the query).
  for (let i = 0; i < userMsgs.length - 1; i++) {
    const text = typeof userMsgs[i].content === "string" ? userMsgs[i].content : "";
    if (text) contextParts.push(`[User]: ${text}`);
  }

  if (contextParts.length > 0) {
    return `${contextParts.join("\n\n")}\n\n[User]: ${userText}`;
  }
  return userText;
}

export class AgnesWebExecutor extends BaseExecutor {
  constructor() {
    super("agnes-web", null);
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions = null }) {
    const token = normalizeToken(credentials?.apiKey || "");
    if (!token) {
      return {
        response: errorResponse(401, "Agnes: no token provided. Log in at app.agnes-ai.com and copy the token cookie."),
        url: API_BASE, headers: {}, transformedBody: body,
      };
    }

    const query = flattenQuery(body?.messages || []);
    if (!query.trim()) {
      return {
        response: errorResponse(400, "Agnes: request has no user message content."),
        url: API_BASE, headers: {}, transformedBody: body,
      };
    }

    const headers = buildHeaders(token);
    const conversationId = String(Date.now()) + Math.floor(Math.random() * 10000);
    const requestBody = {
      conversation_id: conversationId,
      query,
      agent_type: "super",
      files: [],
      extra_context: { agent_params: {} },
    };

    let upstream;
    try {
      log?.info?.("AGNES", `chat stream len=${query.length}`);
      upstream = await proxyAwareFetch(
        `${API_BASE}/api/v1/agnes/chat/stream`,
        { method: "POST", headers, body: JSON.stringify(requestBody), signal },
        proxyOptions,
      );
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      return {
        response: errorResponse(502, `Agnes fetch failed: ${err?.message || String(err)}`),
        url: `${API_BASE}/api/v1/agnes/chat/stream`, headers, transformedBody: requestBody,
      };
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return {
        response: errorResponse(401, "Agnes: token is invalid or expired — re-copy from app.agnes-ai.com."),
        url: `${API_BASE}/api/v1/agnes/chat/stream`, headers, transformedBody: requestBody,
      };
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return {
        response: errorResponse(upstream.status, `Agnes error: ${errText.slice(0, 300)}`),
        url: `${API_BASE}/api/v1/agnes/chat/stream`, headers, transformedBody: requestBody,
      };
    }
    if (!upstream.body) {
      return {
        response: errorResponse(502, "Agnes: empty stream body"),
        url: `${API_BASE}/api/v1/agnes/chat/stream`, headers, transformedBody: requestBody,
      };
    }

    const cid = `chatcmpl-agnes-${randomUUID().slice(0, 12)}`;
    const created = Math.floor(Date.now() / 1000);
    const modelId = model || "agnes-super";

    // ── Streaming: parse Agnes SSE → OpenAI chat.completion.chunk ──
    if (stream) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          const reader = upstream.body.getReader();
          let buffer = "";
          let totalContent = "";

          // Initial role delta.
          controller.enqueue(encoder.encode(sseChunk({
            id: cid, object: "chat.completion.chunk", created, model: modelId,
            choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
          })));

          const flushFrame = (eventType, data) => {
            if (eventType === "MessageDelta" && data?.data?.content) {
              totalContent += data.data.content;
              controller.enqueue(encoder.encode(sseChunk({
                id: cid, object: "chat.completion.chunk", created, model: modelId,
                choices: [{ index: 0, delta: { content: data.data.content }, finish_reason: null }],
              })));
            }
            // AgentStart, NodeStart, NodeEnd, AgentEnd are ignored for content.
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

                let eventBuf = "";
                let dataBuf = "";
                for (const line of frameText.split("\n")) {
                  if (line.startsWith("event:")) eventBuf = line.slice(6).trim();
                  else if (line.startsWith("data:")) dataBuf += (dataBuf ? "\n" : "") + line.slice(5).trim();
                }
                if (dataBuf) {
                  try { flushFrame(eventBuf, JSON.parse(dataBuf)); } catch { /* skip */ }
                }
              }
            }
            // Flush trailing.
            if (buffer.trim()) {
              let eventBuf = "", dataBuf = "";
              for (const line of buffer.split("\n")) {
                if (line.startsWith("event:")) eventBuf = line.slice(6).trim();
                else if (line.startsWith("data:")) dataBuf += (dataBuf ? "\n" : "") + line.slice(5).trim();
              }
              if (dataBuf) {
                try { flushFrame(eventBuf, JSON.parse(dataBuf)); } catch { /* skip */ }
              }
            }
          } catch (err) {
            if (!signal?.aborted) { try { controller.error(err); return; } catch { /* closed */ } }
          } finally {
            try {
              const promptTokens = estimateInputTokens(body);
              const completionTokens = estimateOutputTokens(totalContent.length);
              controller.enqueue(encoder.encode(sseChunk({
                id: cid, object: "chat.completion.chunk", created, model: modelId,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens, estimated: true },
              })));
              controller.enqueue(encoder.encode(SSE_DONE));
              controller.close();
            } catch { /* controller already closed */ }
          }
        },
        cancel() { try { upstream.body?.cancel?.(); } catch { /* ignore */ } },
      });

      return {
        response: new Response(responseStream, { status: 200, headers: { ...SSE_HEADERS_NO_BUFFER } }),
        url: `${API_BASE}/api/v1/agnes/chat/stream`, headers, transformedBody: requestBody,
      };
    }

    // ── Non-streaming: collect all content, return single JSON ──
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const frame of lines) {
          let eventBuf = "", dataBuf = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) eventBuf = line.slice(6).trim();
            else if (line.startsWith("data:")) dataBuf += (dataBuf ? "\n" : "") + line.slice(5).trim();
          }
          if (dataBuf && eventBuf === "MessageDelta") {
            try {
              const data = JSON.parse(dataBuf);
              if (data?.data?.content) content += data.data.content;
            } catch { /* skip */ }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const promptTokens = estimateInputTokens(body);
    const completionTokens = estimateOutputTokens(content.length);

    return {
      response: new Response(
        JSON.stringify({
          id: cid, object: "chat.completion", created, model: modelId,
          choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
          usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens, estimated: true },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
      url: `${API_BASE}/api/v1/agnes/chat/stream`, headers, transformedBody: requestBody,
    };
  }
}

export default AgnesWebExecutor;
