"use client";

import { Fragment } from "react";
import PropTypes from "prop-types";
import { bucketTimestampsByDowHour } from "./activityBuckets.js";

/**
 * Shared visual atoms for the Usage Overview: a tiny trend line for the
 * summary cards (#16) and an hour×weekday activity grid (#15).
 *
 * Both take plain arrays and never fetch - the caller owns data and refresh.
 */

function extent(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return { min: 0, max: 0 };
  return { min, max };
}

/** Scale to 0..1 so a flat series does not render as a straight mid-line. */
function normalize(value, min, max) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Sparkline: an inline trend line for a single summary number.
 *
 * SVG so it needs no chart library and stays crisp at any card width; the path
 * is drawn in a 100×28 viewBox and stretched with preserveAspectRatio="none"
 * (stroke is vector-effect non-scaling, so the line keeps its weight). A flat
 * series sits mid-height rather than on the baseline, which would read as
 * "no data".
 */
export function Sparkline({ values = [], height = 28, stroke = "currentColor", fill = true, ariaLabel = "" }) {
  const clean = values.map((v) => (Number.isFinite(v) ? v : 0));
  if (clean.length < 2) return null;

  const { min, max } = extent(clean);
  const points = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * 100;
    // Inset vertically so the stroke and its fill never clip at the extremes.
    const y = height - 3 - normalize(v, min, max) * (height - 6);
    return [x, y];
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${line} L100 ${height} L0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel ? undefined : "true"}
    >
      {fill && <path d={area} fill={stroke} fillOpacity="0.12" stroke="none" />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        // No vectorEffect: the viewBox is 100 units wide but renders ~136px,
        // so a non-scaling stroke would be pinned to 1px and disappear against
        // a dark card. Scale the stroke with the viewBox instead.
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

Sparkline.propTypes = {
  values: PropTypes.arrayOf(PropTypes.number),
  height: PropTypes.number,
  stroke: PropTypes.string,
  fill: PropTypes.bool,
  ariaLabel: PropTypes.string,
};

Sparkline.defaultProps = { values: [], height: 28, stroke: "currentColor", fill: true, ariaLabel: "" };

export { bucketTimestampsByDowHour };

const HEAT_STEPS = [1, 2, 3]; // opacity stops for 1+, 2+, 4+ requests

function cellColor(value, max) {
  if (!value) return "transparent";
  const ratio = max > 0 ? value / max : 0;
  // Four discrete steps: a continuous ramp reads as noise at 14px cells.
  const step = ratio >= 0.67 ? 3 : ratio >= 0.34 ? 2 : ratio >= 0.05 ? 1 : 1;
  const pct = (HEAT_STEPS[Math.min(step, HEAT_STEPS.length) - 1] + 1) * 25;
  return `color-mix(in oklab, var(--color-primary) ${pct}%, transparent)`;
}

/**
 * Activity heatmap: requests per weekday × hour.
 *
 * Rows are Mon…Sun, columns are 00–23, so a nightly cron or a working-hours
 * spike is visible at a glance. Cells with no traffic stay outlined - an
 * inactive slot still reads as "checked, empty" rather than a hole.
 */
export function ActivityHeatmap({ grid = [], max = 0, cell = 14, gap = 3 }) {
  if (!grid.length) return null;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // One CSS grid for the whole block: 24 hour columns can shrink below the
  // 14px cell (`cell` stays the cap) so the grid fits a 390px phone instead of
  // pushing 42 cells past the card edge. Rows are square, so a narrow screen
  // gets smaller cells rather than a horizontal scrollbar inside a card.
  const gridTemplateColumns = `1.75rem repeat(24, minmax(0, ${cell}px))`;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        className="grid min-w-0 items-center"
        style={{ gridTemplateColumns, columnGap: gap, rowGap: gap }}
        role="img"
        aria-label="Requests per weekday and hour"
      >
        {grid.map((row, di) => (
          <Fragment key={dayNames[di]}>
            <span className="text-right text-[10px] leading-none text-text-muted">{dayNames[di]}</span>
            {row.map((v, hi) => (
              <div
                key={hi}
                title={`${dayNames[di]} ${String(hi).padStart(2, "0")}:00 - ${v} request${v === 1 ? "" : "s"}`}
                className="aspect-square w-full rounded-[2px] border border-border"
                style={{ backgroundColor: cellColor(v, max) }}
              />
            ))}
          </Fragment>
        ))}
        {/* Hour ruler every 6 cells: one label per quarter keeps the ticks apart
            even when the cells shrink on a phone. */}
        <span />
        {Array.from({ length: 24 }, (_, hi) => (
          <span
            key={hi}
            className="text-[10px] leading-none text-text-muted"
            style={{ textAlign: hi % 6 === 0 ? "left" : "center" }}
          >
            {hi % 6 === 0 ? String(hi).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-text-muted">
        less
        {[0, 1, 2, 3].map((s) => (
          <span
            key={s}
            className="rounded-[2px] border border-border"
            style={{ width: 9, height: 9, backgroundColor: cellColor(s === 0 ? 0 : (s + 1), 4) }}
          />
        ))}
        more
      </div>
    </div>
  );
}

ActivityHeatmap.propTypes = {
  grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  max: PropTypes.number,
  cell: PropTypes.number,
  gap: PropTypes.number,
};

ActivityHeatmap.defaultProps = { grid: [], max: 0, cell: 14, gap: 3 };

export default Sparkline;