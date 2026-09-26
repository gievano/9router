import { randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

// Marathon (by GoKite AI) — adaptive inference infrastructure.
//
// OpenAI-compatible API with a unique `completion_window` field:
//   - "now"     → synchronous streaming (like any real-time API)
//   - "soon"    → short delay, small discount
//   - "later"   → ~15 min wait, ~50% cheaper
//   - "anytime" → best-effort, up to 65% cheaper
//
// Mode "now" returns an OpenAI-compatible response (streaming or JSON) — we
// pass it through untouched. Delayed windows return { job_id } and the
// executor polls GET /v1/delayed/jobs/{id} until terminal, then emits the
// result as OpenAI chat.completion SSE (with heartbeat keep-alive frames).
//
// The window is read from credentials.providerSpecificData.completionWindow
// (set per-connection via the MarathonWindowSelector UI), default "now".

const API_BASE = "https://delayed-inference.prod.gokite.ai";
const CHAT_URL = `${API_BASE}/v1/delayed/chat/completions`;
const jobUrl = (id) => `${API_BASE}/v1/delayed/jobs/${encodeURIComponent(id)}`;

// Polling cadence — Marathon jobs can take minutes; we don't want to hammer.
const POLL_INTERVAL_MS = 3000;
// Hard cap on how long we'll hold a connection waiting for a delayed job.
// Beyond this, we return a 504 so the client can retry or fall back.
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes
// Heartbeat — emit a benign keep-alive delta so proxies/clients don't time out.
const HEARTBEAT_INTERVAL_MS = 8000;

// Terminal job statuses (success).
const TERMINAL_DONE = new Set(["completed", "succeeded", "done", "success"]);
// Terminal job statuses (failure).
const TERMINAL_FAIL = new Set(["failed", "error", "cancelled", "canceled", "expired"]);

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error", code: "MARATHON_ERROR" } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function buildHeaders(apiKey, stream) {
  return {
    "Content-Type": "application/json",
    Accept: stream ? "text/event-stream" : "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

// Flatten messages → single prompt for Marathon's delayed endpoint. Marathon is
// OpenAI-compatible (accepts messages[]), so for "now" mode we pass body through
// unchanged. This helper is only used as a fallback for prompt-token estimation.
function estimatePromptLength(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list.reduce((sum, m) => {
    if (typeof m?.content === "string") return sum + m.content.length;
    if (Array.isArray(m?.content)) return sum + m.content.filter((c) => c.type === "text").reduce((s, c) => s + (c.text?.length || 0), 0);
    return sum;
  }, 0);
}

// Extract job_id from the submit response. Marathon may use various field names.
function extractJobId(data) {
  return data?.job_id || data?.jobId || data?.id || data?.job?.id || null;
}

// Extract status from a poll response. Defensive across field-name variants.
function extractStatus(data) {
  return String(data?.status || data?.state || "").toLowerCase();
}

// Extract content from a completed job. Marathon's delayed result may carry the
// full OpenAI completion object, or just the text in various locations.
function extractContent(data) {
  // If Marathon returns a full OpenAI-style completion, pull from choices.
  const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
  if (choice?.message?.content) return choice.message.content;
  if (choice?.delta?.content) return choice.delta.content;

  // Nested result envelope variants.
  const result = data?.result || data?.output || data?.response || null;
  if (result) {
    if (typeof result === "string") return result;
    const rChoice = Array.isArray(result?.choices) ? result.choices[0] : null;
    if (rChoice?.message?.content) return rChoice.message.content;
    if (result?.content) return String(result.content);
  }

  // Bare content field.
  if (data?.content) return String(data.content);
  return "";
}

/**
 * Submit a delayed job and poll until terminal.
 * Returns { status, content, jobId } — status is one of:
 *   "completed" | "failed" | "timeout"
 */
async function runDelayedJob({ body, apiKey, signal, log, proxyOptions, onProgress }) {
  const headers = buildHeaders(apiKey, false);

  // 1. Submit job.
  log?.info?.("MARATHON", `submit delayed job | model=${body?.model || "?"} | window=${body?.completion_window}`);
  let submitRes;
  try {
    submitRes = await proxyAwareFetch(
      CHAT_URL,
      { method: "POST", headers, body: JSON.stringify(body), signal },
      proxyOptions,
    );
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw Object.assign(new Error(`Marathon submit failed: ${err?.message || String(err)}`), { code: "CONNECT_FAILED" });
  }

  if (!submitRes.ok) {
    let detail = "";
    try { detail = (await submitRes.text()) || ""; } catch { /* ignore */ }
    const msg =
      submitRes.status === 401 || submitRes.status === 403
        ? "Marathon auth failed — check your API key."
        : `Marathon submit failed (HTTP ${submitRes.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`;
    throw Object.assign(new Error(msg), { status: submitRes.status, code: `HTTP_${submitRes.status}` });
  }

  // Parse submit response. If Marathon served it synchronously (has choices),
  // we're done — no polling needed.
  let submitData;
  try { submitData = await submitRes.json(); }
  catch { throw Object.assign(new Error("Marathon returned a malformed submit response."), { code: "BAD_RESPONSE" }); }

  // Synchronous passthrough: Marathon returned the completion directly.
  if (Array.isArray(submitData?.choices) && submitData.choices.length > 0) {
    const content = extractContent(submitData);
    log?.info?.("MARATHON", "delayed window served synchronously — no polling needed");
    onProgress?.({ delta: content });
    return { status: "completed", content, jobId: null, passthrough: submitData };
  }

  const jobId = extractJobId(submitData);
  if (!jobId) {
    throw Object.assign(new Error("Marathon submit returned no job_id."), { code: "BAD_RESPONSE" });
  }
  log?.info?.("MARATHON", `job ${jobId} queued`);

  // 2. Poll until terminal.
  const deadline = Date.now() + MAX_WAIT_MS;
  let lastStatus = "queued";

  while (Date.now() < deadline) {
    if (signal?.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    if (signal?.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });

    let pollRes;
    try {
      pollRes = await proxyAwareFetch(
        jobUrl(jobId),
        { method: "GET", headers, signal },
        proxyOptions,
      );
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      // Transient poll failures shouldn't kill the job — log and retry.
      log?.warn?.("MARATHON", `poll error (will retry): ${err?.message || String(err)}`);
      continue;
    }

    if (!pollRes.ok) {
      if (pollRes.status >= 500) {
        log?.warn?.("MARATHON", `poll HTTP ${pollRes.status}, retrying`);
        continue;
      }
      throw Object.assign(new Error(`Marathon poll failed (HTTP ${pollRes.status})`), { status: pollRes.status, code: `HTTP_${pollRes.status}` });
    }

    let payload;
    try { payload = await pollRes.json(); }
    catch { payload = {}; }

    lastStatus = extractStatus(payload);

    // Check for completion.
    if (TERMINAL_DONE.has(lastStatus)) {
      const content = extractContent(payload);
      log?.info?.("MARATHON", `job ${jobId} → ${lastStatus} | ${content.length} chars`);
      onProgress?.({ delta: content });
      return { status: "completed", content, jobId };
    }

    // Check for failure.
    if (TERMINAL_FAIL.has(lastStatus)) {
      const errMsg = payload?.error?.message || payload?.error || `Job ended with status: ${lastStatus}`;
      log?.warn?.("MARATHON", `job ${jobId} → ${lastStatus}: ${errMsg}`);
      return { status: "failed", content: "", jobId, error: errMsg };
    }

    // Still running — notify progress (no delta yet, but lets heartbeat fire).
    onProgress?.({ status: lastStatus, delta: "" });
  }

  // Deadline exceeded.
  log?.warn?.("MARATHON", `job ${jobId} timed out after ${MAX_WAIT_MS / 1000}s (status=${lastStatus})`);
  return { status: "timeout", content: "", jobId };
}

// Build a streaming SSE ReadableStream from the delayed job lifecycle.
// Emits: role frame → heartbeat frames → content delta → stop frame → [DONE].
function buildDelayedStream({ body, apiKey, cid, created, modelId, signal, log, proxyOptions }) {
  const encoder = new TextEncoder();
  let emitted = false;

  const push = (controller, deltaObj) =>
    controller.enqueue(
      encoder.encode(
        sseChunk({
          id: cid,
          object: "chat.completion.chunk",
          created,
          model: modelId,
          choices: [{ index: 0, delta: deltaObj, finish_reason: null }],
        }),
      ),
    );

  return new ReadableStream({
    async start(controller) {
      // Initial role chunk so clients see an assistant turn immediately.
      push(controller, { role: "assistant" });

      // Heartbeat: keep the connection warm during long job waits.
      const heartbeat = setInterval(() => {
        try {
          if (!signal?.aborted) push(controller, {});
        } catch { /* controller may be closed */ }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        const result = await runDelayedJob({
          body, apiKey, signal, log, proxyOptions,
          onProgress: ({ delta }) => {
            if (delta) {
              emitted = true;
              push(controller, { content: delta });
            }
          },
        });

        if (result.status === "completed") {
          // If content arrived via passthrough but wasn't emitted yet, emit it now.
          if (!emitted && result.content) {
            push(controller, { content: result.content });
          }
        } else if (result.status === "failed") {
          push(controller, { content: `\n[Marathon job failed: ${result.error || "unknown error"}]` });
        } else if (result.status === "timeout") {
          push(controller, { content: `\n[Marathon job timed out after ${MAX_WAIT_MS / 1000}s]` });
        }

        // Final stop frame. We always use "stop" — OpenAI has no "error"
        // finish_reason, and failures are already communicated via the content
        // delta ([Marathon error: ...] / [Marathon job timed out ...]).
        controller.enqueue(
          encoder.encode(
            sseChunk({
              id: cid,
              object: "chat.completion.chunk",
              created,
              model: modelId,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            }),
          ),
        );
        controller.enqueue(encoder.encode(SSE_DONE));
      } catch (err) {
        const aborted = err?.name === "AbortError";
        const msg = aborted ? "Stream aborted." : err?.message || String(err);
        controller.enqueue(
          encoder.encode(
            sseChunk({
              id: cid,
              object: "chat.completion.chunk",
              created,
              model: modelId,
              choices: [{ index: 0, delta: { content: `\n[Marathon error: ${msg}]` }, finish_reason: "stop" }],
            }),
          ),
        );
        controller.enqueue(encoder.encode(SSE_DONE));
      } finally {
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
}

export class MarathonExecutor extends BaseExecutor {
  constructor() {
    super("marathon", null);
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions = null }) {
    const apiKey = (credentials?.apiKey || credentials?.accessToken || "").trim();
    if (!apiKey) {
      return {
        response: errorResponse(401, "Marathon: no API key provided. Create one at marathon.build."),
        url: CHAT_URL, headers: {}, transformedBody: body,
      };
    }

    // Read completion window from per-connection settings (default "now").
    const completionWindow = credentials?.providerSpecificData?.completionWindow || "now";
    const modelId = model || "kimi-k3";

    // Inject completion_window into the request body (Marathon's key field).
    // Ensure model is always present (defensive — some clients may omit it).
    const requestBody = { ...body, model: modelId, completion_window: completionWindow };

    // ================================================================
    // MODE "now" — synchronous streaming, OpenAI-compatible passthrough.
    // ================================================================
    if (completionWindow === "now") {
      const headers = buildHeaders(apiKey, stream);
      log?.info?.("MARATHON", `now mode | model=${modelId} | stream=${stream}`);
      try {
        const response = await proxyAwareFetch(
          CHAT_URL,
          { method: "POST", headers, body: JSON.stringify(requestBody), signal },
          proxyOptions,
        );
        // 401/403 = auth failure — wrap in a user-friendly error instead of
        // passing the raw upstream body through to the engine.
        if (response.status === 401 || response.status === 403) {
          return {
            response: errorResponse(response.status, "Marathon: API key rejected — check your key at marathon.build."),
            url: CHAT_URL, headers, transformedBody: requestBody,
          };
        }
        // Pass the response through untouched (OpenAI-compatible stream/JSON).
        return { response, url: CHAT_URL, headers, transformedBody: requestBody };
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        return {
          response: errorResponse(502, `Marathon fetch failed: ${err?.message || String(err)}`),
          url: CHAT_URL, headers, transformedBody: requestBody,
        };
      }
    }

    // ================================================================
    // DELAYED MODE (soon/later/anytime) — async job with polling.
    // ================================================================
    const cid = `chatcmpl-mara-${randomUUID().slice(0, 12)}`;
    const created = Math.floor(Date.now() / 1000);
    const promptLen = estimatePromptLength(body?.messages);

    log?.info?.("MARATHON", `delayed mode | window=${completionWindow} | model=${modelId} | stream=${stream}`);

    if (!stream) {
      // Non-streaming: block until job completes, return single JSON.
      try {
        const result = await runDelayedJob({ body: requestBody, apiKey, signal, log, proxyOptions });
        const content = result.status === "completed"
          ? result.content
          : `[Marathon job ${result.status}: ${result.error || "no output"}]`;
        const completionTokens = Math.ceil(content.length / 4);
        const promptTokens = Math.ceil(promptLen / 4);

        return {
          response: new Response(
            JSON.stringify({
              id: cid, object: "chat.completion", created, model: modelId,
              choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
              usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
              ...(result.passthrough ? { _marathon_passthrough: true } : {}),
            }),
            { status: result.status === "timeout" ? 504 : 200, headers: { "Content-Type": "application/json" } },
          ),
          url: CHAT_URL, headers: buildHeaders(apiKey, false), transformedBody: requestBody,
        };
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        const status = err?.status || 502;
        return {
          response: errorResponse(status, err?.message || "Marathon delayed job failed"),
          url: CHAT_URL, headers: buildHeaders(apiKey, false), transformedBody: requestBody,
        };
      }
    }

    // Streaming: wrap the polling lifecycle in an SSE stream with heartbeats.
    const responseStream = buildDelayedStream({
      body: requestBody, apiKey, cid, created, modelId, signal, log, proxyOptions,
    });

    return {
      response: new Response(responseStream, { status: 200, headers: { ...SSE_HEADERS_NO_BUFFER } }),
      url: CHAT_URL, headers: buildHeaders(apiKey, true), transformedBody: requestBody,
    };
  }
}

export default MarathonExecutor;
