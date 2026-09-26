/**
 * JSON Fence Unwrapper — strips markdown code fences (```json ... ```) from
 * LLM responses when the client requested structured output (json_schema or
 * json_object).
 *
 * Many providers (especially Claude-backed ones) wrap JSON output in markdown
 * fences even when instructed not to. This utility unwraps the fence so the
 * client receives clean JSON that can be parsed directly.
 *
 * Only applies when response_format indicates JSON mode — normal prose
 * containing code blocks is left untouched.
 */

/**
 * Check if a response_format object requests JSON output.
 * @param {Object} responseFormat - The response_format field from the request body
 * @returns {boolean}
 */
export function isJsonMode(responseFormat) {
  if (!responseFormat || typeof responseFormat !== "object") return false;
  return responseFormat.type === "json_schema" || responseFormat.type === "json_object";
}

/**
 * Strip markdown code fences from JSON content.
 *
 * Handles common fence variations:
 *   ```json\n{...}\n```
 *   ```\n{...}\n```
 *   ```json{...}```
 *
 * Does NOT touch content that doesn't look like a fence — prose containing
 * code blocks is preserved.
 *
 * @param {string} content - The response content string
 * @returns {string} Content with fences stripped (or original if no fence)
 */
export function unwrapJsonFence(content) {
  if (typeof content !== "string" || !content) return content;

  const trimmed = content.trim();

  // Must start with ``` to be a fence
  if (!trimmed.startsWith("```")) return content;

  // Strip opening fence: ```json or ```
  const afterOpen = trimmed.replace(/^```(?:json)?\s*\n?/i, "");

  // Strip closing fence
  const withoutClose = afterOpen.replace(/\n?```\s*$/, "");

  // If nothing changed (no closing fence found), return original
  if (withoutClose === afterOpen && afterOpen === trimmed.replace(/^```(?:json)?\s*/i, "")) {
    return content;
  }

  return withoutClose.trim();
}

/**
 * Process a complete response: unwrap JSON fences if JSON mode is active.
 * Only for non-streaming responses (streaming needs stateful transform).
 *
 * @param {string} content - The full response content
 * @param {Object} responseFormat - The request's response_format field
 * @returns {string} Processed content
 */
export function processJsonResponse(content, responseFormat) {
  if (!isJsonMode(responseFormat)) return content;
  return unwrapJsonFence(content);
}
