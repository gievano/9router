const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2139}\u{25B6}\u{25C0}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}]/gu;

/**
 * Remove emoji glyphs from text that comes from logs or provider payloads.
 * Display-only: keeps the text readable without relying on OS emoji fonts.
 */
export function stripEmoji(text) {
  if (typeof text !== "string" || !text) return text;
  return text.replace(EMOJI_RE, "").replace(/[ \t]{2,}/g, " ").trimStart();
}

export default stripEmoji;
