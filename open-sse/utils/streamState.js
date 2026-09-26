// Stream-scoped observational response state machine (Phase 2 / Wave 2 / Commit 1).
//
// One instance per provider stream, created inside the TransformStream closure
// (or handed in by streamingHandler). Records what actually happened on the
// wire WITHOUT influencing any behavior: ChatResult.success, combo fallback,
// retryability and termination output are all untouched by this module.
//
// Deliberate distinctions (forensic Cline lessons):
//   - streamStarted  = first provider chunk observed (same event as TTFT),
//                      NOT the HTTP 200.
//   - hasText/hasReasoning/hasToolCall come from semantic event structure only;
//     usage-only or [DONE]-only traffic must never set them.
//   - hasUsage is metadata evidence; it never implies model output.
//   - [DONE] is a transport termination marker → terminalSeen with a null
//     state unless a real provider terminal was already observed.
//   - EOF alone is not success.
//
// receivedEvents is intentionally omitted: Phase 1 telemetry already counts
// received lines/events per stream (sseLineCount/eventTypeCounts); duplicating
// it here would add false precision without new information.

const SUCCESS_FINISH_REASONS = new Set(["stop", "end_turn", "stop_sequence", "tool_calls", "function_call"]);
const INCOMPLETE_FINISH_REASONS = new Set(["length", "max_tokens"]);
const FAILURE_FINISH_REASONS = new Set(["content_filter"]);

// Responses API lifecycle events → normalized terminal observation.
// response.cancelled is a DISTINCT terminal value ('cancelled') — the provider
// explicitly cancelled the run. It is not ordinary incompleteness (that is
// 'incomplete'), and it is separate from client-initiated abort evidence
// (abortSeen lives on the lifecycle axis, not here).
const RESPONSES_TERMINALS = {
  "response.completed": "success",
  "response.done": "success",
  "response.failed": "failure",
  "response.incomplete": "incomplete",
  "response.cancelled": "cancelled",
};

export function createStreamState() {
  return {
    streamStarted: false,
    hasText: false,
    hasReasoning: false,
    hasToolCall: false,
    hasUsage: false,
    terminalSeen: false,
    terminalState: null, // 'success' | 'failure' | 'incomplete' | null (neutral marker)
    terminalType: null,  // 'finish_reason' | '[DONE]' | 'message_stop' | 'response.completed' | ...
    finishReason: null,  // raw finish/stop reason when one was observed
    eofSeen: false,
    errorSeen: false,
    abortSeen: false,
    recvLines: null,
    dataLines: null,
    eventLines: null,
    emitted: null,
  };
}

function setTerminal(state, termState, termType) {
  if (state.terminalSeen) return; // first terminal observation wins
  state.terminalSeen = true;
  state.terminalState = termState;
  state.terminalType = termType;
}

function applyFinishReason(state, reason) {
  const r = String(reason).toLowerCase();
  state.finishReason = r;
  const mapped = SUCCESS_FINISH_REASONS.has(r)
    ? "success"
    : INCOMPLETE_FINISH_REASONS.has(r)
      ? "incomplete"
      : FAILURE_FINISH_REASONS.has(r)
        ? "failure"
        : null;
  setTerminal(state, mapped, "finish_reason");
}

function looksLikeUsage(usage) {
  if (!usage || typeof usage !== "object") return false;
  return [
    "prompt_tokens", "completion_tokens", "total_tokens",
    "input_tokens", "output_tokens",
    "promptTokenCount", "candidatesTokenCount",
  ].some((f) => typeof usage[f] === "number" && usage[f] > 0);
}

/**
 * Observe one PARSED provider event (translate mode). Pure classification —
 * the caller keeps full control of parsing and emission.
 *
 * @param {object} state - createStreamState() instance
 * @param {object} parsed - parseSSELine() result for the current event
 * @param {{eventName?: string}} [opts] - Responses API event name when the
 *        `event:` framing already identified it
 */
export function observeParsedEvent(state, parsed, opts = {}) {
  if (!state || !parsed || typeof parsed !== "object") return state;

  // Usage (any format). Metadata only — never implies output.
  // Gemini arrives in two shapes: direct Gemini (parsed.usageMetadata) and
  // wrapped Gemini/Antigravity (parsed.response.usageMetadata).
  const usageLike = parsed.usage || parsed.usageMetadata || parsed.response?.usageMetadata;
  if (!state.hasUsage && looksLikeUsage(usageLike)) state.hasUsage = true;

  // OpenAI chat shapes
  const delta = parsed.choices?.[0]?.delta;
  if (delta) {
    if (delta.content) state.hasText = true;
    if (delta.reasoning_content) state.hasReasoning = true;
    if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) state.hasToolCall = true;
  }
  if (parsed.choices?.[0]?.finish_reason) applyFinishReason(state, parsed.choices[0].finish_reason);

  // Claude shapes
  if (parsed.delta?.text) state.hasText = true;
  if (parsed.delta?.thinking) state.hasReasoning = true;
  if (parsed.type === "content_block_start" && parsed.content_block?.type === "tool_use") state.hasToolCall = true;
  if (parsed.type === "message_stop") setTerminal(state, "success", "message_stop");
  if (parsed.type === "error" || parsed.error) state.errorSeen = true;
  if (parsed.type === "error") setTerminal(state, "failure", "error");

  // Gemini shapes — direct Gemini AND wrapped Gemini/Antigravity
  // (Antigravity returns {"response":{"candidates":[...],"usageMetadata":{...}}}).
  // Normalize to a single unwrapped chunk so both shapes are observed identically.
  const geminiChunk = parsed.response?.candidates ? parsed.response : parsed;
  const parts = geminiChunk.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      // Function/tool call — semantic output in its own right. This MUST be
      // recorded BEFORE the `!part.text` guard below: a tool-call-only part
      // carries no text, so the guard skipped it entirely and left
      // hasToolCall=false, which collapsed a real Gemini/Antigravity
      // tool-call response into empty_output/usage_only even though
      // gemini-to-openai.js translated and emitted it to the client.
      // Detection is deliberately signature-independent — thoughtSignature is
      // a Gemini 3 transport/round-trip detail, not evidence of a tool call.
      if (part?.functionCall) state.hasToolCall = true;
      if (!part?.text) continue;
      if (part.thought === true) state.hasReasoning = true;
      else state.hasText = true;
    }
  }
  const geminiFinish = geminiChunk.candidates?.[0]?.finishReason || geminiChunk.candidates?.[0]?.finish_reason;
  if (geminiFinish) applyFinishReason(state, geminiFinish);

  // OpenAI Responses API lifecycle (event name from `event:` framing or payload
  // type). Direct event-name default: some Responses streams carry ONLY the
  // `event:` framing (no type field or a type on a nested object), so if no
  // terminal was observed and the event name is a known lifecycle event, treat
  // it as authoritative. Guards against accidental matches on content events.
  const evName = opts.eventName || (typeof parsed.type === "string" ? parsed.type : null);
  if (evName && RESPONSES_TERMINALS[evName]) setTerminal(state, RESPONSES_TERMINALS[evName], evName);
  else if (evName && !state.terminalSeen && ["response.completed", "response.done", "response.failed", "response.incomplete", "response.cancelled"].includes(evName)) {
    setTerminal(state, RESPONSES_TERMINALS[evName], evName);
  }
  if (evName === "response.output_text.delta" && parsed.delta) state.hasText = true;
  if ((evName === "response.reasoning_text.delta" || evName === "response.reasoning_summary_text.delta") && parsed.delta) state.hasReasoning = true;
  if (evName === "response.function_call_arguments.delta") state.hasToolCall = true;
  if (evName === "response.output_item.added" && parsed.item?.type === "function_call") state.hasToolCall = true;

  // Ollama-style done=true carries final content/usage → semantically successful
  // termination. A BARE {done:true} is the translated [DONE] sentinel — neutral.
  if (parsed.done === true) {
    const hasPayload = Boolean(parsed.choices || parsed.message || parsed.content || parsed.usage);
    if (hasPayload) setTerminal(state, "success", "done");
    else setTerminal(state, null, "[DONE]");
  }

  return state;
}

/**
 * Observe one RAW SSE line (passthrough mode). Passthrough forwards bytes
 * without parsing, so observation here is best-effort pattern matching over
 * data:/event: units. Anchors are deliberately narrow (streaming deltas,
 * non-empty values) to avoid counting role-only chunks, tool-argument JSON
 * strings, or usage blocks as text/reasoning output.
 *
 * @param {object} state - createStreamState() instance
 * @param {string} line - single SSE line (already newline-split)
 */
export function observeRawSseLine(state, line) {
  if (!state || !line) return state;
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:") && !trimmed.startsWith("event:")) return state;

  if (trimmed.startsWith("event:")) {
    const evt = trimmed.slice(6).trim();
    if (RESPONSES_TERMINALS[evt]) setTerminal(state, RESPONSES_TERMINALS[evt], evt);
    else if (evt === "message_stop") setTerminal(state, "success", "message_stop");
    else if (evt === "error") { state.errorSeen = true; setTerminal(state, "failure", "error"); }
    return state;
  }

  const payload = trimmed.slice(5).trim();
  if (/^\[DONE\]$/.test(payload)) { setTerminal(state, null, "[DONE]"); return state; }
  if (/^:\s*(keep-alive|ping)/i.test(payload)) return state;

  // Terminals (OpenAI finish_reason incl. Gemini's camelCase variant, Claude message_stop)
  let m = payload.match(/"(?:finish_reason|finishReason)"\s*:\s*"(stop|end_turn|stop_sequence|tool_calls|function_call|length|max_tokens|content_filter)"/i);
  if (m) { applyFinishReason(state, m[1]); return state; }
  if (/"type"\s*:\s*"message_stop"/.test(payload)) { setTerminal(state, "success", "message_stop"); return state; }
  if (/"type"\s*:\s*"error"/.test(payload)) { state.errorSeen = true; setTerminal(state, "failure", "error"); return state; }

  // Output evidence — narrow delta anchors only.
  if (!state.hasText && /"delta"\s*:\s*\{\s*("role"\s*:\s*"[^"]*"\s*,\s*)?"content"\s*:\s*"(\\\\|\\"|[^"])+/.test(payload)) state.hasText = true;
  if (!state.hasReasoning && (
    /"reasoning_content"\s*:\s*"(\\\\|\\"|[^"])+/.test(payload) ||
    /"thinking"\s*:\s*"(\\\\|\\"|[^"])+"(?=\s*[},])/.test(payload)
  )) state.hasReasoning = true;
  if (!state.hasToolCall && /"tool_calls"\s*:\s*\[\s*\{/.test(payload)) state.hasToolCall = true;
  if (!state.hasUsage && /"(?:prompt_tokens|completion_tokens|input_tokens|output_tokens|promptTokenCount|candidatesTokenCount)"\s*:\s*\d+/.test(payload)) state.hasUsage = true;

  return state;
}
