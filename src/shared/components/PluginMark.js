"use client";

// Marks for the custom plugins and the native model capabilities.
//
// SVG rather than the material-symbols font on purpose. The project ships only a
// 143-glyph subset of that font, so a name outside the subset renders blank, and
// a ligature is shared with every other surface that uses it - a plugin mark
// could not be told apart from an unrelated button.
//
// Literal marks, not abstractions. Each one is the familiar object the plugin is
// named after - a framed landscape for Image Vision, a rocket for Speed Mode, a
// shield for JSON Guard, scissors for Context Squeezer - so a mark can be read
// from its shape alone instead of needing its label beside it. The earlier
// pictograms were geometric one-liners (frames, chevrons, braces) and people
// could not tell what they stood for.
//
// One drawing language: 24 grid, uniform stroke with round caps and joins,
// nothing finer than 2.4 units, at most three filled accents per mark. Colour is
// NOT carried by the glyph - the caller picks the ink, so the plugin card wears
// the theme accent and a dense model row stays muted without a second set.

const PLUGIN_MARKS = {
  // Image Vision: a framed landscape - sun over a ridgeline. The universal
  // "photo" glyph, so it reads as images without a caption.
  imageVision: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="8.8" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <path d="M4.5 16.4l4-4.4 3.1 3.5 2.3-2.4 4.1 3" />
    </>
  ),
  // Native vision: the eye - a lens with a solid pupil.
  vision: (
    <>
      <path d="M2.5 12c2.6-4 5.9-6 9.5-6s6.9 2 9.5 6c-2.6 4-5.9 6-9.5 6s-6.9-2-9.5-6z" />
      <circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none" />
    </>
  ),
  adaptiveThinking: (
    <>
      <path d="M11.9 5.1a4.4 4.4 0 0 0-5.5 2.1 3.1 3.1 0 0 0-2 3.2 3.3 3.3 0 0 0 .6 1.9 3.2 3.2 0 0 0 .1 3.7 4 4 0 0 0 3.7 2.5h1.6v-3.4" />
      <path d="M12.1 5.1a4.4 4.4 0 0 1 5.5 2.1 3.1 3.1 0 0 1 2 3.2 3.3 3.3 0 0 1-.6 1.9 3.2 3.2 0 0 1-.1 3.7 4 4 0 0 1-3.7 2.5h-1.6v-3.4" />
      <path d="M12 8.5v7m0 0-2.5-2.5M12 15.5l2.5-2.5" />
      <circle cx="8.3" cy="9.2" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="9.2" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Native reasoning: a brain with a visible crack running through it - the two
  // halves of a chain of thought being worked. Gyri on the perimeter and a
  // zig-zag split keep it from reading as a smooth bean.
  reasoning: (
    <>
      <path d="M11.6 5.4a4 4 0 0 0-5 2 3 3 0 0 0-1.9 3 3.1 3.1 0 0 0 .6 1.8 3 3 0 0 0 .2 3.4 3.8 3.8 0 0 0 3.4 2.3h2v-1.4" />
      <path d="M12.4 5.4a4 4 0 0 1 5 2 3 3 0 0 1 1.9 3 3.1 3.1 0 0 1-.6 1.8 3 3 0 0 1-.2 3.4 3.8 3.8 0 0 1-3.4 2.3h-2v-1.4" />
      <path d="M12 12.6 11 11l2-2-1-1.8M12 12.6l1 1.7-1.9 1.9" />
      <circle cx="8.3" cy="9.2" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="9.2" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  // Speed Mode: a rocket - the answer leaves now, no waiting on thinking.
  speedMode: (
    <>
      <path d="M12 2.6c2.9 2.4 4.4 5.7 4.4 9.1L12 16.2l-4.4-4.5c0-3.4 1.5-6.7 4.4-9.1z" />
      <path d="M8.4 11.4 5 14.4l2.7 1.1M15.6 11.4 19 14.4l-2.7 1.1" />
      <path d="M12 16.2v5.2" />
      <circle cx="12" cy="9.4" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // JSON Guard: a shield with a check - the payload is valid and protected.
  jsonGuard: (
    <>
      <path d="M12 2.6 4.6 5.4v6.1c0 4.4 3 7.9 7.4 9.4 4.4-1.5 7.4-5 7.4-9.4V5.4z" />
      <path d="m8.6 11.8 2.6 2.6 4.4-4.6" />
    </>
  ),
  // Context Squeezer: scissors - the oldest turns get cut to fit the window.
  contextSqueezer: (
    <>
      <circle cx="6" cy="6.4" r="2.7" />
      <circle cx="6" cy="17.6" r="2.7" />
      <path d="M20 4 8.6 15.4M14.2 14.2 20 20M8.6 8.6 12.4 12.4" />
    </>
  ),
  // OpenAI Tool Bridge: a wrench - the tool call the text-only model could not
  // make, recovered and handed back to the client.
  openaiToolBridge: (
    <path d="M15 6.3a1 1 0 0 0 0 1.4l1.5 1.5a1 1 0 0 0 1.4 0l3.3-3.3a6 6 0 0 1-7.9 7.9l-6.3 6.3a2.1 2.1 0 0 1-3-3l6.3-6.3a6 6 0 0 1 7.9-7.9z" />
  ),
  // Anti Slop: a broom - a slanted shaft meeting a wide head with bristles
  // fanned below it, sweeping the generic output away.
  antiSlop: (
    <>
      <path d="M19.4 4l-4.6 5.5" />
      <path d="M13.6 7.2l-5.4 4.6 4 4 4.6-5.4z" />
      <path d="M8.6 11.8 4 7.8M7.4 14.6l-4.2-3M6.2 17.4 2 14.5" />
    </>
  ),

};

/**
 * One wrapper for every mark so stroke weight, caps and sizing live in one place
 * and cannot drift between the card tile and a model row. An unknown name
 * renders nothing - never a ligature fallback.
 */
function PluginMark({ name, size = 20, strokeWidth = 2, className = "" }) {
  const mark = PLUGIN_MARKS[name];
  if (!mark) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {mark}
    </svg>
  );
}

export default PluginMark;