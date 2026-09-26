// Forced SSE → JSON canonical-attempt adapter (Phase 2 / Commit C).
import { classifyCanonicalAttempt } from "./canonicalClassification.js";
import { decideAttemptPolicy } from "./canonicalPolicy.js";

// This path buffers the ENTIRE upstream SSE body and converts it to a single
// JSON response (parseSSEToOpenAIResponse for chat-completions streams,
// convertResponsesStreamToJson for Responses/Codex streams). It is a REAL
// provider attempt (source='provider') but has NO TransformStream lifecycle —
// so stream-scoped fields stay null; completion semantics come from the
// converted/final JSON.
//
// Reuses the non-streaming evidence extractor + the universal canonical
// contract: no second semantic model, no second body read, no re-parse.

import { extractNonStreamingEvidence } from "./nonStreamingAttempt.js";

const EMPTY_EVIDENCE = Object.freeze({
  hasText: false,
  hasReasoning: false,
  hasToolCall: false,
  hasStructuredOutput: false,
  hasUsage: false,
});

/**
 * Build the canonicalAttempt for the forced SSE→JSON path.
 * Inputs are the already-produced normalized JSON (never a second body read).
 *
 * @param {object} opts
 * @param {number|null|undefined} opts.status        - real upstream HTTP status
 * @param {object|null} opts.finalJson               - converted/final JSON object
 * @param {object|null} [opts.usage]                 - usage already extracted
 * @param {number} [opts.malformedLines]             - count of unparseable SSE data events
 * @param {boolean} [opts.structuredContract]        - client requested response_format
 * @param {boolean} [opts.abortSeen]                 - lifecycle-exposed (default false)
 * @param {string|null} [opts.responsesStatus]       - Responses jsonResponse.status
 *        ('completed'|'done'|'failed'|'incomplete'|'cancelled'|...) when available
 */
export function createCanonicalAttemptFromForcedSse({
  status,
  finalJson,
  usage = null,
  malformedLines = 0,
  structuredContract = false,
  abortSeen = false,
  responsesStatus = null,
}) {
  const transportOk = status == null ? null : status >= 200 && status < 300;

  const ev = finalJson && typeof finalJson === "object"
    ? extractNonStreamingEvidence(finalJson, usage, { structuredContract })
    : { ...EMPTY_EVIDENCE };

  const usableOutput = ev.hasText || ev.hasReasoning || ev.hasToolCall || ev.hasStructuredOutput;

  // Explicit provider failure surfaces from the converted JSON: Responses
  // status 'failed', an embedded error object, or a success:false envelope.
  const explicitFailure =
    responsesStatus === "failed" ||
    (finalJson && typeof finalJson === "object" && (Boolean(finalJson.error) || finalJson.success === false));

  // Malformed-only / unrecoverable streams: unparseable data events with no
  // usable output — a corrupted 200 must never look like a clean success.
  const malformedOnly = malformedLines > 0 && !usableOutput;

  let completionState;
  let completionType;
  if (transportOk === false) {
    completionState = "failure";
    completionType = "http_error";
  } else if (explicitFailure) {
    completionState = "failure";
    completionType = responsesStatus === "failed" ? "response.failed" : "http_error";
  } else if (malformedOnly) {
    completionState = "failure";
    completionType = "malformed_sse";
  } else if (responsesStatus === "cancelled" || (responsesStatus === "incomplete" && !usableOutput)) {
    // Provider cancellation (Responses) is distinct from client abort.
    completionState = responsesStatus === "cancelled" ? "cancelled" : "incomplete";
    completionType = responsesStatus === "cancelled" ? "response.cancelled" : "response.incomplete";
  } else if (responsesStatus === "incomplete") {
    completionState = "incomplete";
    completionType = "response.incomplete";
  } else if (usableOutput) {
    completionState = "success";
    completionType = responsesStatus === "completed" || responsesStatus === "done"
      ? (responsesStatus === "completed" ? "response.completed" : "response.done")
      : "http_2xx_json";
  } else {
    // Parsed but no usable output (usage-only, empty choices, valid [DONE]).
    completionState = "incomplete";
    completionType = "http_2xx_json";
  }

  const errorSeen = explicitFailure || malformedOnly || transportOk === false;
  const logicalSuccess = usableOutput && completionState === "success" && !errorSeen && !abortSeen;
  const outcome = errorSeen
    ? "failure"
    : completionState === "cancelled"
      ? "cancelled"
      : logicalSuccess
        ? "success"
        : "incomplete";

  // finishReason surfaces from the converted JSON when the parser preserved it
  // (chat-completions path only; Responses keeps it in completionType instead).
  const finishReason = finalJson?.choices?.[0]?.finish_reason ?? null;

  // Commit G1: deterministic outcome classification (layer #2), derived from the
  // finalized forced-SSE evidence. Computed once; reused for spread + policy.
  const classification = classifyCanonicalAttempt({
    completionState, transportOk, abortSeen: !!abortSeen, errorSeen,
    completionType, usableOutput, logicalSuccess, responseStatus: status ?? null,
    hasUsage: ev.hasUsage, usagePresent: ev.hasUsage,
  });

  return {
    source: "provider",
    transportOk,
    streamStarted: null,
    hasText: ev.hasText,
    hasReasoning: ev.hasReasoning,
    hasToolCall: ev.hasToolCall,
    hasStructuredOutput: ev.hasStructuredOutput,
    hasUsage: ev.hasUsage,
    completionState,
    completionType,
    terminalState: null,
    terminalType: null,
    finishReason,
    eofSeen: null,
    errorSeen,
    abortSeen: !!abortSeen,
    usableOutput,
    logicalSuccess,
    outcome,
    ...classification,
    policy: decideAttemptPolicy({
      source: "provider", completionState, transportOk, abortSeen: !!abortSeen, errorSeen,
      completionType, usableOutput, logicalSuccess,
      hasUsage: ev.hasUsage, usagePresent: ev.hasUsage,
      ...classification,
    }),
  };
}