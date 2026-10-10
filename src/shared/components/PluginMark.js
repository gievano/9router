"use client";

// Marks for the custom plugins and the native model capabilities.
//
// SVG rather than the material-symbols font on purpose. The project ships only a
// 143-glyph subset of that font, so a name outside the subset renders blank, and
// a ligature is shared with every other surface that uses it — a plugin mark
// could not be told apart from an unrelated button. These paths are unique per
// mark and legible at 11px (a docked badge) and at 22px (a card tile).
//
// currentColor carries the colour, so callers keep the Tailwind colour classes
// they already used for the ligature.
//
// Each mark answers one question, and says it as a diagram rather than a symbol:
// vision sees, reasoning connects, thinkDeeper goes deeper, speedMode moves,
// jsonGuard locks structure, contextSqueezer compresses, openaiToolBridge joins,
// antiSlop filters.

const PLUGIN_MARKS = {
  // Vision: an eye — a lens with a pupil. "Sees the image."
  vision: (
    <>
      <path d="M2.5 12S6.4 5.5 12 5.5 21.5 12 21.5 12 17.6 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 10.4v3.2M10.4 12h3.2" strokeWidth="1.1" />
    </>
  ),
  // Image Vision: the same eye as native vision - plugin and capability
  // are the same fact here (the plugin is what turns vision on).
  imageVision: (
    <>
      <path d="M2.5 12S6.4 5.5 12 5.5 21.5 12 21.5 12 17.6 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 10.4v3.2M10.4 12h3.2" strokeWidth="1.1" />
    </>
  ),
  // Reasoning: three concepts joined — a chain of thought, drawn as a graph.
  reasoning: (
    <>
      <circle cx="6" cy="6.5" r="2.4" />
      <circle cx="18" cy="6.5" r="2.4" />
      <circle cx="12" cy="17.5" r="2.4" />
      <path d="M8.4 6.5h7.2M7.3 8.7l3.4 6.6M16.7 8.7l-3.4 6.6" />
    </>
  ),
  // Think Deeper: concentric arcs opening inward — each layer further down.
  thinkDeeper: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-8.5-8.5" />
      <path d="M17.2 12a5.2 5.2 0 1 1-5.2-5.2" />
      <path d="M13.9 12a1.9 1.9 0 1 1-1.9-1.9" />
    </>
  ),
  // Speed Mode: a speedometer needle swung past the top — measured fast.
  speedMode: (
    <>
      <path d="M4 16.5a8 8 0 0 1 16 0" />
      <path d="M12 16.5l5.4-5.8" />
      <circle cx="12" cy="16.5" r="1.4" />
      <path d="M4 16.5h2.2M17.8 16.5H20" />
    </>
  ),
  // JSON Guard: braces holding a padlock — the structure is kept closed.
  jsonGuard: (
    <>
      <path d="M9 4.5C7.4 4.5 7 5.3 7 6.7v2c0 1.2-.6 1.8-1.7 1.8 1.1 0 1.7.6 1.7 1.8v2c0 1.4.4 2.2 2 2.2" />
      <path d="M15 4.5c1.6 0 2 .8 2 2.2v2c0 1.2.6 1.8 1.7 1.8-1.1 0-1.7.6-1.7 1.8v2c0 1.4-.4 2.2-2 2.2" />
      <rect x="9.8" y="11.4" width="4.4" height="3.6" rx="1" />
      <path d="M10.9 11.4v-1.2a1.1 1.1 0 0 1 2.2 0v1.2" />
    </>
  ),
  // Context Squeezer: two plates pressing a stack — same turns, less room.
  contextSqueezer: (
    <>
      <path d="M4 4.5h16M4 19.5h16" />
      <path d="M8 8.5h8M9.3 12h5.4M10.4 15.5h3.2" />
    </>
  ),
  // OpenAI Tool Bridge: an arch with piers — a call crosses the gap.
  openaiToolBridge: (
    <>
      <path d="M3 15.5h18" />
      <path d="M6.5 15.5v-2.8a5.5 5.5 0 0 1 11 0v2.8" />
      <path d="M4.5 19v-3.5M19.5 19v-3.5" />
      <circle cx="12" cy="12.7" r="1.5" />
    </>
  ),
  // Anti Slop: a sieve — the material passes, the specks stay in the mesh.
  antiSlop: (
    <>
      <circle cx="12" cy="10" r="6.6" />
      <path d="M8 6.4l4.2 7.6M15.9 6.3 11.6 13.9" />
      <path d="M7.5 19.4l1.3-1.9M12 20.5l1.4-2.3M16.4 19.4l1.4-2" />
    </>
  ),
};

/**
 * One wrapper for every mark so stroke weight, caps and sizing live in one place
 * and cannot drift between the card tile, the docked badge and a model row.
 * An unknown name renders nothing — never a ligature fallback.
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