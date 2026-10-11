"use client";

// Marks for the custom plugins and the native model capabilities.
//
// SVG rather than the material-symbols font on purpose. The project ships only a
// 143-glyph subset of that font, so a name outside the subset renders blank, and
// a ligature is shared with every other surface that uses it - a plugin mark
// could not be told apart from an unrelated button. These paths are unique per
// mark and legible at 14px and at 24px.
//
// One drawing language:
//   * a single shape + one accent, 24x24 grid, round caps, strokes >= 2.0;
//   * colour is NOT carried by the tile - the caller's tile is neutral and the
//     glyph itself is the accent, so seven plugins read as one system instead of
//     seven unrelated coloured chips;
//   * a mark must survive being drawn at 14px in a model row next to another,
//     so no hairlines and no detail finer than 2.4 units.

const PLUGIN_MARKS = {
  // Vision: an eye - an almond lens with a solid pupil. "Sees the image."
  vision: (
    <>
      <path d="M3 12s3.6-5.2 9-5.2 9 5.2 9 5.2-3.6 5.2-9 5.2-9-5.2-9-5.2z" />
      <circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none" />
    </>
  ),
  // Image Vision: viewfinder corners around the same pupil - the frame a
  // picture goes into. One step apart from native vision on purpose.
  imageVision: (
    <>
      <path d="M4 8.5V5.5A1.5 1.5 0 0 1 5.5 4h3M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3" />
      <circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none" />
    </>
  ),
  // Reasoning: three concepts joined - a chain of thought drawn as a graph.
  reasoning: (
    <>
      <circle cx="5.8" cy="7" r="2.3" />
      <circle cx="18.2" cy="7" r="2.3" />
      <circle cx="12" cy="17.2" r="2.3" />
      <path d="M8.1 7h7.8M7.2 9l3.6 6.3M16.8 9l-3.6 6.3" />
    </>
  ),
  // Think Deeper: stacked layers with a chevron driving down through them -
  // depth. (The previous arrow-through-a-line read as "download".)
  thinkDeeper: (
    <>
      <path d="M4 4.8h16" />
      <path d="M6.4 9.6h11.2" />
      <path d="M8.8 14.4h6.4" />
      <path d="M9.4 18l2.6 2.6L14.6 18" />
    </>
  ),
  // Speed Mode: a play triangle with two trails - go now, answer directly.
  // (The earlier streaks-with-a-dot read as a speedometer doodle.)
  speedMode: (
    <>
      <path d="M9 6.6l9 5.4-9 5.4z" />
      <path d="M5.4 8.4v7.2" />
    </>
  ),
  // JSON Guard: braces sealing a checked value - the structure is valid.
  jsonGuard: (
    <>
      <path d="M9.4 4.5C7.9 4.5 7.5 5.3 7.5 6.6v2c0 1.2-.6 1.9-1.7 1.9 1.1 0 1.7.7 1.7 1.9v2c0 1.3.4 2.1 1.9 2.1" />
      <path d="M14.6 4.5c1.5 0 1.9.8 1.9 2.1v2c0 1.2.6 1.9 1.7 1.9-1.1 0-1.7.7-1.7 1.9v2c0 1.3-.4 2.1-1.9 2.1" />
      <path d="M9.6 12.2l1.7 1.7 3.2-3.4" />
    </>
  ),
  // Context Squeezer: two presses closing on a stack - same content, less room.
  contextSqueezer: (
    <>
      <path d="M12 4v4.6M8.6 7.2L12 10.4l3.4-3.2" />
      <path d="M12 20v-4.6M8.6 16.8L12 13.6l3.4 3.2" />
      <path d="M4.5 12h15" />
    </>
  ),
  // OpenAI Tool Bridge: two half-docks joined by one cable - a call crossing.
  openaiToolBridge: (
    <>
      <path d="M4.5 6.5v11" />
      <path d="M19.5 6.5v11" />
      <path d="M4.5 12c3 0 4-3.4 7.5-3.4S16.5 12 19.5 12" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  // Anti Slop: a funnel - the flow passes, the specks are caught at the neck.
  antiSlop: (
    <>
      <path d="M4.5 5.5h15l-4.6 6.4v5.2l-5.8 2.6v-7.8z" />
      <path d="M8 8.6h8" />
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