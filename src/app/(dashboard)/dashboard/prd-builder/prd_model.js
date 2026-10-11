/**
 * Pure logic behind the PRD Builder: the one-shot prompt, draft persistence,
 * and shared helpers.
 *
 * Kept out of the JSX component so the test suite can import it directly -
 * vitest here has no JSX transform.
 */

/** localStorage key. Stable so a draft survives reloads and code changes. */
export const STORAGE_KEY = "prd-builder-draft-v1";

/**
 * The whole builder in one call. The PRD is written in a single pass: the
 * wizard that asked six questions and generated section by section asked the
 * user to do the structuring work the model should be doing. One prompt, one
 * complete document.
 *
 * Section titles are requested in the user's own language rather than pinned
 * to English - an Indonesian prompt should yield an Indonesian PRD, matching
 * how the rest of the dashboard follows whatever language it is given.
 */
export function buildPrompt(prompt) {
  return [
    "You are writing a complete PRD (Product Requirements Document) in one pass.",
    "",
    "Request from the user:",
    prompt.trim() || "(no request given)",
    "",
    "Cover these sections, in this order, using headings:",
    "1. Overview - what is being built and why it matters now",
    "2. Problem & background - who hits this problem, how often, what they do today",
    "3. Goals - 3-5 measurable outcomes",
    "4. Users - who uses it, in what situation, with what alternative today",
    "5. Features - each feature as a bullet with a priority (Must / Should / Nice)",
    "6. Non-goals - explicitly out of scope, with a one-line reason each",
    "7. Technical constraints - platform, data, performance, security",
    "8. Success criteria - checkboxes someone else can verify without asking you",
    "9. Risks & open questions - what could block this, what still needs a decision",
    "",
    "Rules:",
    "- Write section titles and body in the same language as the user's request.",
    "- No preamble, no closing summary. Start at the Overview heading.",
    "- Do not invent requirements the user did not ask for; where a detail is",
    "  missing, write it as an open question in section 9 instead of guessing.",
    "- Markdown only. No code fences except where a spec genuinely needs one.",
    "- Target 400-700 words: complete, not padded.",
  ].join("\n");
}

/**
 * Read a draft back, tolerating an empty store and a corrupt payload. An
 * older draft written by the section-by-section version has a different
 * shape, so anything unrecognised normalises to an empty draft instead of
 * crashing the page on load.
 */
export function loadDraft(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      model: typeof parsed.model === "string" ? parsed.model : "",
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : "",
      document: typeof parsed.document === "string" ? parsed.document : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

/**
 * Persist a draft. Returns false instead of throwing when storage is
 * unavailable (private mode, quota) - losing autosave must not break the page.
 */
export function saveDraft(storage, draft) {
  if (!storage) return false;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        model: String(draft.model || ""),
        prompt: String(draft.prompt || ""),
        document: String(draft.document || ""),
        updatedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
