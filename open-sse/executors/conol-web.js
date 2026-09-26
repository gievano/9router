/**
 * ConolWebExecutor — conol.ai browser-session chat (Unofficial/Experimental).
 *
 * Protocol verified against the web client on 2026-07-30:
 *   - POST /api/assets for raw image uploads
 *   - POST /api/sessions to create a session
 *   - POST /api/sessions/{id}/model to pin preset, then model, then effort
 *   - POST /api/sessions/{id}/messages to submit a turn
 *   - GET /api/sessions/{id}/messages?logDeltas=1 for cumulative NDJSON updates
 *   - Cookie authentication via __Secure-better-auth.session_token
 *
 * Session creation ignores agentModel/agentEffort and answers with
 * `modelDowngraded: true` on the account default, so the session is always
 * created empty and configured via /model before the first turn is submitted.
 *
 * Ported from OmniRoute open-sse/executors/conol-web.ts. Uses plain `fetch`
 * (not proxyAwareFetch) — consistent with the other web-cookie executors and
 * unit-testable. `clientHeaders` is optional: ExtremeRouter doesn't currently
 * pass request headers into execute, so session reuse falls back to the
 * body-based keys (conversation_id / session_id / metadata).
 */
import { createHash } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { resolveConolCredentials } from "../services/conolAuth.js";
import { resolveConolModelSelection } from "../services/conolModels.js";
import { applyConolSessionModel, buildConolSessionModelPlan } from "../services/conolSessionModel.js";
import { ConolImageError, extractImageUrls, resolveConolImages } from "../services/conolImages.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";

const CFG = PROVIDERS["conol-web"];

const CONOL_ORIGIN = "https://conol.ai";
const CONOL_SESSION_URL = `${CONOL_ORIGIN}/api/sessions`;
const CONOL_REQUEST_TIMEOUT_MS = 300_000;
const CONOL_MAX_STREAM_BYTES = 16 * 1024 * 1024;
const CONOL_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const CONOL_MAX_SESSION_BINDINGS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

const conolSessionBindings = new Map();
const conolSessionLocks = new Map();

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value !== "object") return "";
  const record = value;
  const type = readString(record.type).toLowerCase();
  if (type === "image_url" || type === "input_image" || type === "image") return "";
  return (
    readString(record.text) ||
    (typeof record.content === "string" ? record.content : extractText(record.content)) ||
    extractText(record.output) ||
    extractText(record.result)
  );
}

function extractUserText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => extractUserText(item))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value !== "object") return "";

  const record = value;
  const type = readString(record.type).toLowerCase();
  if (type === "text" || type === "input_text" || type === "output_text") {
    return readString(record.text) || readString(record.content);
  }
  if (type) {
    // Conol owns the agent loop. Do not flatten tool calls/results, images, or
    // other agentic protocol blocks into the user's text prompt.
    return "";
  }
  return readString(record.text) || extractUserText(record.content);
}

function stripGeneratedImageMarkers(value) {
  return value
    .replace(/^\s*\[Image\s+\d+\]:\s*\(unavailable\)\s*$/gim, "")
    .replace(/^\s*\[Image:\s*source:\s*[^\]\r\n]+\]\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildConolUserTurn(messages) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => readString(message.role).toLowerCase() === "user");
  if (!latestUserMessage) return { text: "", imageUrls: [] };

  return {
    text: stripGeneratedImageMarkers(extractUserText(latestUserMessage.content)),
    imageUrls: extractImageUrls(latestUserMessage.content),
  };
}

export function buildConolPromptText(messages) {
  return buildConolUserTurn(messages).text;
}

function readHeader(headers, name) {
  if (!headers) return "";
  const direct = readString(headers[name]);
  if (direct) return direct;
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedName) return readString(value);
  }
  return "";
}

function readMetadataSessionId(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const record = metadata;
  const direct = readString(record.session_id) || readString(record.sessionId);
  if (direct) return direct;

  const userId = record.user_id;
  if (userId && typeof userId === "object" && !Array.isArray(userId)) {
    return readString(userId.session_id);
  }
  if (typeof userId !== "string" || userId.length > 4096) return "";
  try {
    const parsed = JSON.parse(userId);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? readString(parsed.session_id)
      : "";
  } catch {
    return "";
  }
}

function hashKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function resolveConolClientSessionKey(body, clientHeaders) {
  const candidates = [
    readHeader(clientHeaders, "x-claude-code-session-id"),
    readHeader(clientHeaders, "x-codex-session-id"),
    readHeader(clientHeaders, "x-session-id"),
    readHeader(clientHeaders, "x_session_id"),
    readHeader(clientHeaders, "session-id"),
    readHeader(clientHeaders, "session_id"),
    readHeader(clientHeaders, "x-omniroute-session-id"),
    readHeader(clientHeaders, "x-omniroute-session"),
    readMetadataSessionId(body.metadata),
    readString(body.conversation_id),
    readString(body.conversationId),
    readString(body.session_id),
    readString(body.sessionId),
    readString(body.prompt_cache_key),
    readString(body.promptCacheKey),
  ];
  const candidate = candidates.find((value) => value.length > 0 && value.length <= 4096);
  return candidate ? hashKey(candidate) : null;
}

function sweepConolSessionBindings(now = Date.now()) {
  for (const [key, binding] of conolSessionBindings) {
    if (now - binding.lastUsedAt > CONOL_SESSION_TTL_MS) {
      conolSessionBindings.delete(key);
    }
  }
  while (conolSessionBindings.size > CONOL_MAX_SESSION_BINDINGS) {
    let oldestKey = "";
    let oldestTime = Number.POSITIVE_INFINITY;
    for (const [key, binding] of conolSessionBindings) {
      if (binding.lastUsedAt < oldestTime) {
        oldestKey = key;
        oldestTime = binding.lastUsedAt;
      }
    }
    if (!oldestKey) break;
    conolSessionBindings.delete(oldestKey);
  }
}

function getConolSessionBinding(key) {
  sweepConolSessionBindings();
  const binding = conolSessionBindings.get(key);
  if (!binding) return null;
  binding.lastUsedAt = Date.now();
  return binding;
}

function setConolSessionBinding(key, binding) {
  conolSessionBindings.set(key, { ...binding, lastUsedAt: Date.now() });
  sweepConolSessionBindings();
}

/**
 * Model/effort are deliberately excluded: switching models must re-pin the
 * existing Conol session (POST /model) rather than stranding it and losing the
 * conversation history.
 */
function buildConolSessionBindingKey(input, cookie, clientSessionKey) {
  const accountKey = input.credentials?.connectionId
    ? `connection:${hashKey(input.credentials.connectionId)}`
    : `cookie:${hashKey(cookie)}`;
  return hashKey(`${accountKey}:${clientSessionKey}`);
}

async function withConolSessionLock(key, operation) {
  if (!key) return operation();

  const previous = conolSessionLocks.get(key) ?? Promise.resolve();
  let releaseCurrent;
  const currentGate = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const current = previous.catch(() => undefined).then(() => currentGate);
  conolSessionLocks.set(key, current);
  await previous.catch(() => undefined);

  try {
    return await operation();
  } finally {
    releaseCurrent();
    if (conolSessionLocks.get(key) === current) {
      conolSessionLocks.delete(key);
    }
  }
}

export function clearConolSessionBindingsForTests() {
  conolSessionBindings.clear();
  conolSessionLocks.clear();
}

/** True when this turn continues a session we created on an earlier request. */
function reusedSessionCandidate(cachedBinding, sessionId) {
  return !!cachedBinding && cachedBinding.upstreamSessionId === sessionId;
}

function messageText(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const message = value;
  if (readString(message.role).toLowerCase() !== "assistant") return "";
  return extractText(message.content).trim();
}

function stageAssistantText(stages, field) {
  if (!Array.isArray(stages)) return "";
  let result = "";
  for (const stage of stages) {
    if (!stage || typeof stage !== "object" || Array.isArray(stage)) continue;
    const entries = stage[field];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const text = messageText(entry);
      if (text) result = text;
    }
  }
  return result;
}

function parseEventLine(originalLine) {
  let line = originalLine.trim();
  if (!line || line.startsWith(":") || line.startsWith("event:")) return null;
  if (line.startsWith("data:")) line = line.slice(5).trim();
  if (line.startsWith("message\t")) line = line.slice("message\t".length);
  if (!line) return null;
  if (line === "[DONE]") return { type: "done" };
  try {
    return JSON.parse(line);
  } catch {
    // Ignore non-JSON keepalive and timestamp lines.
    return null;
  }
}

function isDoneEvent(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    readString(value.type) === "done"
  );
}

function parseEventLines(raw) {
  const events = [];
  for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
    const event = parseEventLine(line);
    if (event) events.push(event);
  }
  return events;
}

/**
 * Conol emits a terminal `done` event but keeps the HTTP stream open. Reading
 * `response.text()` therefore waits until the request timeout even though the
 * assistant answer is already complete. Consume complete lines and cancel the
 * reader as soon as `done` arrives.
 */
export async function collectConolMessageStream(response) {
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const lines = [];
  let pending = "";
  let totalBytes = 0;
  let doneEventReceived = false;

  try {
    while (!doneEventReceived) {
      const chunk = await reader.read();
      if (chunk.done) {
        pending += decoder.decode();
        break;
      }

      totalBytes += chunk.value.byteLength;
      if (totalBytes > CONOL_MAX_STREAM_BYTES) {
        throw new Error("Conol message stream exceeded the safety limit");
      }
      pending += decoder.decode(chunk.value, { stream: true });
      const completeLines = pending.split(/\r?\n/);
      pending = completeLines.pop() ?? "";
      for (const line of completeLines) {
        lines.push(line);
        if (isDoneEvent(parseEventLine(line))) {
          doneEventReceived = true;
          break;
        }
      }
    }

    if (!doneEventReceived && pending) lines.push(pending);
  } finally {
    if (doneEventReceived) {
      try {
        await reader.cancel();
      } catch {
        // The upstream may close at the same instant as its done event.
      }
    } else {
      reader.releaseLock();
    }
  }

  return lines.join("\n");
}

export function parseConolMessageStream(raw) {
  let finalizedText = "";
  let previewText = "";
  let streamedText = "";
  let usedTokens = null;
  let contextWindow = null;
  let modelId = "";
  let done = false;

  for (const value of parseEventLines(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const event = value;
    const type = readString(event.type);
    if (type === "done") {
      done = true;
      continue;
    }

    const finalCandidate = stageAssistantText(event.stages, "logs");
    const previewCandidate = stageAssistantText(event.stages, "preview");
    if (finalCandidate) finalizedText = finalCandidate;
    if (previewCandidate) previewText = previewCandidate;

    if (type === "assistant") {
      const direct = extractText(event.content ?? event.message ?? event.text).trim();
      if (direct) finalizedText = direct;
    } else if (type === "stream_event") {
      const delta = extractText(event.delta ?? event.content ?? event.text);
      if (delta) streamedText += delta;
    }

    const context =
      event.contextUsage &&
      typeof event.contextUsage === "object" &&
      !Array.isArray(event.contextUsage)
        ? event.contextUsage
        : null;
    if (context) {
      const used = Number(context.usedTokens);
      const window = Number(context.contextWindow);
      if (Number.isFinite(used)) usedTokens = used;
      if (Number.isFinite(window)) contextWindow = window;
      modelId = readString(context.modelId) || modelId;
    }
  }

  return {
    text: finalizedText || previewText || streamedText,
    usedTokens,
    contextWindow,
    modelId,
    done,
  };
}

function conolHeaders(cookie, extra, sessionId) {
  return {
    accept: "application/json",
    "accept-language": "en-US,en;q=0.9",
    cookie,
    origin: CONOL_ORIGIN,
    referer: sessionId
      ? `${CONOL_ORIGIN}/home?chat_session=${encodeURIComponent(sessionId)}`
      : `${CONOL_ORIGIN}/home`,
    "user-agent": USER_AGENT,
    ...extra,
  };
}

function safeTimezone(value) {
  const explicit = readString(value);
  if (/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)*$/.test(explicit)) return explicit;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

async function uploadConolImages(cookie, imageUrls, signal, sessionId) {
  const images = await resolveConolImages(imageUrls);
  const parts = [];
  for (const image of images) {
    const response = await fetch(`${CONOL_ORIGIN}/api/assets`, {
      method: "POST",
      headers: conolHeaders(
        cookie,
        {
          accept: "application/json",
          "content-type": image.mimeType,
        },
        sessionId
      ),
      body: new Uint8Array(image.data),
      signal: signal ?? undefined,
    });
    if (!response.ok) {
      throw new Error(`Conol image upload failed (HTTP ${response.status})`);
    }
    const payload = await response.json();
    const id = readString(payload.id);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      throw new Error("Conol image upload returned an invalid asset ID");
    }
    parts.push({
      type: "image",
      content: `/api/assets/${id}`,
      mediaType: readString(payload.mediaType) || image.mimeType,
    });
  }
  return parts;
}

function estimateTokens(text) {
  return Math.max(0, Math.ceil(text.length / 4));
}

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error", code: `HTTP_${status}` } }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function makeErrorResult(status, message, extra, url) {
  return {
    response: errorResponse(status, message),
    url: url ?? CONOL_SESSION_URL,
    headers: {},
    transformedBody: extra ?? {},
  };
}

function completionResponse(text, model, sessionId, prompt) {
  const promptTokens = estimateTokens(prompt);
  const completionTokens = estimateTokens(text);
  return new Response(
    JSON.stringify({
      id: `chatcmpl-conol-${sessionId}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

function streamResponse(text, model, sessionId) {
  const encoder = new TextEncoder();
  const id = `chatcmpl-conol-${sessionId}`;
  const created = Math.floor(Date.now() / 1000);
  const readable = new ReadableStream({
    start(controller) {
      const chunks = [
        {
          id,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }],
        },
        {
          id,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        },
      ];
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(readable, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

export class ConolWebExecutor extends BaseExecutor {
  constructor() {
    super("conol-web", CFG);
  }

  async execute(input) {
    const requestBody = (input.body || {}) || {};
    const messages = Array.isArray(requestBody.messages) ? requestBody.messages : [];
    const userTurn = buildConolUserTurn(messages);
    const prompt = userTurn.text;
    const imageUrls = userTurn.imageUrls;
    if (!prompt && imageUrls.length === 0) {
      return makeErrorResult(400, "No user message found", { model: input.model });
    }

    const { cookie } = resolveConolCredentials(input.credentials);
    if (!cookie) {
      return makeErrorResult(
        401,
        "Missing Conol session cookie — sign in with the browser or paste the Cookie header",
        { model: input.model }
      );
    }

    const { model, effort, effortExplicit } = resolveConolModelSelection(
      input.model || requestBody.model
    );
    const clientSessionKey = resolveConolClientSessionKey(requestBody, input.clientHeaders);
    const sessionBindingKey = clientSessionKey
      ? buildConolSessionBindingKey(input, cookie, clientSessionKey)
      : null;
    const timeoutSignal = AbortSignal.timeout(CONOL_REQUEST_TIMEOUT_MS);
    const upstreamSignal = input.signal ? AbortSignal.any([input.signal, timeoutSignal]) : timeoutSignal;
    try {
      return await withConolSessionLock(sessionBindingKey, async () => {
        if (upstreamSignal.aborted) {
          throw upstreamSignal.reason ?? new DOMException("Aborted", "AbortError");
        }

        const cachedBinding = sessionBindingKey ? getConolSessionBinding(sessionBindingKey) : null;
        let sessionId = cachedBinding?.upstreamSessionId || "";
        let reusedSession = false;
        let presetApplied = cachedBinding?.presetApplied ?? false;
        let appliedModel = cachedBinding?.appliedModel ?? "";
        let appliedEffort = cachedBinding?.appliedEffort ?? null;
        const imageParts = await uploadConolImages(
          cookie,
          imageUrls,
          upstreamSignal,
          sessionId || undefined
        );
        const parts = [...imageParts];
        if (prompt) parts.push({ type: "text", content: prompt });
        const timezone = safeTimezone(requestBody.timezone);
        // Sticky: once a session has carried an image, Conol keeps treating it as
        // multimodal, which drives preset text/multimodal model resolution.
        const hasImageHistory = (cachedBinding?.hasImageHistory ?? false) || imageParts.length > 0;

        // Conol ignores agentModel/agentEffort on session creation, so create the
        // session empty and configure it before any turn is submitted. Otherwise the
        // very first turn silently runs on the downgraded account default.
        if (!sessionId) {
          const createResponse = await fetch(CONOL_SESSION_URL, {
            method: "POST",
            headers: conolHeaders(cookie, { "content-type": "application/json" }),
            body: JSON.stringify({ source: { type: "home" }, messages: [], timezone }),
            signal: upstreamSignal,
          });
          if (createResponse.status === 401 || createResponse.status === 403) {
            return makeErrorResult(
              createResponse.status,
              "Conol session expired or is invalid — sign in again",
              { model }
            );
          }
          if (!createResponse.ok) {
            return makeErrorResult(
              createResponse.status,
              `Conol session creation failed (HTTP ${createResponse.status})`,
              { model }
            );
          }

          const created = await createResponse.json();
          sessionId = readString(created.sessionId);
          if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) {
            return makeErrorResult(502, "Conol returned an invalid session identifier", { model });
          }
          presetApplied = false;
          appliedModel = "";
          appliedEffort = null;
        }

        const plan = buildConolSessionModelPlan({ model, effort, hasImageHistory });
        const desiredEffort = plan.effort?.agentEffort ?? null;
        // Re-pin only on a real change: a new session, a model switch, or an
        // effort switch. Steady-state follow-ups cost no extra round trips.
        const needsModelUpdate =
          !presetApplied || appliedModel !== model || appliedEffort !== desiredEffort;
        if (needsModelUpdate) {
          const configured = await applyConolSessionModel({
            sessionId,
            plan,
            skipPreset: presetApplied,
            buildHeaders: (id) => conolHeaders(cookie, undefined, id),
            signal: upstreamSignal,
            onWarning: (message) => input.log?.warn?.("conol-web", message),
          });
          presetApplied = presetApplied || configured.presetApplied;
          if (configured.modelApplied) {
            appliedModel = model;
            appliedEffort = configured.effortApplied;
          }
        }

        if (reusedSessionCandidate(cachedBinding, sessionId)) {
          const followUpUrl = `${CONOL_SESSION_URL}/${sessionId}/messages`;
          const followUpResponse = await fetch(followUpUrl, {
            method: "POST",
            headers: conolHeaders(cookie, { "content-type": "application/json" }, sessionId),
            body: JSON.stringify({ messages: parts, timezone }),
            signal: upstreamSignal,
          });
          if (followUpResponse.status === 401 || followUpResponse.status === 403) {
            return makeErrorResult(
              followUpResponse.status,
              "Conol session expired or is invalid — sign in again",
              { model, sessionId },
              followUpUrl
            );
          }
          if (followUpResponse.status === 404 || followUpResponse.status === 410) {
            if (sessionBindingKey) conolSessionBindings.delete(sessionBindingKey);
            return makeErrorResult(
              followUpResponse.status,
              "Conol session no longer exists — retry to start a new session",
              { model, sessionId },
              followUpUrl
            );
          }
          if (!followUpResponse.ok) {
            return makeErrorResult(
              followUpResponse.status,
              `Conol follow-up submission failed (HTTP ${followUpResponse.status})`,
              { model, sessionId },
              followUpUrl
            );
          }
          reusedSession = true;
          await followUpResponse.body?.cancel().catch(() => undefined);
        } else {
          const firstTurnUrl = `${CONOL_SESSION_URL}/${sessionId}/messages`;
          const firstTurnResponse = await fetch(firstTurnUrl, {
            method: "POST",
            headers: conolHeaders(cookie, { "content-type": "application/json" }, sessionId),
            body: JSON.stringify({ messages: parts, timezone }),
            signal: upstreamSignal,
          });
          if (firstTurnResponse.status === 401 || firstTurnResponse.status === 403) {
            return makeErrorResult(
              firstTurnResponse.status,
              "Conol session expired or is invalid — sign in again",
              { model },
              firstTurnUrl
            );
          }
          if (!firstTurnResponse.ok) {
            return makeErrorResult(
              firstTurnResponse.status,
              `Conol message submission failed (HTTP ${firstTurnResponse.status})`,
              { model, sessionId },
              firstTurnUrl
            );
          }
          await firstTurnResponse.body?.cancel().catch(() => undefined);
        }

        if (sessionBindingKey) {
          setConolSessionBinding(sessionBindingKey, {
            upstreamSessionId: sessionId,
            presetApplied,
            appliedModel,
            appliedEffort,
            hasImageHistory,
          });
        }

        const messagesUrl = `${CONOL_SESSION_URL}/${sessionId}/messages?logDeltas=1`;
        const messageResponse = await fetch(messagesUrl, {
          method: "GET",
          headers: conolHeaders(
            cookie,
            { accept: "text/event-stream, application/x-ndjson" },
            sessionId
          ),
          signal: upstreamSignal,
        });
        if (!messageResponse.ok) {
          if (
            sessionBindingKey &&
            (messageResponse.status === 404 || messageResponse.status === 410)
          ) {
            conolSessionBindings.delete(sessionBindingKey);
          }
          return makeErrorResult(
            messageResponse.status,
            `Conol message stream failed (HTTP ${messageResponse.status})`,
            { model, sessionId },
            messagesUrl
          );
        }

        const parsed = parseConolMessageStream(await collectConolMessageStream(messageResponse));
        if (!parsed.text) {
          return makeErrorResult(502, "Conol returned no assistant response", { model, sessionId }, messagesUrl);
        }
        const response = input.stream
          ? streamResponse(parsed.text, model, sessionId)
          : completionResponse(parsed.text, model, sessionId, prompt);

        return {
          response,
          url: messagesUrl,
          headers: { cookie: "***" },
          transformedBody: {
            model,
            ...(appliedEffort ? { effort: appliedEffort } : {}),
            effortRequested: effort,
            effortExplicit,
            sessionId,
            reusedSession,
            clientSessionBound: sessionBindingKey !== null,
            imageCount: imageParts.length,
          },
        };
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      const status = error instanceof ConolImageError ? error.status : isTimeout ? 504 : 502;
      const message =
        error instanceof ConolImageError
          ? error.message
          : isTimeout
            ? "Conol request timed out"
            : error instanceof Error && error.name === "AbortError"
              ? "Conol request was cancelled"
              : "Conol request failed";
      return makeErrorResult(status, message, { model });
    }
  }
}

export default ConolWebExecutor;
