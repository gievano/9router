"use client";

// Marks for the custom plugins and the native model capabilities.
//
// SVG rather than the material-symbols font on purpose. The project ships only a
// 143-glyph subset of that font, so a name outside the subset renders blank, and
// a ligature is shared with every other surface that uses it — a plugin mark
// could not be told apart from an unrelated button. These paths are unique per
// mark and legible at 11px and at 24px.
//
// One drawing language, not nine separate styles:
//   * a single closed or half-closed shape carries the meaning;
//   * one accent (a dot, a tick, an arrow) says what the shape IS doing;
//   * round caps and joins, 24x24 grid, nothing smaller than 2.4 units.
// A mark is a diagram of its job, never a logo badge: it must still read as the
// same family when drawn at 14px in a model row next to another one.

const PLUGIN_MARKS = {
  // Vision: an eye — an almond lens with a solid pupil. "Sees the image."
  vision: (
    <>
      <path d="M3 12s3.6-5.2 9-5.2 9 5.2 9 5.2-3.6 5.2-9 5.2-9-5.2-9-5.2z" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Image Vision: viewfinder corners around the same pupil — the frame a
  // picture goes into. Same fact as native vision, drawn one step apart.
  imageVision: (
    <>
      <path d="M4 8.5V5.5A1.5 1.5 0 0 1 5.5 4h3M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Reasoning: three concepts joined — a chain of thought drawn as a graph.
  reasoning: (
    <>
      <circle cx="5.8" cy="7" r="2.3" />
      <circle cx="18.2" cy="7" r="2.3" />
      <circle cx="12" cy="17.2" r="2.3" />
      <path d="M8.1 7h7.8M7.2 9l3.6 6.3M16.8 9l-3.6 6.3" />
    </>
  ),
  // Think Deeper: an arrow driven down through two layers — depth, not speed.
  thinkDeeper: (
    <>
      <path d="M12 3.5v11.5" />
      <path d="M7.2 10.4L12 15l4.8-4.6" />
      <path d="M4.5 18.2h15" />
    </>
  ),
  // Speed Mode: two wind streaks with a leading point — pulled ahead, not a
  // bolt (a bolt is the ligature this replaced) and not a speedometer.
  speedMode: (
    <>
      <path d="M4 8.5c3.4-2.4 9.2-2.4 12.6 0" />
      <path d="M6 14c3-2 8-2 11 0" />
      <circle cx="18.6" cy="17.8" r="2.2" />
    </>
  ),
  // JSON Guard: braces sealing a marked object — the structure is closed.
  jsonGuard: (
    <>
      <path d="M9.4 4.5C7.9 4.5 7.5 5.3 7.5 6.6v2c0 1.2-.6 1.9-1.7 1.9 1.1 0 1.7.7 1.7 1.9v2c0 1.3.4 2.1 1.9 2.1" />
      <path d="M14.6 4.5c1.5 0 1.9.8 1.9 2.1v2c0 1.2.6 1.9 1.7 1.9-1.1 0-1.7.7-1.7 1.9v2c0 1.3-.4 2.1-1.9 2.1" />
      <circle cx="12" cy="12.4" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  // Context Squeezer: two presses closing on a stack — same content, less room.
  contextSqueezer: (
    <>
      <path d="M12 4v4.6M8.6 7.2L12 10.4l3.4-3.2" />
      <path d="M12 20v-4.6M8.6 16.8L12 13.6l3.4 3.2" />
      <path d="M4.5 12h15" />
    </>
  ),
  // OpenAI Tool Bridge: two half-docks joined by one cable — a call crossing.
  openaiToolBridge: (
    <>
      <path d="M4.5 6.5v11" />
      <path d="M19.5 6.5v11" />
      <path d="M4.5 12c3 0 4-3.4 7.5-3.4S16.5 12 19.5 12" />
      <circle cx="12" cy="12" r="1.7" />
    </>
  ),
  // Anti Slop: a funnel — the flow passes, the specks are caught at the neck.
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
 * renders nothing — never a ligature fallback.
 */
function PluginMark({ name, size = 20, strokeWidth = 1.7, className = "" }) {
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