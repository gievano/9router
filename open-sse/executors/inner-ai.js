// InnerAiExecutor — Inner.ai gateway (chatapi.innerai.com).
//
// Distinct from cookie-based web providers: Inner.ai authenticates with a
// token cookie scoped to .innerai.com. The executor resolves the account's
// email + deviceId from the JWT payload (with a best-effort /profile fetch),
// dynamically resolves the live model catalog (cached 1h), and posts a single
// `message` string to the chat API, translating the Inner.ai SSE
// ({"type":"text","item":"chunk"} / end_stream / credits/rate-limit events)
// to OpenAI chat.completion shapes.
//
// Ported from OmniRoute open-sse/executors/inner-ai.ts. Tool/function-calling
// emulation is intentionally skipped (ExtremeRouter web-cookie providers are
// text-only) — plain text chat.
import { createHash, randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";

const CFG = PROVIDERS["inner-ai"];

const INNER_AI_CHAT_URL = "https://chatapi.innerai.com/chat";
const INNER_AI_PROFILE_URL = "https://platformapi.innerai.com/api/v1/users/profile";
const INNER_AI_MODELS_URL = "https://platformapi.innerai.com/api/v1/ai_models";

const INNER_AI_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const MODELS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── In-memory caches (LRU-bounded, keyed by sha256 of the token) ────────────

const CACHE_MAX_ENTRIES = 1000;
const credentialCache = new Map();
const modelsCache = new Map();

function lruTouch(map, key) {
  const value = map.get(key);
  if (value === undefined) return undefined;
  map.delete(key);
  map.set(key, value);
  return value;
}

function lruSet(map, key, value) {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > CACHE_MAX_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

// Cache key derivation — a fast digest is the correct primitive for keying an
// ephemeral, process-local cache (not password-at-rest storage).
function tokenCacheKey(token) {
  return createHash("sha256").update(token).digest("hex");
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Decode JWT payload without verifying signature. */
export function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Parse the credential string.
 * Accepted formats:
 *   "eyJhbG..." — token only (no email)
 *   "eyJhbG... user@example.com" — token + email (recommended)
 *   "token=eyJhbG... user@example.com" — same with token= prefix
 */
export function parseCredential(rawApiKey) {
  const trimmed = rawApiKey.trim();
  const eqIdx = trimmed.indexOf("=");
  const stripped =
    eqIdx > 0 && !trimmed.startsWith("eyJ") ? trimmed.slice(eqIdx + 1).trim() : trimmed;

  const lastSpace = stripped.lastIndexOf(" ");
  if (lastSpace > 0) {
    const possibleEmail = stripped.slice(lastSpace + 1).trim();
    if (possibleEmail.includes("@")) {
      return { token: stripped.slice(0, lastSpace).trim(), credEmail: possibleEmail };
    }
  }
  return { token: stripped, credEmail: "" };
}

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error", code: `HTTP_${status}` } }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

/** Build request headers for Inner.ai API calls. */
function buildHeaders(token, email, deviceId) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": INNER_AI_USER_AGENT,
    Cookie: `token=${token}`,
    "USER-TOKEN": token,
    "DEVICE-ID": deviceId,
    Origin: "https://app.innerai.com",
    Referer: "https://app.innerai.com/",
  };
  if (email) headers["USER-EMAIL"] = email;
  return headers;
}

// ── Credential resolution (email + deviceId from JWT + profile API) ─────────

async function resolveCredentials(token, credEmail, signal) {
  const key = tokenCacheKey(token);
  const cached = lruTouch(credentialCache, key);
  if (cached) return cached;

  const payload = decodeJwtPayload(token);
  const deviceId = String(
    payload?.device_id ?? payload?.deviceId ?? payload?.["device-id"] ?? payload?.did ?? ""
  ).trim();

  const profileHeaders = {
    Cookie: `token=${token}`,
    "USER-TOKEN": token,
    "User-Agent": INNER_AI_USER_AGENT,
    Origin: "https://app.innerai.com",
    Referer: "https://app.innerai.com/",
  };
  if (deviceId) profileHeaders["DEVICE-ID"] = deviceId;

  // Best-effort profile fetch for the account email — non-fatal if it fails.
  let email = "";
  try {
    const profileResp = await fetch(INNER_AI_PROFILE_URL, {
      headers: profileHeaders,
      signal: signal ?? undefined,
    });
    if (profileResp.ok) {
      const body = await profileResp.json().catch(() => null);
      email = String(
        body?.data?.email ??
          body?.user?.email ??
          body?.profile?.email ??
          body?.email ??
          ""
      ).trim();
    }
  } catch {
    // proceed without email
  }

  if (!email && credEmail) email = credEmail;
  if (!email && typeof payload?.sub === "string" && payload.sub.includes("@")) {
    email = payload.sub;
  }

  const creds = { email, deviceId };
  lruSet(credentialCache, key, creds);
  return creds;
}

// ── Model resolution (dynamic fetch + cache) ────────────────────────────────

class InnerAiModelsError extends Error {
  constructor(status, responsePreview) {
    super(`Inner.ai /ai-models returned HTTP ${status}`);
    this.name = "InnerAiModelsError";
    this.status = status;
    this.responsePreview = responsePreview;
  }
}

async function resolveModels(token, deviceId, email, signal) {
  const key = tokenCacheKey(token);
  const cached = lruTouch(modelsCache, key);
  if (cached && Date.now() < cached.expiresAt) return cached.models;

  const resp = await fetch(INNER_AI_MODELS_URL, {
    headers: buildHeaders(token, email, deviceId),
    signal: signal ?? undefined,
  });

  if (!resp || !resp.ok) {
    const bodyPreview = await resp?.text().catch(() => "") ?? "";
    if (resp?.status === 401 || resp?.status === 403) {
      credentialCache.delete(tokenCacheKey(token));
    }
    throw new InnerAiModelsError(resp?.status ?? 502, bodyPreview.slice(0, 200));
  }

  const body = await resp.json().catch(() => null);
  let raw = [];
  if (Array.isArray(body)) raw = body;
  else if (Array.isArray(body?.data)) raw = body.data;
  else if (Array.isArray(body?.ai_models)) raw = body.ai_models;

  // Resolve user plan tier from the JWT to gate pro_only / ultra_only models.
  const planRaw = String(
    decodeJwtPayload(token)?.plan ??
      decodeJwtPayload(token)?.tier ??
      decodeJwtPayload(token)?.subscription ??
      ""
  ).toLowerCase();
  const isUltra = planRaw.includes("ultra") || planRaw.includes("enterprise");
  const isPro = isUltra || planRaw.includes("pro") || planRaw.includes("plus");

  const nonTextPattern =
    /image|video|audio|img|vid|sound|music|voice|tts|stt|track|clip|avatar|cartoon|flux|stable.diff|recraft|ideogram|leonardo|magnific|bria|seedream|luma|kling|pika|veo|wan-|heygen|did-|vidu|pixverse|sora-|gen-[0-9]|playground|gemini-fal|gamma|lyria|clothes|whisper/i;
  const models = raw.filter((m) => {
    if (m.enable === false || m.unavailable_api) return false;
    if (m.ultra_only && !isUltra) return false;
    if (m.pro_only && !isPro) return false;
    const cats = Array.isArray(m.ai_model_categories) ? m.ai_model_categories : null;
    if (cats && cats.length > 0) {
      return cats.some((c) => String(c.unique_identifier ?? c.name ?? "").toLowerCase() === "text");
    }
    return !nonTextPattern.test(m.llm_model);
  });

  lruSet(modelsCache, key, { models, expiresAt: Date.now() + MODELS_CACHE_TTL_MS });
  return models;
}

/**
 * Live model discovery for the models route. Resolves the account email +
 * deviceId (cached) and fetches the plan-gated catalog from /ai_models
 * (cached 1h inside resolveModels). Maps raw entries to OpenAI-style rows.
 * Throws on auth failure / hard errors so the route can fall back to the
 * seed catalog.
 */
export async function discoverInnerAiModels({ token, signal }) {
  const { token: cleanToken, credEmail } = parseCredential(String(token || ""));
  if (!cleanToken) throw new Error("Missing Inner.ai token cookie");
  const { email, deviceId } = await resolveCredentials(cleanToken, credEmail, signal);
  const models = await resolveModels(cleanToken, deviceId, email, signal);
  if (!models.length) throw new Error("Inner.ai /ai-models returned an empty catalog");
  return {
    models: models.map((m) => {
      const id = String(m.llm_model ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(m.display_name ?? m.name ?? "").trim() || id,
        ...(m.pro_only || m.ultra_only ? { planGated: true } : {}),
      };
    }).filter(Boolean),
  };
}

/**
 * Find the Inner.ai model entry matching the requested model ID.
 * Matching strategy (first match wins): exact llm_model, case-insensitive,
 * then contains. Returns null when nothing matches — the caller then builds a
 * synthetic entry carrying the *requested* model name so the request is sent
 * for the model the user actually asked for.
 */
export function findModel(models, requestedId) {
  if (models.length === 0) return null;
  const lower = requestedId.toLowerCase();
  return (
    models.find((m) => m.llm_model === requestedId) ??
    models.find((m) => m.llm_model.toLowerCase() === lower) ??
    models.find((m) => m.llm_model.toLowerCase().includes(lower)) ??
    null
  );
}

// ── Message building ─────────────────────────────────────────────────────────

/** Convert an OpenAI messages array to Inner.ai's single message string. */
export function buildMessageContent(messages) {
  const parts = [];

  for (const msg of messages) {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content
              .filter((c) => c?.type === "text")
              .map((c) => String(c.text ?? ""))
              .join("")
          : "";
    if (!content.trim()) continue;

    if (msg.role === "system") {
      parts.push(`[Instructions]\n${content}`);
    } else if (msg.role === "assistant") {
      parts.push(`[Assistant]\n${content}`);
    } else {
      parts.push(content);
    }
  }

  return parts.join("\n\n");
}

// ── SSE transformation ───────────────────────────────────────────────────────

/**
 * Transform Inner.ai SSE to OpenAI-compatible SSE.
 * Inner.ai format: `data: {"type":"text","item":"chunk"}`, `data: {"type":"end_stream",...}`
 * Error event types: missing_credits, reached_limit, rate_limit_reached, rate_limit_longer_reached
 * Ignored event types: status
 */
export function transformInnerAiSSE(upstream, model) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created = Math.floor(Date.now() / 1000);
  let buffer = "";
  let emittedRole = false;

  const chunkEvent = (delta, finishReason) =>
    sseChunk({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: finishReason ?? null }],
    });

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            let data;
            try {
              data = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            const type = String(data.type ?? "");
            const item = String(data.item ?? "");

            if (type === "text") {
              if (!item) continue;
              if (!emittedRole) {
                emittedRole = true;
                controller.enqueue(encoder.encode(chunkEvent({ role: "assistant", content: "" })));
              }
              controller.enqueue(encoder.encode(chunkEvent({ content: item })));
            } else if (type === "end_stream") {
              if (!emittedRole) {
                emittedRole = true;
                controller.enqueue(encoder.encode(chunkEvent({ role: "assistant", content: "" })));
              }
              controller.enqueue(encoder.encode(chunkEvent({}, "stop")));
              controller.enqueue(encoder.encode(SSE_DONE));
              controller.close();
              return;
            } else if (ERROR_EVENTS.has(type)) {
              const errorMsg =
                type === "missing_credits"
                  ? "Inner.ai: not enough credits"
                  : type === "reached_limit"
                    ? "Inner.ai: usage limit reached"
                    : "Inner.ai: rate limit reached — try again later";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    error: { message: errorMsg, type: "rate_limit_error", code: type },
                  })}\n\n`
                )
              );
              controller.enqueue(encoder.encode(SSE_DONE));
              controller.close();
              return;
            }
            // type === "status" → ignore
          }
        }

        // Flush any remaining partial line (upstream may end without a newline).
        // Append (not assign): the decoder flush may be empty — the buffered
        // line was already decoded via stream:true and must be preserved.
        if (buffer) {
          buffer += decoder.decode();
          const line = buffer.trim();
          if (line.startsWith("data:")) {
            const jsonStr = line.slice(5).trim();
            if (jsonStr && jsonStr !== "[DONE]") {
              try {
                const data = JSON.parse(jsonStr);
                const type = String(data.type ?? "");
                const item = String(data.item ?? "");
                if (type === "text") {
                  if (item) {
                    if (!emittedRole) {
                      emittedRole = true;
                      controller.enqueue(encoder.encode(chunkEvent({ role: "assistant", content: "" })));
                    }
                    controller.enqueue(encoder.encode(chunkEvent({ content: item })));
                  }
                } else if (type === "end_stream") {
                  if (!emittedRole) {
                    emittedRole = true;
                    controller.enqueue(encoder.encode(chunkEvent({ role: "assistant", content: "" })));
                  }
                  controller.enqueue(encoder.encode(chunkEvent({}, "stop")));
                  controller.enqueue(encoder.encode(SSE_DONE));
                  controller.close();
                  return;
                } else if (ERROR_EVENTS.has(type)) {
                  const errorMsg =
                    type === "missing_credits"
                      ? "Inner.ai: not enough credits"
                      : type === "reached_limit"
                        ? "Inner.ai: usage limit reached"
                        : "Inner.ai: rate limit reached — try again later";
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        error: { message: errorMsg, type: "rate_limit_error", code: type },
                      })}\n\n`
                    )
                  );
                  controller.enqueue(encoder.encode(SSE_DONE));
                  controller.close();
                  return;
                }
              } catch {
                /* malformed final line — ignore */
              }
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err || "Stream error");
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: { message, type: "upstream_error" },
            })}\n\n`
          )
        );
      }

      // Stream ended without explicit end_stream
      if (!emittedRole) {
        controller.enqueue(encoder.encode(chunkEvent({ role: "assistant", content: "" })));
      }
      controller.enqueue(encoder.encode(chunkEvent({}, "stop")));
      controller.enqueue(encoder.encode(SSE_DONE));
      controller.close();
    },
  });
}

// Shared by transformInnerAiSSE + collectContent
const ERROR_EVENTS = new Set([
  "missing_credits",
  "reached_limit",
  "rate_limit_reached",
  "rate_limit_longer_reached",
]);

class InnerAiStreamError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "InnerAiStreamError";
    this.status = status;
    this.code = code;
  }
}

/** Collect Inner.ai SSE into a single content string (non-streaming path). */
export async function collectContent(upstream) {
  const decoder = new TextDecoder();
  const reader = upstream.getReader();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      let data;
      try {
        data = JSON.parse(jsonStr);
      } catch {
        continue;
      }

      const type = data.type;
      if (type === "text" && typeof data.item === "string") {
        content += data.item;
        continue;
      }
      if (ERROR_EVENTS.has(type)) {
        const errorMsg =
          type === "missing_credits"
            ? "Inner.ai: not enough credits"
            : type === "reached_limit"
              ? "Inner.ai: usage limit reached"
              : "Inner.ai: rate limit reached — try again later";
        throw new InnerAiStreamError(429, String(type), errorMsg);
      }
    }
  }

  // Flush any remaining partial line (upstream may end without a newline).
  // Append (not assign): the decoder flush may be empty — the buffered
  // line was already decoded via stream:true and must be preserved.
  if (buffer) {
    buffer += decoder.decode();
    const line = buffer.trim();
    if (line.startsWith("data:")) {
      const jsonStr = line.slice(5).trim();
      if (jsonStr && jsonStr !== "[DONE]") {
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === "text" && typeof data.item === "string") {
            content += data.item;
          } else if (ERROR_EVENTS.has(data.type)) {
            const errorMsg =
              data.type === "missing_credits"
                ? "Inner.ai: not enough credits"
                : data.type === "reached_limit"
                  ? "Inner.ai: usage limit reached"
                  : "Inner.ai: rate limit reached — try again later";
            throw new InnerAiStreamError(429, String(data.type), errorMsg);
          }
        } catch (err) {
          // Never swallow the mapped rate-limit/credit error on the final line.
          if (err instanceof InnerAiStreamError) throw err;
          /* malformed final line — ignore */
        }
      }
    }
  }
  return content;
}

// ── Executor ────────────────────────────────────────────────────────────────

export class InnerAiExecutor extends BaseExecutor {
  constructor() {
    super("inner-ai", CFG);
  }

  async execute({ model, body, credentials, signal, stream: wantStream, log }) {
    const bodyObj = body || {};

    const rawToken = String(credentials?.apiKey ?? "").trim();
    if (!rawToken) {
      return {
        response: errorResponse(
          401,
          "Missing Inner.ai token — paste your token cookie from DevTools → Application → Cookies → .innerai.com"
        ),
        url: INNER_AI_CHAT_URL,
        headers: {},
        transformedBody: body,
      };
    }
    const { token, credEmail } = parseCredential(rawToken);

    let creds;
    try {
      creds = await resolveCredentials(token, credEmail, signal);
    } catch (err) {
      credentialCache.delete(tokenCacheKey(token));
      return {
        response: errorResponse(
          401,
          err instanceof Error ? err.message : "Failed to authenticate with Inner.ai"
        ),
        url: INNER_AI_CHAT_URL,
        headers: {},
        transformedBody: body,
      };
    }
    const { email, deviceId } = creds;

    const requestedModel = String(bodyObj.model ?? model ?? "").trim() || "gpt-4o";
    let models = [];
    try {
      models = await resolveModels(token, deviceId, email, signal);
    } catch (err) {
      if (err instanceof InnerAiModelsError && (err.status === 401 || err.status === 403)) {
        return {
          response: errorResponse(
            err.status,
            "Inner.ai /ai-models authentication failed — re-paste your token cookie"
          ),
          url: INNER_AI_CHAT_URL,
          headers: {},
          transformedBody: body,
        };
      }
      log?.warn?.(
        "INNER-AI",
        `/ai-models fetch failed (status=${err instanceof InnerAiModelsError ? err.status : "n/a"}) — falling back to synthetic model entry`
      );
    }

    const modelEntry = findModel(models, requestedModel) ?? {
      id: "",
      llm_model: requestedModel,
    };

    const rawMessages = Array.isArray(bodyObj.messages) ? bodyObj.messages : [];
    const messages = rawMessages.filter(
      (m) => m.role !== "tool" && m.role !== "function" && m.tool_calls === undefined
    );
    const messageContent = buildMessageContent(messages);
    if (!messageContent.trim()) {
      return {
        response: errorResponse(400, "No message content to send"),
        url: INNER_AI_CHAT_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const innerAiBody = {
      message: messageContent,
      session_id: randomUUID(),
      context_type: "no_context",
      ai_model: {
        id: modelEntry?.id || undefined,
        llm_model: modelEntry?.llm_model ?? requestedModel,
      },
      is_extension: false,
      env: "production",
      temporary: true,
      use_web_search: false,
      knowledge_list: [],
    };

    const reqHeaders = buildHeaders(token, email, deviceId);

    let upstream;
    try {
      upstream = await fetch(INNER_AI_CHAT_URL, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(innerAiBody),
        signal: signal ?? undefined,
      });
    } catch (err) {
      return {
        response: errorResponse(
          502,
          `Inner.ai request failed: ${err instanceof Error ? err.message : "unknown"}`
        ),
        url: INNER_AI_CHAT_URL,
        headers: reqHeaders,
        transformedBody: innerAiBody,
      };
    }

    if (!upstream) {
      return {
        response: errorResponse(502, "Inner.ai returned no response"),
        url: INNER_AI_CHAT_URL,
        headers: reqHeaders,
        transformedBody: innerAiBody,
      };
    }

    if (upstream.status === 401 || upstream.status === 403) {
      credentialCache.delete(tokenCacheKey(token));
      return {
        response: errorResponse(
          upstream.status,
          "Inner.ai authentication failed — re-paste your token cookie"
        ),
        url: INNER_AI_CHAT_URL,
        headers: reqHeaders,
        transformedBody: innerAiBody,
      };
    }

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      return {
        response: errorResponse(
          upstream.status,
          `Inner.ai returned HTTP ${upstream.status}: ${errText.slice(0, 200)}`
        ),
        url: INNER_AI_CHAT_URL,
        headers: reqHeaders,
        transformedBody: innerAiBody,
      };
    }

    if (!upstream.body) {
      return {
        response: errorResponse(502, "Inner.ai returned an empty response"),
        url: INNER_AI_CHAT_URL,
        headers: reqHeaders,
        transformedBody: innerAiBody,
      };
    }

    const resolvedModel = modelEntry?.llm_model ?? requestedModel;

    if (wantStream !== false) {
      return {
        response: new Response(transformInnerAiSSE(upstream.body, resolvedModel), {
          headers: { ...SSE_HEADERS_NO_BUFFER },
        }),
        url: INNER_AI_CHAT_URL,
        headers: reqHeaders,
        transformedBody: innerAiBody,
      };
    }

    let content;
    try {
      content = await collectContent(upstream.body);
    } catch (err) {
      if (err instanceof InnerAiStreamError) {
        return {
          response: errorResponse(err.status, err.message),
          url: INNER_AI_CHAT_URL,
          headers: reqHeaders,
          transformedBody: innerAiBody,
        };
      }
      throw err;
    }
    const completionId = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      response: new Response(
        JSON.stringify({
          id: completionId,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: resolvedModel,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
        { headers: { "Content-Type": "application/json" } }
      ),
      url: INNER_AI_CHAT_URL,
      headers: reqHeaders,
      transformedBody: innerAiBody,
    };
  }
}

export default InnerAiExecutor;
