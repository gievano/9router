import { randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

/**
 * FeloWebExecutor — free access to Felo (felo.ai), a chat/search-agent
 * aggregator. Since mid-2026 Felo gates thread creation behind a Cloudflare
 * Turnstile *session* token (`cf_token`): anonymous requests get HTTP 400
 * `turnstile_session_token_required`. The user obtains the token by running a
 * search in a browser and copying it from sessionStorage
 * (`turnstile_session_token`), then pastes it as `cf_token=<token>` in the
 * connection credentials. Optionally `bearer=<6h_...>` (the `authorization`
 * header value) and/or `cookie=<full Cookie header>` can be appended so the
 * stream request authenticates and the profile endpoint works.
 *
 * Flow:
 * 1. POST /api-proxy/main/search/threads { ..., cf_token } — opens a search
 *    thread, returns `stream_key`.
 * 2. GET /api/message/v1/stream/{stream_key}?offset=0 — SSE stream. Lines are
 *    `data:{...}` (no space) or `event: stream` + `data:{...}`; the payload
 *    carries a double-encoded `content` string that yields
 *    `{ data: { type, data } }` with type `"answer"` (incremental/snapshot
 *    text). `reasoning`/`message`/`related_questions`/`deduction_info` events
 *    are ignored.
 *
 * Reverse-engineered, scrape-style integration — may break without notice if
 * Felo changes its frontend contract. Port of OmniRoute felo-web.
 */

export const FELO_BASE = "https://felo.ai";
export const FELO_THREADS_URL = `${FELO_BASE}/api-proxy/main/search/threads`;
export const FELO_USER_INFO_URL = `${FELO_BASE}/api-proxy/ext/user/info`;

export function feloStreamUrl(streamKey) {
  return `${FELO_BASE}/api/message/v1/stream/${encodeURIComponent(streamKey)}?offset=0`;
}

const FELO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

export const FELO_HEADERS = {
  Accept: "*/*",
  "Content-Type": "application/json",
  Origin: FELO_BASE,
  Referer: `${FELO_BASE}/search?q=hello`,
  "User-Agent": FELO_USER_AGENT,
};

const FELO_STREAM_REQUEST_HEADERS = {
  Accept: "*/*",
  Origin: FELO_BASE,
  Referer: FELO_HEADERS.Referer,
  "User-Agent": FELO_USER_AGENT,
};

// Mirrors g4f's `Felo.model_aliases` — category drives which search/answer
// pipeline Felo routes the query through.
const FELO_MODEL_CATEGORIES = {
  "felo-chat": "chat",
  "felo-search": "google",
  "felo-scholar": "scholar",
  "felo-social": "social",
  "felo-document": "document",
};

export const FELO_DEFAULT_MODEL = "felo-chat";

export function normalizeFeloModel(model) {
  if (!model) return FELO_DEFAULT_MODEL;
  const clean = String(model).startsWith("felo-web/")
    ? String(model).slice("felo-web/".length)
    : String(model);
  return Object.prototype.hasOwnProperty.call(FELO_MODEL_CATEGORIES, clean)
    ? clean
    : FELO_DEFAULT_MODEL;
}

export function resolveFeloCategory(model) {
  return FELO_MODEL_CATEGORIES[normalizeFeloModel(model)];
}

/**
 * Parse the pasted credential string into { cfToken, bearer, cookie }.
 *
 * Accepted shapes (case-insensitive keys):
 *   - `cf_token=<turnstile session token>`            (required)
 *   - `cfToken=<...>` / `turnstile=<...>` aliases
 *   - `bearer=<6h_...>`  — authorization header value for the stream/profile
 *   - `cookie=<full Cookie header>` — for the stream/profile requests
 *   - `cookie=felo-user-token=<6h_...>` — the session cookie; its value is
 *     ALSO used as the `Authorization: Bearer` (mirrors the frontend)
 *   - a bare value (no `=`) is treated as the cf_token itself
 *   - a `cookie: ...` prefix is stripped (full-header paste convenience)
 */
export function parseFeloCredential(raw) {
  const str = String(raw || "").trim().replace(/^cookie:\s*/i, "");
  if (!str) return { cfToken: "", bearer: "", cookie: "" };

  // Split on `;` so cookie values may themselves contain `=` (cookie pairs).
  // Unknown keys are collected back into the cookie header string.
  const parts = str.split(";").map((p) => p.trim()).filter(Boolean);
  let cfToken = "";
  let bearer = "";
  const cookieParts = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) {
      // Bare value (no `=` anywhere) → treat as the turnstile token itself.
      if (parts.length === 1) cfToken = part;
      continue;
    }
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (key === "cf_token" || key === "cftoken" || key === "turnstile") {
      if (!cfToken) cfToken = value;
    } else if (key === "bearer") {
      bearer = value;
    } else if (key === "cookie") {
      cookieParts.push(value);
    } else {
      // Unknown pair (e.g. felo-user-token=...) — part of the cookie header.
      cookieParts.push(part);
    }
  }
  const cookie = cookieParts.join("; ");
  // The `felo-user-token` cookie value IS the session bearer (`6h_...`): the
  // frontend sends `Authorization: Bearer <value>` on every request, so derive
  // it whenever the cookie was pasted (with or without a `cookie=` wrapper).
  if (!bearer) {
    const m = cookie.match(/(?:^|;\s*)felo-user-token=([^;]+)/i);
    if (m) bearer = m[1].trim();
  }
  return { cfToken, bearer, cookie };
}

export function extractFeloLastUserPrompt(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  const content = lastUser.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part && typeof part === "object" && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function buildFeloThreadPayload(model, prompt, cfToken) {
  const searchUuid = randomUUID();
  return {
    query: prompt,
    search_uuid: searchUuid,
    lang: "",
    agent_lang: "en",
    search_options: { langcode: "en-US" },
    search_video: true,
    query_from: "default",
    category: resolveFeloCategory(model),
    model: "",
    auto_routing: true,
    mode: "concise",
    device_id: randomUUID().replaceAll("-", ""),
    source_message_rid: "",
    documents: [],
    document_action: "",
    slides_source: { type: "ask_question", files: {} },
    slide_template_uid: "",
    selected_resource_ids: [],
    process_id: searchUuid,
    stream_protocol: "message_center_v1",
    enable_task_state: true,
    // cf_token is only sent when provided — the logged-in frontend omits it
    // entirely and relies on the session (Authorization: Bearer 6h_...).
    ...(cfToken ? { cf_token: cfToken } : {}),
  };
}

function extractFeloAnswerText(contentJson) {
  if (!contentJson || typeof contentJson !== "object") return null;
  const data = contentJson.data;
  if (!data || typeof data !== "object") return null;
  if (data.type !== "answer") return null;
  const inner = data.data;
  if (!inner || typeof inner !== "object") return null;
  const text = inner.text;
  return typeof text === "string" ? text : null;
}

/**
 * Parse a single line of Felo's SSE-shaped stream, diffing against the running
 * snapshot: each `answer` event carries the full text-so-far, and only the new
 * suffix is new content.
 *
 * Tolerates both legacy `data:{...}` (no space) lines and the newer framing
 * where the event is named `stream` (DevTools shows `stream\t{...}` — either
 * `event: stream` + `data:{...}` on the wire, or the payload on the same line).
 */
export function parseFeloStreamLine(line, previousText) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { newText: null, nextPreviousText: previousText };
  }

  let raw = null;
  if (trimmed.startsWith("data:")) {
    raw = trimmed.slice(5).trim();
  } else if (/^stream[\t ]/.test(trimmed)) {
    raw = trimmed.replace(/^stream[\t ]+/, "");
  } else {
    return { newText: null, nextPreviousText: previousText };
  }

  let outer;
  try {
    outer = JSON.parse(raw);
  } catch {
    return { newText: null, nextPreviousText: previousText };
  }

  const content = outer?.content;
  if (typeof content !== "string") {
    return { newText: null, nextPreviousText: previousText };
  }

  let contentJson;
  try {
    contentJson = JSON.parse(content);
  } catch {
    return { newText: null, nextPreviousText: previousText };
  }

  const text = extractFeloAnswerText(contentJson);
  if (text === null) {
    return { newText: null, nextPreviousText: previousText };
  }

  if (text.startsWith(previousText)) {
    const newPart = text.slice(previousText.length);
    return newPart
      ? { newText: newPart, nextPreviousText: text }
      : { newText: null, nextPreviousText: previousText };
  }

  return { newText: text, nextPreviousText: text };
}

/** Replay a full raw stream body through `parseFeloStreamLine`, returning the final text. */
export function accumulateFeloStreamText(rawText) {
  let previousText = "";
  for (const line of rawText.split("\n")) {
    previousText = parseFeloStreamLine(line, previousText).nextPreviousText;
  }
  return previousText;
}

function feloErrorResponse(status, message) {
  return new Response(JSON.stringify({ error: { message, type: "upstream_error" } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildFeloStreamTransform() {
  let previousText = "";
  let buffer = "";
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const parsed = parseFeloStreamLine(line, previousText);
        previousText = parsed.nextPreviousText;
        if (!parsed.newText) continue;
        const openaiChunk = { choices: [{ delta: { content: parsed.newText }, index: 0 }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
      }
    },
    flush(controller) {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    },
  });
}

async function processFeloResponse(response, streaming) {
  if (streaming) {
    if (!response.body) {
      return feloErrorResponse(500, "No response body");
    }
    const transformed = response.body.pipeThrough(buildFeloStreamTransform());
    return new Response(transformed, { headers: { "Content-Type": "text/event-stream" } });
  }

  const rawText = await response.text();
  const fullText = accumulateFeloStreamText(rawText);
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: { role: "assistant", content: fullText },
          index: 0,
          finish_reason: "stop",
        },
      ],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export class FeloWebExecutor extends BaseExecutor {
  constructor() {
    super("felo-web", { baseUrl: FELO_BASE, format: "openai" });
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions }) {
    const bodyObj = body || {};
    const messages = Array.isArray(bodyObj.messages) ? bodyObj.messages : [];
    const isStreaming = stream !== false;

    // Thread creation is Turnstile-gated since mid-2026: anonymous requests
    // get 400 turnstile_session_token_required. A LOGGED-IN session (the
    // `6h_...` bearer / felo-user-token cookie) is accepted by the endpoint
    // (bad tokens → 401 unauthorized), so either cf_token OR session auth works.
    const { cfToken, bearer, cookie } = parseFeloCredential(credentials?.apiKey);
    if (!cfToken && !bearer && !cookie) {
      return this.result(
        feloErrorResponse(
          401,
          "Felo: no credentials provided. Paste `cf_token=<turnstile_session_token>` (DevTools → Network → search/threads request → Payload) for anonymous access, or `bearer=<6h_...>` / `cookie=felo-user-token=<6h_...>` from your logged-in felo.ai session.",
        ),
        body,
      );
    }

    if (messages.length === 0) {
      return this.result(feloErrorResponse(400, "No messages provided"), body);
    }
    const prompt = extractFeloLastUserPrompt(messages);
    if (!prompt) {
      return this.result(feloErrorResponse(400, "No user message content found"), body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const err = new Error("felo-web execute timeout");
      err.name = "TimeoutError";
      controller.abort(err);
    }, 60_000);
    const mergedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

    try {
      const streamKey = await this.createFeloThread(model, prompt, cfToken, bearer, cookie, mergedSignal, proxyOptions);
      if (streamKey instanceof Response) {
        clearTimeout(timeout);
        return this.result(streamKey, body);
      }

      // Stream request now carries the session bearer/cookie when provided
      // (the frontend sends `authorization: Bearer 6h_...` + felo-user-token).
      const streamHeaders = { ...FELO_STREAM_REQUEST_HEADERS };
      if (bearer) streamHeaders.Authorization = `Bearer ${bearer}`;
      if (cookie) streamHeaders.Cookie = cookie;

      const streamResponse = await proxyAwareFetch(
        feloStreamUrl(streamKey),
        { method: "GET", headers: streamHeaders, signal: mergedSignal },
        proxyOptions
      );
      clearTimeout(timeout);

      if (!streamResponse.ok || !streamResponse.body) {
        const status = !streamResponse.ok && streamResponse.status >= 500 ? 502 : streamResponse.status || 502;
        return this.result(feloErrorResponse(status, `Felo stream request failed with HTTP ${streamResponse.status}`), body);
      }

      return this.result(await processFeloResponse(streamResponse, isStreaming), body);
    } catch (error) {
      clearTimeout(timeout);
      log?.error?.("FELO", `execute error: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof DOMException && error.name === "AbortError") {
        return this.result(feloErrorResponse(499, "Request cancelled"), body);
      }
      return this.result(feloErrorResponse(500, error instanceof Error ? error.message : "Unknown error"), body);
    }
  }

  /** Returns the resolved `stream_key`, or an error Response to propagate as-is. */
  async createFeloThread(model, prompt, cfToken, bearer, cookie, signal, proxyOptions) {
    // Mirror the frontend: logged-in sessions authenticate via the Bearer/cookie
    // on the thread POST too (bad sessions → 401 unauthorized), so a valid
    // `6h_...` session may bypass the Turnstile requirement entirely.
    const threadHeaders = { ...FELO_HEADERS };
    if (bearer) threadHeaders.Authorization = `Bearer ${bearer}`;
    if (cookie) threadHeaders.Cookie = cookie;

    const threadResponse = await proxyAwareFetch(
      FELO_THREADS_URL,
      {
        method: "POST",
        headers: threadHeaders,
        body: JSON.stringify(buildFeloThreadPayload(model, prompt, cfToken)),
        signal,
      },
      proxyOptions
    );

    if (threadResponse.status === 400) {
      // Distinguish Turnstile rejection from generic validation errors so the
      // user gets an actionable message instead of a mystery 400.
      const errText = await threadResponse.text().catch(() => "");
      let errorType = "";
      try {
        errorType = JSON.parse(errText)?.detail?.error_type || "";
      } catch { /* non-JSON body */ }
      if (errorType === "turnstile_session_token_required") {
        return feloErrorResponse(400, "Felo: thread creation needs valid auth — add `cf_token` (from the search/threads request payload in DevTools) or a valid `bearer`/`cookie` session.");
      }
      if (errorType === "turnstile_session_token_invalid" || errorType === "turnstile_session_token_expired") {
        return feloErrorResponse(401, "Felo: cf_token is invalid or expired — re-copy it from the search/threads request payload in DevTools.");
      }
      return feloErrorResponse(400, "Felo thread creation failed with HTTP 400");
    }

    if (threadResponse.status === 401) {
      // Bad Bearer/session token (not a Turnstile issue) — the endpoint checks
      // Authorization first and rejects invalid sessions with 401 unauthorized.
      return feloErrorResponse(401, "Felo: session unauthorized — re-copy your `bearer`/`cookie` from felo.ai DevTools.");
    }

    if (!threadResponse.ok) {
      const status = threadResponse.status >= 500 ? 502 : threadResponse.status;
      return feloErrorResponse(status, `Felo thread creation failed with HTTP ${threadResponse.status}`);
    }

    const threadJson = await threadResponse.json().catch(() => null);
    const streamKey = threadJson?.stream_key;
    if (typeof streamKey !== "string" || !streamKey) {
      return feloErrorResponse(502, "Felo did not return a stream_key");
    }
    return streamKey;
  }

  result(response, body) {
    return { response, url: FELO_THREADS_URL, headers: FELO_HEADERS, transformedBody: body };
  }
}

export default FeloWebExecutor;
