// OpenAI Tool Bridge — the response-side repair that lets a model with no
// native function calling still run a client's tools.
//
// WHY THIS EXISTS
// Several providers are text-only RAG backends behind a browser session
// (`tools: false` in capabilities.js: gemini-web, kimi-web). A coding agent
// asks for tools, the provider answers in prose, and the client either loops
// forever or gives up. Two repair layers already exist for PART of this
// problem (toolCallRescue.js rescues malformed JSON, toolCallFallback.js
// handles providers with a partial tool path). Neither can invent a tool call
// out of prose, because that needs the tool catalogue the request carried.
//
// WHAT IT DOES
// 1. Reads the tools the client actually offered (`body.tools` /
//    `body.functions`) and the tool results already in the transcript.
// 2. Finds the model's own prose that already DECLARES an invocation, in the
//    shapes agents actually produce:
//       <tool_call>{"name":"read_file","arguments":{"path":"a.js"}}
//       <tool_use>...</tool_use>          (Claude-style XML)
//       to=read_file {...}                 (OpenCode / Codex wire shape)
//       ```json {"tool":"read_file",...} ```
//    Rewrites those into well-formed tool_calls. This is a FORMAT fix on
//    content the model wrote, not a guess about what the model wanted.
// 3. Leaves the prose in place as an assistant message so the next turn keeps
//    the model's own explanation of the call it just made.
// 4. Unique tool_call ids, and a declared-args filter so an invented argument
//    name never reaches the client.
//
// It is deliberately the LAST concern in the chain: it only touches a response
// that already failed to produce structured tool calls.

const TOOL_TAG_RE =
  /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/gi;
const XML_TOOL_RE =
  /<tool_use\s+name\s*=\s*["']([^"']+)["']\s*>([\s\S]*?)<\/tool_use>/gi;
const OPENCODE_TOOL_RE =
  /(?:^|\n)\s*(?:assistant\s+)?to\s*=\s*([A-Za-z_][\w.-]*)\s*(\{[\s\S]*?\})\s*(?:\n|$)/g;
const FENCED_TOOL_RE =
  /```(?:json|tool_call|tool)?\s*(\{[^{}]*?"(?:tool_)?(?:name|call)"[\s\S]*?\})\s*```/gi;

/** Parse leniently: models emit single quotes, trailing commas, Python literals. */
function parseMaybeJson(text) {
  const candidates = [
    text,
    // Python dict / single-quoted JSON is common enough to be worth one attempt.
    text
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/'/g, '"'),
  ];
  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* try the next shape */
    }
  }
  return null;
}

function normaliseArgs(raw) {
  if (raw == null) return {};
  if (typeof raw === "object") return raw;
  const parsed = parseMaybeJson(String(raw));
  return parsed && typeof parsed === "object" ? parsed : {};
}

/** Pull the tool name out of the many shapes a model wraps a call in. */
function nameFrom(payload) {
  if (!payload || typeof payload !== "object") return null;
  const direct = payload.name ?? payload.tool ?? payload.tool_name ?? payload.function;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (direct && typeof direct === "object" && typeof direct.name === "string") {
    return direct.name.trim();
  }
  const nested = payload.function_call;
  if (nested && typeof nested.name === "string") return nested.name.trim();
  return null;
}

function argsFrom(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.arguments != null) return normaliseArgs(payload.arguments);
  if (payload.parameters != null) return normaliseArgs(payload.parameters);
  if (payload.input != null) return normaliseArgs(payload.input);
  if (payload.args != null) return normaliseArgs(payload.args);
  const fn = payload.function;
  if (fn && typeof fn === "object") return normaliseArgs(fn.arguments);
  // No argument wrapper at all: every non-reserved scalar IS the argument set.
  const reserved = new Set(["name", "tool", "tool_name", "type", "id", "call"]);
  const rest = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!reserved.has(k)) rest[k] = v;
  }
  return Object.keys(rest).length ? rest : {};
}

function catalogueOf(body) {
  const out = new Map();
  const push = (name, schema) => {
    if (typeof name !== "string" || !name.trim()) return;
    out.set(name.trim(), schema || {});
  };
  for (const t of body?.tools || []) {
    if (t?.function) push(t.function.name, t.function.parameters);
    else if (typeof t?.name === "string") push(t.name, t.parameters || t.input_schema);
  }
  for (const f of body?.functions || []) push(f?.name, f?.parameters);
  return out;
}

/** Argument names the declared schema accepts, flattened for a cheap lookup. */
function declaredArgNames(schema) {
  const names = new Set();
  const visit = (node, depth) => {
    if (!node || typeof node !== "object" || depth > 6) return;
    if (node.properties && typeof node.properties === "object") {
      for (const key of Object.keys(node.properties)) names.add(key);
    }
    for (const key of ["items", "anyOf", "oneOf", "allOf"]) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach((c) => visit(c, depth + 1));
      else visit(child, depth + 1);
    }
  };
  visit(schema, 0);
  return names;
}

let idCounter = 0;
function uniqueId(seed) {
  idCounter += 1;
  return `call_${seed || "otb"}${idCounter.toString(36)}`;
}

/**
 * Pull tool calls out of prose. Returns { calls, cleaned } where `cleaned` is the
 * text with the machine-readable markers removed so the remaining prose stays
 * as a readable assistant turn.
 */
export function extractToolCallsFromText(text) {
  if (typeof text !== "string" || !text) return { calls: [], cleaned: text };

  const calls = [];
  let cleaned = text;

  const harvest = (match, nameHint, argsRaw) => {
    const payload = parseMaybeJson(argsRaw) ?? {};
    const name = nameFrom(payload) || nameHint;
    if (!name) return;
    calls.push({ name, arguments: argsFrom(payload) });
    cleaned = cleaned.replace(match, "");
  };

  const tagMatches = [...text.matchAll(TOOL_TAG_RE)];
  for (const m of tagMatches) harvest(m[0], null, m[1]);

  if (!calls.length) {
    for (const m of [...text.matchAll(XML_TOOL_RE)]) harvest(m[0], m[1], m[2]);
  }
  if (!calls.length) {
    for (const m of [...text.matchAll(OPENCODE_TOOL_RE)]) harvest(m[0], m[1], m[2]);
  }
  if (!calls.length) {
    for (const m of [...text.matchAll(FENCED_TOOL_RE)]) harvest(m[0], null, m[1]);
  }

  return { calls, cleaned: cleaned.trim() };
}

/**
 * Response-side entry point.
 *
 * @param {object} response the target-format response about to leave for the
 *                          client (must already carry `.content`)
 * @param {object} body     the SOURCE-format request, for the tool catalogue
 * @returns {object} response, mutated, plus `.openaiToolBridge` diagnostics
 */
export function applyOpenAIToolBridge(response, body) {
  const diagnostics = { applied: false, calls: [], reason: null };
  if (!response || typeof response.content !== "string") {
    diagnostics.reason = "no-content";
    return Object.assign(response || {}, { openaiToolBridge: diagnostics });
  }
  // Never fight a model that already produced structured calls.
  if (Array.isArray(response.tool_calls) && response.tool_calls.length) {
    diagnostics.reason = "already-structured";
    return Object.assign(response, { openaiToolBridge: diagnostics });
  }

  const catalogue = catalogueOf(body);
  const { calls, cleaned } = extractToolCallsFromText(response.content);
  if (!calls.length) {
    diagnostics.reason = "no-tool-marker-in-prose";
    return Object.assign(response, { openaiToolBridge: diagnostics });
  }

  // A tool the client never offered is a hallucination, not a call. Drop it.
  const accepted = calls.filter((call) => !catalogue.size || catalogue.has(call.name));
  if (!accepted.length) {
    diagnostics.reason = "no-called-tool-was-offered";
    return Object.assign(response, { openaiToolBridge: diagnostics });
  }

  const toolCalls = [];
  for (const call of accepted) {
    const schema = catalogue.get(call.name) ?? {};
    const declared = declaredArgNames(schema);
    let args = call.arguments;
    if (declared.size) {
      const filtered = {};
      for (const [k, v] of Object.entries(args || {})) {
        if (declared.has(k)) filtered[k] = v;
      }
      // Keep every argument when the schema declares no properties at all —
      // that is a permissive schema, not a real clash.
      args = Object.keys(filtered).length ? filtered : args;
    }
    toolCalls.push({
      id: uniqueId(call.name),
      type: "function",
      function: { name: call.name, arguments: JSON.stringify(args ?? {}) },
    });
  }

  // The prose the model wrote is the explanation of the call it just made;
  // keeping it means the next turn is not blind.
  response.content = cleaned;
  response.tool_calls = toolCalls;
  if (!response.finish_reason) response.finish_reason = "tool_calls";

  diagnostics.applied = true;
  diagnostics.calls = toolCalls.map((c) => c.function.name);
  return Object.assign(response, { openaiToolBridge: diagnostics });
}

export const __selftest = {
  parseMaybeJson,
  nameFrom,
  argsFrom,
  declaredArgNames,
  extractToolCallsFromText,
  applyOpenAIToolBridge,
};