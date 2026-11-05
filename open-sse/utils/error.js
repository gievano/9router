import { ERROR_TYPES, DEFAULT_ERROR_MESSAGES } from "../config/errorConfig.js";

// What the client is allowed to read when Hide Raw Errors is on: the status
// code, the error type and the fact that something failed - never the message.
export const HIDDEN_ERROR_MESSAGE = "There is an error but this error is hidden, try checking your error log.";

/**
 * Replace the message inside an already-parsed error object with the hidden
 * placeholder, keeping type/code intact. Handles the OpenAI shape
 * (`{ message }`), the Anthropic shape (`{ type, error: { message } }`) and a
 * bare string. Mutates and returns the object.
 * @param {any} err - parsed error object or string
 * @returns {any} the same error, masked
 */
export function maskErrorPayload(err) {
  if (!err) return err;
  if (typeof err === "string") return HIDDEN_ERROR_MESSAGE;
  if (typeof err !== "object") return err;
  if (typeof err.message === "string") {
    err.message = HIDDEN_ERROR_MESSAGE;
  }
  if (err.error && typeof err.error === "object" && typeof err.error.message === "string") {
    err.error.message = HIDDEN_ERROR_MESSAGE;
  }
  if (typeof err.detail === "string") {
    err.detail = HIDDEN_ERROR_MESSAGE;
  }
  return err;
}

/**
 * Build OpenAI-compatible error response body
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {boolean} [hideError] - Whether to hide the real error message
 * @returns {object} Error response object
 */
export function buildErrorBody(statusCode, message, hideError = false) {
  const errorInfo = ERROR_TYPES[statusCode] || 
    (statusCode >= 500 
      ? { type: "server_error", code: "internal_server_error" }
      : { type: "invalid_request_error", code: "" });

  const rawMessage = message || DEFAULT_ERROR_MESSAGES[statusCode] || "An error occurred";
  const finalMessage = hideError ? HIDDEN_ERROR_MESSAGE : rawMessage;

  return {
    error: {
      message: finalMessage,
      type: errorInfo.type,
      code: errorInfo.code
    }
  };
}

/**
 * Create error Response object (for non-streaming)
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {object} [extraHeaders] - Optional headers
 * @param {boolean} [hideError] - Whether to hide error message
 * @returns {Response} HTTP Response object
 */
export function errorResponse(statusCode, message, extraHeaders = null, hideError = false) {
  return new Response(JSON.stringify(buildErrorBody(statusCode, message, hideError)), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders
    }
  });
}

/**
 * Write error to SSE stream (for streaming)
 * @param {WritableStreamDefaultWriter} writer - Stream writer
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {boolean} [hideError] - Whether to hide error message
 */
export async function writeStreamError(writer, statusCode, message, hideError = false) {
  const errorBody = buildErrorBody(statusCode, message, hideError);
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(`data: ${JSON.stringify(errorBody)}\n\n`));
}

/**
 * Parse upstream provider error response
 * @param {Response} response - Fetch response from provider
 * @param {object} [executor] - Optional executor with parseError() override for provider-specific parsing
 * @returns {Promise<{statusCode: number, message: string, resetsAtMs?: number}>}
 */
export async function parseUpstreamError(response, executor = null) {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }

  // Let executor-specific parser extract provider-specific fields (e.g. codex resetsAtMs)
  if (executor && typeof executor.parseError === "function") {
    try {
      const parsed = executor.parseError(response, bodyText);
      if (parsed && typeof parsed === "object") {
        const msg = parsed.message || DEFAULT_ERROR_MESSAGES[response.status] || `Upstream error: ${response.status}`;
        return { statusCode: parsed.status || response.status, message: msg, resetsAtMs: parsed.resetsAtMs };
      }
    } catch { /* fall through to default parsing */ }
  }

  let message = "";
  try {
    const json = JSON.parse(bodyText);
    message = json.error?.message || json.message || json.error || bodyText;
  } catch {
    message = bodyText;
  }

  const messageStr = typeof message === "string" ? message : JSON.stringify(message);
  const finalMessage = messageStr || DEFAULT_ERROR_MESSAGES[response.status] || `Upstream error: ${response.status}`;

  return { statusCode: response.status, message: finalMessage };
}

/**
 * Create error result for chatCore handler
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {number} [resetsAtMs] - Optional precise cooldown expiry (ms epoch) for provider-specific quota errors
 * @returns {{ success: false, status: number, error: string, response: Response, resetsAtMs?: number }}
 */
export function createErrorResult(statusCode, message, resetsAtMs, extraHeaders = null, hideError = false) {
  return {
    success: false,
    status: statusCode,
    error: message,
    resetsAtMs,
    response: errorResponse(statusCode, message, extraHeaders, hideError)
  };
}

/**
 * Create unavailable response when all accounts are rate limited
 * @param {number} statusCode - Original error status code
 * @param {string} message - Error message (without retry info)
 * @param {string} retryAfter - ISO timestamp when earliest account becomes available
 * @param {string} retryAfterHuman - Human-readable retry info e.g. "reset after 30s"
 * @returns {Response}
 */
export function unavailableResponse(statusCode, message, retryAfter, retryAfterHuman, extraHeaders = null, hideError = false) {
  const retryAfterSec = Math.max(Math.ceil((new Date(retryAfter).getTime() - Date.now()) / 1000), 1);
  const msg = hideError
    ? buildErrorBody(statusCode, message, true).error.message
    : `${message} (${retryAfterHuman})`;
  return new Response(
    JSON.stringify({ error: { message: msg } }),
    {
      status: statusCode,
      headers: {
        ...extraHeaders,
        "Content-Type": "application/json",
        // Intentionally mis-cased to prevent duplicate headers
        "retry-after": String(retryAfterSec)
      }
    }
  );
}

/**
 * Mask a client-facing error body when Hide Raw Errors is on.
 *
 * The toggle used to be threaded into a handful of call sites, so any path that
 * forgot the flag (combo fallbacks, executor-built responses, auth gates) still
 * shipped the upstream message. Masking at the handler boundary instead makes
 * the guarantee unconditional: no error detail leaves the server, whichever
 * branch produced the response. Status code, error type and code stay, so a
 * caller can still tell a 401 from a 503; only the message is replaced.
 *
 * Successful responses - including 200 SSE streams - pass through untouched.
 */
export async function maskHiddenError(response, hideError) {
  if (!hideError || !response || response.status < 400) return response;
  const contentType = response.headers.get("content-type") || "";

  const rebuild = (payload) => {
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");
    return new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  let body = null;
  if (contentType.includes("application/json")) {
    try {
      body = await response.clone().json();
    } catch {
      body = null;
    }
  }

  if (body && typeof body === "object") {
    // Nothing named `error` to mask - leave the payload alone.
    if (!body.error) return response;
    const error = typeof body.error === "object"
      ? { ...body.error, message: HIDDEN_ERROR_MESSAGE }
      : HIDDEN_ERROR_MESSAGE;
    return rebuild({ ...body, error });
  }

  // Not JSON, or not parseable: an upstream HTML/text error page would leak the
  // provider's wording verbatim, so rebuild it as a masked JSON error instead.
  let text = "";
  try {
    text = (await response.clone().text()).trim();
  } catch {
    text = "";
  }
  if (!text) return response;
  return rebuild(buildErrorBody(response.status, text, true));
}

/**
 * Format provider error with context
 * @param {Error} error - Original error
 * @param {string} provider - Provider name
 * @param {string} model - Model name
 * @param {number|string} statusCode - HTTP status code or error code
 * @returns {string} Formatted error message
 */
export function formatProviderError(error, provider, model, statusCode) {
  const code = statusCode || error.code || "FETCH_FAILED";
  const message = error.message || "Unknown error";
  // Expose low-level cause (e.g. UND_ERR_SOCKET, ECONNRESET, ETIMEDOUT) for diagnosing fetch failures
  const causeCode = error.cause?.code;
  const causeMsg = error.cause?.message;
  const causeStr = causeCode || causeMsg ? ` (cause: ${[causeCode, causeMsg].filter(Boolean).join(": ")})` : "";
  return `[${code}]: ${message}${causeStr}`;
}
