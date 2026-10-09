"use client";

// Dedicated marks for the six custom plugins.
//
// SVG rather than the material-symbols font on purpose. The project ships only a
// 143-glyph subset of that font, so a name outside the subset renders blank, and
// a ligature is shared with every other surface that uses it — a plugin mark could
// not be told apart from an unrelated button. These paths are unique per plugin
// and legible at 13px (a docked badge) and at 22px (a card tile).
//
// currentColor carries the colour, so callers keep the Tailwind colour classes
// they already used for the ligature.

const PLUGIN_MARKS = {
  // Image Vision: a frame with a lens and a ray — "look at this picture".
  imageVision: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="3.2" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 7.8v1.6M12 14.6v1.6M7.8 12h1.6M14.6 12h1.6" />
    </>
  ),
  // Think Deeper: a trace that climbs through three stops — deliberate depth.
  thinkDeeper: (
    <>
      <path d="M3.5 18.5h4l3-6 3.4 3.2 3.1-8.2h3.5" />
      <circle cx="7.5" cy="18.5" r="1.6" />
      <circle cx="10.5" cy="12.5" r="1.6" />
      <circle cx="13.9" cy="15.7" r="1.6" />
      <circle cx="17" cy="7.5" r="1.6" />
    </>
  ),
  // Speed Mode: a chevron pair with speed lines — motion, not a bolt.
  speedMode: (
    <>
      <path d="M4 6.5l6 5.5-6 5.5M13 6.5l6 5.5-6 5.5" />
      <path d="M20.5 7.5v8" />
    </>
  ),
  // JSON Guard: a brace pair closed by a bar — structure kept valid.
  jsonGuard: (
    <>
      <path d="M9.5 4.5c-2.2 0-2.6 1-2.6 2.6v2.1c0 1.5-.7 2.3-2.1 2.3 1.4 0 2.1.8 2.1 2.3v2.1c0 1.6.4 2.6 2.6 2.6" />
      <path d="M14.5 4.5c2.2 0 2.6 1 2.6 2.6v2.1c0 1.5-.7 2.3-2.1 2.3-1.4 0-2.1.8-2.1 2.3v2.1c0 1.6-.4 2.6-2.6 2.6" />
      <path d="M12 8.6v6.8" />
    </>
  ),
  // Context Squeezer: a funnel narrowing lines — fit, not delete.
  contextSqueezer: (
    <>
      <path d="M3.5 5.5h17l-6.2 7.2v6.3l-4.6 2.4v-8.7z" />
      <path d="M7.5 8.8h9" />
    </>
  ),
  // OpenAI Tool Bridge: two ends bridged into one rail — a call crossing a gap.
  openaiToolBridge: (
    <>
      <path d="M8.5 4.5v15M15.5 4.5v15" />
      <path d="M8.5 12h7" />
      <circle cx="8.5" cy="12" r="2.1" />
      <circle cx="15.5" cy="12" r="2.1" />
    </>
  ),
  // Anti Slop: a sieve catching specks — the technique stays, the slop falls.
  antiSlop: (
    <>
      <path d="M4 4h16l-1.2 8.2a4.5 4.5 0 0 1-4.4 3.8h-4.8a4.5 4.5 0 0 1-4.4-3.8z" />
      <path d="M4 4h16" />
      <path d="M9.5 16v4M14.5 16v4" />
      <circle cx="9.5" cy="20.8" r="1" />
    </>
  ),
};

// The corner badge on the card. It stays a badge, but drawn as its own glyph
// rather than a borrowed ligature, so the small size still identifies the plugin.
const PLUGIN_BADGE_MARKS = {
  imageVision: (
    <>
      <path d="M3.5 8.5h17v9h-17z" />
      <path d="M8 13l2.6-3 2.4 2.6 2.8-3.6L18 13" />
      <circle cx="17.5" cy="11" r="1.1" />
    </>
  ),
  thinkDeeper: (
    <>
      <path d="M4 18h16" />
      <path d="M6.5 18v-3.4h3.2V18M12 18V9.6h3.2V18M17.5 18V5.4H20V18" />
    </>
  ),
  speedMode: (
    <>
      <path d="M4 8.5h9M4 12h12M4 15.5h7" />
      <path d="M15 12h5M17.4 9.4L20.4 12l-3 2.6" />
    </>
  ),
  jsonGuard: (
    <>
      <path d="M9 5.5C7.4 5.5 7 6.2 7 7.4v1.4c0 1.1-.5 1.6-1.6 1.6 1.1 0 1.6.5 1.6 1.6v1.4c0 1.2.4 1.9 2 1.9" />
      <path d="M15 5.5c1.6 0 2 .7 2 1.9v1.4c0 1.1.5 1.6 1.6 1.6-1.1 0-1.6.5-1.6 1.6v1.4c0 1.2-.4 1.9-2 1.9" />
    </>
  ),
  contextSqueezer: (
    <>
      <path d="M3.5 6h17l-6.4 7.2v5.4l-4.2 2.2V13.2z" />
    </>
  ),
  openaiToolBridge: (
    <>
      <path d="M4 8.5v7M20 8.5v7" />
      <path d="M4 12h4.5M15.5 12H20" />
      <rect x="8.5" y="9.6" width="7" height="4.8" rx="1.4" />
    </>
  ),
  antiSlop: (
    <>
      <path d="M3.5 7.5h17" />
      <path d="M5 12h14" />
      <path d="M7.5 16.5h6" />
      <circle cx="15" cy="18.5" r="1.3" />
    </>
  ),
};

/**
 * One wrapper for every mark so stroke weight, caps and sizing live in one place
 * and cannot drift between the card tile, the docked badge and a model row.
 */
function PluginMark({ name, size = 20, strokeWidth = 1.7, className = "", variant = "main" }) {
  const table = variant === "badge" ? PLUGIN_BADGE_MARKS : PLUGIN_MARKS;
  const mark = table[name];
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
