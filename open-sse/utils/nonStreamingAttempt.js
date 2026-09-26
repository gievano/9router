// Non-streaming canonical-attempt adapter (Phase 2 / Commit B).
import { classifyCanonicalAttempt } from "./canonicalClassification.js";
import { decideAttemptPolicy } from "./canonicalPolicy.js";

// Converts a NORMAL non-streaming provider result into the universal
// canonicalAttempt contract (canonicalAttempt.js) WITHOUT touching any
// existing app behavior. Input is the already-parsed / already-normalized
// JSON that the non-streaming handler produced — never a second body read.
//
// Semantic rules (evidence-based, from the actual handler):
//   - source = "provider" always (this IS an upstream attempt).
//   - transportOk from the real provider HTTP status (2xx/else; null only if
//     genuinely absent — not derivable from body).
//   - Stream fields (streamStarted/eofSeen/terminalState/terminalType/
//     finishReason) are all null — non-streaming has no SSE lifecycle.
//   - completionState is NEVER auto-"success" from HTTP 2xx or from JSON
//     parsing alone. It needs structurally usable output OR an explicit
//     failure conclusion.
//   - hasUsage/hasStructuredOutput/etc. fabricate nothing: usage is metadata,
//     structured output counts ONLY genuine model-generated structured
//     results (established conservatively — see handleNonStreamingResponse's
//     response_format fence-unwrap, which runs before the adapter).
//
// Response-preservation: this module NEVER constructs the client Response,
// never alters status/headers/body, and never changes error behavior — it only
// derives a semantic read-only object.

/**
 * Detect semantic output categories from the finalized normalized response.
 * This adapter consumes the finalized NORMALIZED response shape — the
 * OpenAI-compatible `choices[i].message.*` representation that
 * translateNonStreamingResponse produces. It does NOT parse arbitrary
 * top-level provider dialects; the handler feeds it the same
 * translatedResponse it sends to the client.
 */
export function extractNonStreamingEvidence(parsed, usage, { structuredContract = false } = {}) {
  const evidence = {
    hasText: false,
    hasReasoning: false,
    hasToolCall: false,
    hasStructuredOutput: false,
    hasUsage: false,
  };
  if (!parsed || typeof parsed !== "object") return evidence;

  // Usage — METADATA only. Uses the SAME normalized usage object the handler
  // already extracted (extractUsageFromResponse + addBufferToUsage), so no
  // double parsing.
  if (usage && typeof usage === "object" &&
    ["prompt_tokens", "completion_tokens", "total_tokens", "input_tokens", "output_tokens", "promptTokenCount", "candidatesTokenCount"]
      .some((f) => typeof usage[f] === "number" && usage[f] > 0)) {
    evidence.hasUsage = true;
  }

  const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
  const firstMessage = choices[0]?.message || choices[0] || {};
  const msgText = firstMessage.content;
  const msgReasoning = firstMessage.reasoning_content ?? firstMessage.thinking;
  const msgToolCalls = firstMessage.tool_calls ?? firstMessage.function_call;

  // Output-category evidence is read ONLY from the assistant-role message (or
  // a message without an explicit role, which normalization produces for
  // some providers). Tool-result / user turns are never model output.
  const assistantRole = firstMessage.role == null || firstMessage.role === "assistant";
  if (!assistantRole) return evidence;

  // Pure string content, non-empty → real model text.
  if (typeof msgText === "string" && msgText.trim().length > 0) evidence.hasText = true;

  // Reasoning content — thinking that consumed tokens is genuinely meaningful
  // output (the handler deliberately preserves it when content is empty).
  if (typeof msgReasoning === "string" && msgReasoning.trim().length > 0) evidence.hasReasoning = true;

  // Actual tool invocation: OpenAI tool_calls array with entries, or Claude
  // function_call object. Tool RESULTS/messages (role=user/tool) are never
  // counted — we only read the assistant message.
  const isToolCallArray = Array.isArray(msgToolCalls) && msgToolCalls.length > 0 && !(msgToolCalls.length === 1 && !msgToolCalls[0]?.function && !msgToolCalls[0]?.name);
  const isFunctionCall = msgToolCalls && !Array.isArray(msgToolCalls) && typeof msgToolCalls === "object" && (msgToolCalls.name || msgToolCalls.function);
  if (isToolCallArray || isFunctionCall) evidence.hasToolCall = true;

  // Structured output: requires EXPLICIT structured-output contract evidence
  // (structuredContract — the handler's response_format signal) AND content
  // that is actually valid JSON. A string merely beginning with `{` or `[` is
  // NOT structured output — e.g. "{hello}" or "[Note] deployment started" are
  // ordinary text. The handler runs the response_format JSON-fence unwrap
  // before the adapter, so the finalized content is already fence-free.
  // Usage/error/metadata envelopes and empty choices are never it.
  if (structuredContract) {
    const choiceMessage = choices[0]?.message || choices[0];
    const contentStr = choiceMessage?.content;
    if (typeof contentStr === "string" && contentStr.trim().length > 0) {
      const trimmed = contentStr.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsedJson = JSON.parse(trimmed);
          const structureIsValid = (Array.isArray(parsedJson) && parsedJson.length > 0) ||
            (parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson));
          if (structureIsValid) evidence.hasStructuredOutput = true;
        } catch {
          // Not valid JSON — keep hasStructuredOutput=false (plain text).
        }
      }
    }
  }

  return evidence;
}

/**
 * Build a canonicalAttempt for a normal non-streaming provider response.
 * Pure & side-effect free. Never re-reads the body; input is the finalized
 * parsed JSON + the already-extracted usage + the real provider status.
 *
 * @param {object} opts
 * @param {number|null|undefined} opts.status  - real provider HTTP status
 * @param {object|null} opts.parsed            - finalized normalized response JSON
 * @param {object|null} [opts.usage]           - usage the handler already extracted
 * @param {boolean} [opts.malformed]           - true when JSON parsing failed
 * @param {boolean} [opts.abortSeen]           - exposed by lifecycle (default false)
 * @returns {object} canonicalAttempt (source=provider)
 */
export function createCanonicalAttemptFromNonStreaming({ status, parsed, usage = null, malformed = false, abortSeen = false, structuredContract = false }) {
  const transportOk = status == null ? null : status >= 200 && status < 300;
  const ev = malformed
    ? { hasText: false, hasReasoning: false, hasToolCall: false, hasStructuredOutput: false, hasUsage: false }
    : extractNonStreamingEvidence(parsed, usage, { structuredContract });

  const usableOutput = ev.hasText || ev.hasReasoning || ev.hasToolCall || ev.hasStructuredOutput;

  let completionState;
  let completionType;
  if (transportOk === false) {
    completionState = "failure";
    completionType = "http_error";
  } else if (malformed) {
    completionState = "failure";
    completionType = "json_parse_error";
  } else if (usableOutput) {
    completionState = "success";
    completionType = "http_2xx_json";
  } else {
    // 2xx + parsed but no usable output → incomplete (NOT success).
    completionState = "incomplete";
    completionType = "http_2xx_json";
  }

  const errorSeen = malformed || transportOk === false
    || (parsed && typeof parsed === "object" && (Boolean(parsed.error) || parsed.success === false));
  const logicalSuccess = usableOutput && completionState === "success" && !errorSeen && !abortSeen;
  const outcome = errorSeen || transportOk === false ? "failure" : (logicalSuccess ? "success" : completionState === "incomplete" ? "incomplete" : "incomplete");
  // Compute classification once; reused for both the attached spread and policy.
  const classification = classifyCanonicalAttempt({
    completionState, transportOk, abortSeen: !!abortSeen, errorSeen,
    completionType, usableOutput, logicalSuccess, responseStatus: status ?? null,
    hasUsage: ev.hasUsage, usagePresent: ev.hasUsage,
  });

  const result = {
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
    finishReason: null,
    eofSeen: null,
    errorSeen,
    abortSeen: !!abortSeen,
    usableOutput,
    logicalSuccess,
    outcome,
    // Commit G1: deterministic outcome classification (layer #2), derived from the
    // finalized non-streaming evidence. Attached, not a separate envelope.
    ...classification,
    policy: decideAttemptPolicy({
      source: "provider", completionState, transportOk, abortSeen: !!abortSeen, errorSeen,
      completionType, usableOutput, logicalSuccess,
      hasUsage: ev.hasUsage, usagePresent: ev.hasUsage,
      ...classification,
    }),
  };
  return result;
}