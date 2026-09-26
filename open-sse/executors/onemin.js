import { randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

// 1min.ai — AI platform with 38+ coding models.
//
// 3-step chat flow:
//   1. POST /teams/{teamId}/features/conversations { type:"CODE_GENERATOR", title }
//      → { conversation: { uuid } }
//   2. POST /teams/{teamId}/features?isStreaming=true
//      { type, conversationId, model, promptObject:{ prompt, webSearch }, metadata }
//      → plain-text streaming (NOT SSE — raw text chunks with no framing)
//   3. Parse plain text → OpenAI chat.completion.chunk SSE
//
// Auth: x-auth-token: Bearer <jwt> (stored as apiKey)
// Team ID: from providerSpecificData.teamId (user-provided) or extracted from JWT payload
// Cookies: optional, from providerSpecificData.cookies — injected as Cookie header for Cloudflare bypass

const API_BASE = "https://api.1min.ai";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

function normalizeToken(raw) {
  let v = String(raw || "").trim();
  if (v.toLowerCase().startsWith("bearer ")) v = v.slice(7).trim();
  if (v.toLowerCase().startsWith("cookie:")) v = v.replace(/^cookie:\s*/i, "").trim();
  return v;
}

// Try to extract team UUID from JWT payload (the "uuid" field).
// NOTE: the JWT payload uuid is the USER uuid, not the team uuid. The team uuid
// is only available via providerSpecificData.teamId (user-provided). This fallback
// exists for backward compat with old JWT-only connections but may return the
// wrong ID for multi-team accounts.
function extractTeamId(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return payload?.uuid || null;
  } catch {
    return null;
  }
}

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error", code: "ONEMIN_ERROR" } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function buildHeaders(token, cookies) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "*/*",
    "x-auth-token": `Bearer ${token}`,
    "x-app-version": "1.2.3",
    Origin: "https://app.1min.ai",
    Referer: "https://app.1min.ai/",
    "User-Agent": USER_AGENT,
  };
  // Inject Cookie header if cookies are provided (Cloudflare bypass).
  if (cookies && typeof cookies === "string" && cookies.trim()) {
    let cookieStr = cookies.trim();
    // Strip "Cookie: " prefix if user pasted the full header.
    if (cookieStr.toLowerCase().startsWith("cookie:")) {
      cookieStr = cookieStr.replace(/^cookie:\s*/i, "").trim();
    }
    headers["Cookie"] = cookieStr;
  }
  return headers;
}

export class OneMinExecutor extends BaseExecutor {
  constructor() {
    super("1min", null);
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions = null }) {
    const token = normalizeToken(credentials?.apiKey || "");
    if (!token) {
      return {
        response: errorResponse(401, "1min.ai: no token provided. Log in at app.1min.ai and copy the x-auth-token Bearer value from DevTools."),
        url: API_BASE, headers: {}, transformedBody: body,
      };
    }

    // Extract teamId from JWT or providerSpecificData.
    const teamId = credentials?.providerSpecificData?.teamId || extractTeamId(token);
    if (!teamId) {
      return {
        response: errorResponse(400, "1min.ai: could not extract team ID from token. Ensure you copied the full JWT."),
        url: API_BASE, headers: {}, transformedBody: body,
      };
    }

    // Flatten messages to single prompt (1min only accepts one prompt field).
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
        response: errorResponse(400, "1min.ai: request has no user message content."),
        url: API_BASE, headers: {}, transformedBody: body,
      };
    }
    const sysText = sysMessages.length > 0
      ? (typeof sysMessages[0].content === "string" ? sysMessages[0].content : "")
      : null;
    const fullText = sysText ? `${sysText}\n\n${userText}` : userText;

    const modelId = model || "claude-5-sonnet";
    const cookies = credentials?.providerSpecificData?.cookies || "";
    const headers = buildHeaders(token, cookies);

    // Step 1: Create conversation.
    let conversationId;
    try {
      log?.info?.("1MIN", `create conversation model=${modelId} len=${fullText.length}`);
      const convRes = await proxyAwareFetch(
        `${API_BASE}/teams/${teamId}/features/conversations`,
        { method: "POST", headers, body: JSON.stringify({ type: "CODE_GENERATOR", title: fullText.slice(0, 50) }), signal },
        proxyOptions,
      );

      if (convRes.status === 401 || convRes.status === 403) {
        return {
          response: errorResponse(401, "1min.ai: token is invalid or expired — re-copy from app.1min.ai DevTools."),
          url: `${API_BASE}/teams/${teamId}/features/conversations`, headers, transformedBody: body,
        };
      }
      if (!convRes.ok) {
        const errText = await convRes.text().catch(() => "");
        return {
          response: errorResponse(convRes.status, `1min.ai create conversation failed: ${errText.slice(0, 300)}`),
          url: `${API_BASE}/teams/${teamId}/features/conversations`, headers, transformedBody: body,
        };
      }
      const convData = await convRes.json().catch(() => null);
      conversationId = convData?.conversation?.uuid;
      if (!conversationId) {
        return {
          response: errorResponse(502, "1min.ai: conversation creation returned no uuid."),
          url: `${API_BASE}/teams/${teamId}/features/conversations`, headers, transformedBody: body,
        };
      }
    } catch (err) {
      if (err.name === "AbortError") throw err;
      return {
        response: errorResponse(502, `1min.ai create conversation error: ${err?.message || err}`),
        url: `${API_BASE}/teams/${teamId}/features/conversations`, headers, transformedBody: body,
      };
    }

    // Step 2: Stream message.
    const streamUrl = `${API_BASE}/teams/${teamId}/features?isStreaming=true`;
    const streamBody = {
      type: "CODE_GENERATOR",
      conversationId,
      model: modelId,
      promptObject: { prompt: fullText, webSearch: false },
      metadata: { messageGroup: `${Date.now()}_${Math.random().toString(36).slice(2, 5)}` },
    };

    let upstream;
    try {
      log?.debug?.("1MIN", `stream to conversation ${conversationId}`);
      upstream = await proxyAwareFetch(streamUrl, {
        method: "POST", headers, body: JSON.stringify(streamBody), signal,
      }, proxyOptions);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      return {
        response: errorResponse(502, `1min.ai stream fetch failed: ${err?.message || err}`),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return {
        response: errorResponse(401, "1min.ai: token is invalid or expired."),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return {
        response: errorResponse(upstream.status, `1min.ai stream error: ${errText.slice(0, 300)}`),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }
    if (!upstream.body) {
      return {
        response: errorResponse(502, "1min.ai: empty stream body"),
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }

    const cid = `chatcmpl-1m-${randomUUID().slice(0, 12)}`;
    const created = Math.floor(Date.now() / 1000);

    // Non-streaming: collect all text.
    if (!stream) {
      let content = "";
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          if (signal?.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
        }
      } finally {
        reader.releaseLock();
      }
      const promptTokens = Math.ceil(fullText.length / 4);
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
        url: streamUrl, headers, transformedBody: streamBody,
      };
    }

    // Streaming: 1min.ai returns plain-text chunks (NOT SSE). Translate to OpenAI SSE.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body.getReader();

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
            const text = decoder.decode(value, { stream: true });
            if (text) {
              controller.enqueue(encoder.encode(sseChunk({
                id: cid, object: "chat.completion.chunk", created, model: modelId,
                choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
              })));
            }
          }
        } catch (err) {
          if (!signal?.aborted) {
            controller.error(err);
            return;
          }
        } finally {
          try {
            controller.enqueue(encoder.encode(sseChunk({
              id: cid, object: "chat.completion.chunk", created, model: modelId,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            })));
            controller.enqueue(encoder.encode(SSE_DONE));
            controller.close();
          } catch {
            // Controller already errored or closed
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

export default OneMinExecutor;
