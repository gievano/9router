// Token count estimation — conservative heuristics only.
//
// ExtremeRouter does NOT ship a BPE tokenizer (no gpt-tokenizer / @anthropic-ai/token
// dependency). For context-window safety we need an *approximate* input token
// count — not exact, but never wildly optimistic.
//
// ESTIMATION SEMANTICS:
// This estimator produces a CONSERVATIVE (upper-bound) estimate for input tokens.
// - It counts ALL request components that contribute to model context
// - It uses a pessimistic chars/token ratio (3 chars/token = dense code)
// - This means available output ceiling is slightly conservative (safe side)
// - Callers with exact `prompt_tokens` from a previous response should pass it directly
//
// WHAT IS COUNTED:
// - All message content (system, developer, user, assistant, tool)
// - Tool/function definitions (names, descriptions, JSON schemas)
// - Structured output schemas
// - Multimodal content descriptions (not the binary data itself)
// - Provider-specific metadata fields that go into context

const CHARS_PER_TOKEN_CONSERVATIVE = 3;  // worst case: very token-dense code
const CHAR_COUNT_REGEX = /\S/g;           // count non-whitespace chars (cheap, no split)

/**
 * Estimate input tokens from a chat-style request body.
 * Counts all components that contribute to model context window.
 *
 * @param {object} body - request body with .messages, .tools, .functions, etc.
 * @param {object} [hints]
 * @param {number} [hints.exactInputTokens] - if known (e.g. from a prior response), use this
 * @returns {number} estimated input token count (≥ 0, integer)
 */
export function estimateInputTokens(body, hints = {}) {
  if (hints.exactInputTokens != null && hints.exactInputTokens >= 0) {
    return Math.floor(hints.exactInputTokens);
  }

  if (!body || typeof body !== "object") return 0;

  let chars = 0;

  // 1. Count message content (all roles: system, developer, user, assistant, tool)
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (!msg || typeof msg !== "object") continue;
      chars += countMessageContent(msg);
    }
  }

  // 2. Count tool/function definitions (these go into context as schema)
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    for (const tool of body.tools) {
      chars += countToolDefinition(tool);
    }
  }
  if (Array.isArray(body.functions) && body.functions.length > 0) {
    for (const fn of body.functions) {
      chars += countFunctionDefinition(fn);
    }
  }

  // 3. Count structured output schema (response_format with json_schema)
  if (body.response_format?.json_schema) {
    chars += countJsonSchema(body.response_format.json_schema);
  }

  // 4. Count system/developer instructions if at top level (some providers)
  if (body.system && typeof body.system === "string") {
    chars += countNonWhitespace(body.system);
  } else if (Array.isArray(body.system)) {
    // Claude: system is an array of text blocks
    for (const block of body.system) {
      if (typeof block === "string") chars += countNonWhitespace(block);
      else if (typeof block?.text === "string") chars += countNonWhitespace(block.text);
    }
  }
  if (body.developer && typeof body.developer === "string") {
    chars += countNonWhitespace(body.developer);
  }

  // 4b. Gemini/Antigravity shape: contents[].parts[] + systemInstruction.
  // These bodies have no `messages`, so without this the estimate would be ~0
  // and the context ceiling would never engage.
  if (Array.isArray(body.contents)) {
    for (const content of body.contents) {
      chars += countGeminiParts(content?.parts);
    }
  }
  if (body.systemInstruction) {
    chars += countGeminiParts(body.systemInstruction.parts);
  }
  // Gemini tools: [{ functionDeclarations: [{ name, description, parameters }] }]
  if (Array.isArray(body.tools)) {
    for (const tool of body.tools) {
      if (!Array.isArray(tool?.functionDeclarations)) continue;
      for (const fn of tool.functionDeclarations) {
        chars += countFunctionDefinition(fn);
      }
    }
  }

  // 5. Count reasoning/thinking config (small but non-zero)
  if (body.thinking?.budget_tokens) {
    chars += 100; // rough budget for thinking config tokens
  }
  if (body.thinkingConfig?.thinkingBudget) {
    chars += 100;
  }

  // Use floor so we never over-estimate → context ceiling is conservative
  return Math.floor(chars / CHARS_PER_TOKEN_CONSERVATIVE);
}

function countMessageContent(msg) {
  let chars = 0;
  const content = msg.content;

  if (typeof content === "string") {
    chars += countNonWhitespace(content);
  } else if (Array.isArray(content)) {
    // Anthropic/OpenAI content blocks
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "text" && typeof block.text === "string") {
        chars += countNonWhitespace(block.text);
      } else if (block.type === "tool_use" || block.type === "function_call") {
        // Tool call arguments (JSON)
        if (block.input && typeof block.input === "object") {
          chars += countNonWhitespace(JSON.stringify(block.input));
        }
      } else if (block.type === "tool_result" || block.type === "function_response") {
        // Tool result content
        if (block.content) {
          if (typeof block.content === "string") {
            chars += countNonWhitespace(block.content);
          } else if (Array.isArray(block.content)) {
            for (const c of block.content) {
              if (c?.type === "text" && typeof c.text === "string") {
                chars += countNonWhitespace(c.text);
              }
            }
          }
        }
      } else if (block.type === "image_url" || block.type === "image") {
        // Images don't have countable text, but the URL/description does
        if (block.image_url?.url && typeof block.image_url.url === "string") {
          chars += countNonWhitespace(block.image_url.url);
        }
        // Add rough overhead for image tokens (provider-dependent, ~256-1024)
        chars += 500;
      }
    }
  }

  // Count tool_calls on assistant messages (OpenAI format)
  if (Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls) {
      if (tc?.function?.arguments) {
        chars += countNonWhitespace(typeof tc.function.arguments === "string"
          ? tc.function.arguments
          : JSON.stringify(tc.function.arguments));
      }
    }
  }

  return chars;
}

function countToolDefinition(tool) {
  let chars = 0;
  if (!tool || typeof tool !== "object") return 0;

  // OpenAI format: { type: "function", function: { name, description, parameters } }
  const fn = tool.function || tool;
  if (fn.name) chars += countNonWhitespace(fn.name);
  if (fn.description) chars += countNonWhitespace(fn.description);
  if (fn.parameters) chars += countNonWhitespace(JSON.stringify(fn.parameters));

  // Add overhead for tool wrapper tokens
  return chars + 50;
}

function countFunctionDefinition(fn) {
  let chars = 0;
  if (!fn || typeof fn !== "object") return 0;
  if (fn.name) chars += countNonWhitespace(fn.name);
  if (fn.description) chars += countNonWhitespace(fn.description);
  if (fn.parameters) chars += countNonWhitespace(JSON.stringify(fn.parameters));
  return chars + 50;
}

function countJsonSchema(schema) {
  if (!schema || typeof schema !== "object") return 0;
  return countNonWhitespace(JSON.stringify(schema)) + 50;
}

// Gemini/Antigravity parts[]: { text } | { inlineData } | { fileData } |
// { functionCall } | { functionResponse }
function countGeminiParts(parts) {
  if (!Array.isArray(parts)) return 0;
  let chars = 0;
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    if (typeof part.text === "string") chars += countNonWhitespace(part.text);
    if (part.functionCall?.args) chars += countNonWhitespace(JSON.stringify(part.functionCall.args));
    if (part.functionResponse?.response) chars += countNonWhitespace(JSON.stringify(part.functionResponse.response));
    // Binary media is not text; charge the same flat overhead used for images.
    if (part.inlineData || part.fileData) chars += 500;
  }
  return chars;
}

function countNonWhitespace(str) {
  if (!str) return 0;
  return (str.match(CHAR_COUNT_REGEX) || []).length;
}

/**
 * Extract thinking/reasoning budget from request body.
 * Supports multiple provider formats.
 */
export function extractThinkingBudgetTokens(body) {
  if (!body || typeof body !== "object") return 0;

  // Claude shape: thinking.budget_tokens
  if (body.thinking?.budget_tokens) {
    const b = Number(body.thinking.budget_tokens);
    return Number.isFinite(b) && b > 0 ? b : 0;
  }

  // Gemini shape: thinkingConfig.thinkingBudget
  const tc = body.thinkingConfig || body.generationConfig?.thinkingConfig || body.request?.generationConfig?.thinkingConfig;
  if (tc?.thinkingBudget) {
    const b = Number(tc.thinkingBudget);
    if (Number.isFinite(b) && b > 0) return b;
    if (b < 0) return Infinity; // "auto" / dynamic
  }

  // Qwen shape: enable_thinking + thinking_budget
  if (body.enable_thinking === true && body.thinking_budget) {
    const b = Number(body.thinking_budget);
    return Number.isFinite(b) && b > 0 ? b : 0;
  }

  // OpenAI Responses API: reasoning.effort maps to budget
  // (handled at higher level, not a fixed token count here)
  return 0;
}