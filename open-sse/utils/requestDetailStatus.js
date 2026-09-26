// Request-detail status vocabulary + canonical mapping (single authoritative source).
//
// Lifecycle: a streaming request-detail row starts as "streaming" (non-terminal,
// admission only) and is finalized EXACTLY ONCE into a terminal status derived
// from the canonical attempt classification — never from transport success
// (HTTP 200 / result.success alone).
//
//   streaming → success | failure | error | incomplete | cancelled | empty_output
//
// "error" is the project's pre-existing transport terminal (chatCore has always
// persisted transport failures as "error"); "failure" is the provider-declared
// failure terminal. Both exist so the two failure axes stay distinguishable.
//
// Consumers: streamingHandler (initial + finalization), buildOnStreamComplete
// (completion), nonStreaming/sseToJson handlers (completion), and
// requestDetailsRepo (terminal-overwrite guard).

import { ATTEMPT_CLASSIFICATIONS } from "./canonicalClassification.js";

// Non-terminal: a stream that has been admitted but not finalized.
export const REQUEST_DETAIL_STREAMING_STATUS = "streaming";

// Terminal vocabulary. Free-text DB column — this set is the contract, not a schema constraint.
export const REQUEST_DETAIL_TERMINAL_STATUSES = Object.freeze([
  "success",
  "failure",
  "error",
  "incomplete",
  "cancelled",
  "empty_output",
]);

export const REQUEST_DETAIL_STATUSES = Object.freeze([
  REQUEST_DETAIL_STREAMING_STATUS,
  "success",
  "failure",
  "error",
  "incomplete",
  "cancelled",
  "empty_output",
]);

// classification (canonicalClassification.js) → request-detail terminal status.
// "error" intentionally reuses the project's established transport-failure status.
const CLASSIFICATION_TO_STATUS = Object.freeze({
  success: "success",
  provider_failure: "failure",
  transport_failure: "error",
  empty_output: "empty_output",
  incomplete: "incomplete",
  cancelled: "cancelled",
});

/**
 * Deterministic canonical classification → request-detail terminal status.
 * Never derived from transport success alone; an absent classification
 * (null attempt) maps defensively to "incomplete".
 */
export function mapCanonicalAttemptToRequestStatus(canonicalAttempt) {
  const cls = canonicalAttempt?.classification;
  if (cls && ATTEMPT_CLASSIFICATIONS.includes(cls) && CLASSIFICATION_TO_STATUS[cls]) {
    return CLASSIFICATION_TO_STATUS[cls];
  }
  return "incomplete";
}

export function isTerminalRequestDetailStatus(status) {
  return status === "success"
    || status === "failure"
    || status === "error"
    || status === "incomplete"
    || status === "cancelled"
    || status === "empty_output";
}

/**
 * Persistence guard for the requestDetail upsert: once a row has reached a
 * terminal status, only an IDENTICAL status may refresh it (content/usage
 * upgrade). Any different terminal status is rejected — the FIRST terminal
 * transition wins, so an aborted stream can never be resurrected as success
 * and a completed stream can never be reverted to cancelled.
 * Non-terminal ("streaming") → terminal transitions always pass.
 */
export function shouldSkipRequestDetailOverwrite(existingStatus, newStatus) {
  if (!existingStatus) return false;
  if (!isTerminalRequestDetailStatus(existingStatus)) return false;
  return existingStatus !== newStatus;
}
