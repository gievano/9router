// Semantic derivation layer over the Wave 2 stream state — now hosted on the
// universal Canonical Attempt contract (canonicalAttempt.js).
//
// This module keeps the Wave 2 / Commit 2 public surface (deriveUsableOutput,
// deriveLogicalSuccess, deriveAttemptOutcome, createCanonicalAttempt) and
// delegates to the canonical contract, so existing callers and tests keep
// working unchanged while the universal semantics (completionState, structured
// output, provider vs client cancellation) become the single source of truth.
//
// Behavioral notes preserved from the earlier derivation:
//   - usableOutput = text OR reasoning OR tool call OR structured output.
//   - usage, terminal markers, emitted/recvLines/dataLines are never semantic
//     evidence.
//   - logicalSuccess requires usableOutput + completionState==='success' +
//     no error + no abort. [DONE] alone / HTTP 200 alone / streamStarted alone
//     grant nothing.
//   - outcome is the operational summary: success|failure|incomplete|cancelled.
//   - ABORT SEEMS modified: commit 2 mapped response.cancelled terminal to
//     'incomplete'; commit A corrected the state machine so the terminal is
//     'cancelled', making provider cancellation distinguishable from plain
//     incompleteness.

import { deriveUsableOutput, deriveLogicalSuccess, deriveOutcome, createCanonicalAttempt } from "./canonicalAttempt.js";

// Backwards-compatible alias for the Wave 2/2 name.
export { deriveUsableOutput, deriveLogicalSuccess, createCanonicalAttempt };
export const deriveAttemptOutcome = deriveOutcome;