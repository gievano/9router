"use client";

import { CAPACITY_META, PLUGIN_MARK_META, pluginMarksFor } from "@/shared/constants/models";
import Tooltip from "./Tooltip";
import PluginMark from "./PluginMark";

// Render the badges for a model: its capabilities, plus the marks of the custom
// plugins active on it.
//
// The two are separate on purpose. A plugin used to signal itself by setting a
// capability — Image Vision set caps.vision, which is identical to native vision —
// so enabling it drew nothing and the badge could not be told apart from a
// built-in. `marks` is the payload's explicit pluginMarks list, falling back to
// the caps flags for older payloads.
export default function CapacityBadges({ caps, marks, className = "", colorOverride, size = 16 }) {
  const active = caps ? Object.keys(CAPACITY_META).filter((k) => caps[k]) : [];
  // A plugin flag that is also a capability would otherwise print twice: once as
  // the capability badge and once as the plugin mark.
  const pluginKeys = pluginMarksFor({ caps, pluginMarks: marks }).filter(
    (key) => !(key in CAPACITY_META) || !caps?.[key === "imageVision" ? "vision" : key]
  );
  if (active.length === 0 && pluginKeys.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {active.map((k) => (
        <Tooltip key={k} text={`${CAPACITY_META[k].label} — ${CAPACITY_META[k].desc}`}>
          <span
            className={`material-symbols-outlined leading-none cursor-help ${colorOverride || CAPACITY_META[k].color}`}
            style={{ fontSize: `${size}px` }}
          >
            {CAPACITY_META[k].icon}
          </span>
        </Tooltip>
      ))}
      {pluginKeys.map((key) => {
        const meta = PLUGIN_MARK_META[key];
        if (!meta) return null;
        return (
          <Tooltip key={`plugin-${key}`} text={`${meta.label} — ${meta.desc}`}>
            <span
              className={`inline-flex items-center justify-center cursor-help ${colorOverride || meta.color}`}
              style={{ width: `${size}px`, height: `${size}px` }}
            >
              <PluginMark name={key} size={size} strokeWidth={1.9} />
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}
