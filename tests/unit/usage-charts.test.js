/**
 * Overview charts layer contracts (#15 heatmap, #16 sparklines, #12 smart
 * empty states).
 *
 * The repo has no jsdom, so DOM mounting is out of reach. Instead: the pure
 * bucketing helper is exercised directly, and the components are covered by
 * structural assertions that pin the behaviours a regression would break —
 * local-time bucketing (a UTC regression would shift every cell), Mon-first
 * row order, graceful degradation on short/flat series, and every data-empty
 * view routing through EmptyWithAction.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { bucketTimestampsByDowHour } from "../../src/app/(dashboard)/dashboard/usage/components/activityBuckets.js";

const here = dirname(fileURLToPath(import.meta.url));
const componentsDir = resolve(here, "../../src/app/(dashboard)/dashboard/usage/components");
const bits = readFileSync(resolve(componentsDir, "UsageChartsBits.js"), "utf-8");
const overviewCards = readFileSync(resolve(componentsDir, "OverviewCards.js"), "utf-8");

describe("bucketTimestampsByDowHour", () => {
  it("buckets into a 7×24 grid and reports the max cell", () => {
    const at = (y, m, d, h) => new Date(y, m, d, h, 30).toISOString();
    const { grid, max, total } = bucketTimestampsByDowHour([
      at(2026, 0, 5, 9), // Mon 09:00
      at(2026, 0, 5, 9), // Mon 09:00 again
      at(2026, 0, 5, 21), // Mon 21:00
      at(2026, 0, 7, 9), // Wed 09:00
    ]);
    expect(grid).toHaveLength(7);
    expect(grid[0]).toHaveLength(24);
    expect(total).toBe(4);
    expect(max).toBe(2);
    expect(grid[0][9]).toBe(2);
    expect(grid[0][21]).toBe(1);
    expect(grid[2][9]).toBe(1);
  });

  it("orders rows Monday-first, not Sunday-first", () => {
    // 2026-01-05 is a Monday, 2026-01-11 the next Sunday.
    const { grid } = bucketTimestampsByDowHour([
      new Date(2026, 0, 5, 12).toISOString(),
      new Date(2026, 0, 11, 12).toISOString(),
    ]);
    expect(grid[0][12]).toBe(1); // Mon
    expect(grid[6][12]).toBe(1); // Sun
  });

  it("ignores unparsable and nullish timestamps instead of throwing", () => {
    const { total, max } = bucketTimestampsByDowHour(["not-a-date", null, undefined, "", new Date(2026, 0, 5, 3)]);
    expect(total).toBe(1);
    expect(max).toBe(1);
  });

  it("never counts a missing timestamp as epoch traffic on Monday 00:00", () => {
    const { grid, total } = bucketTimestampsByDowHour([null, undefined, ""]);
    expect(total).toBe(0);
    expect(grid[0][0]).toBe(0);
  });

  it("returns an all-zero grid for no input", () => {
    const { grid, max, total } = bucketTimestampsByDowHour([]);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
    expect(max).toBe(0);
    expect(total).toBe(0);
  });

  it("buckets in local time, so a late-evening request is not split across UTC days", () => {
    const { grid, total } = bucketTimestampsByDowHour([new Date(2026, 0, 5, 23, 45).toISOString()]);
    expect(total).toBe(1);
    expect(grid[0][23]).toBe(1);
  });
});

describe("UsageChartsBits contracts", () => {
  it("exports the atoms and re-exports the bucketing helper", () => {
    expect(bits).toContain("export function Sparkline");
    expect(bits).toContain("export function ActivityHeatmap");
    expect(bits).toContain("export { bucketTimestampsByDowHour }");
  });

  it("keeps the helper framework-free in its own module", () => {
    const helper = readFileSync(resolve(componentsDir, "activityBuckets.js"), "utf-8");
    expect(helper).toContain("export function bucketTimestampsByDowHour");
    expect(helper).not.toContain("<svg");
    expect(helper).not.toContain("className");
  });

  it("heatmap buckets in local time, never UTC", () => {
    const helper = readFileSync(resolve(componentsDir, "activityBuckets.js"), "utf-8");
    expect(helper).toContain("getDay()");
    expect(helper).toContain("getHours()");
    expect(helper).not.toMatch(/getUTCDay|getUTCHours/);
  });

  it("labels heatmap rows Mon…Sun", () => {
    expect(bits).toContain('["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]');
  });

  it("keeps an inactive cell outlined rather than invisible", () => {
    expect(bits).toContain('return "transparent"');
    expect(bits).toContain("border border-border");
  });

  it("sparkline hides itself on a one-point series and centres a flat one", () => {
    expect(bits).toContain("if (clean.length < 2) return null");
    expect(bits).toContain("if (max === min) return 0.5");
  });

  it("accessibility: decorative by default, labelled when given a label", () => {
    expect(bits).toContain("aria-label");
    expect(bits).toContain("aria-hidden");
  });
});

describe("OverviewCards trend wiring", () => {
  it("renders a trend only when there is one to render", () => {
    expect(overviewCards).toContain("trend.length >= 2");
  });

  it("maps each card to its own series, including cached", () => {
    expect(overviewCards).toContain("trend={t.requests}");
    expect(overviewCards).toContain("trend={t.input}");
    expect(overviewCards).toContain("trend={t.output}");
    expect(overviewCards).toContain("trend={t.cost}");
    expect(overviewCards).toContain("trend={t.cached}");
  });

  it("stays usable before trends arrive", () => {
    expect(overviewCards).toContain("trends: PropTypes.object");
    expect(overviewCards).toContain("trends?.totals");
  });
});

describe("smart empty states", () => {
  it("EmptyWithAction offers an icon, a title, and a way forward", () => {
    const src = readFileSync(resolve(componentsDir, "EmptyWithAction.js"), "utf-8");
    expect(src).toContain("export default function EmptyWithAction");
    expect(src).toContain("material-symbols-outlined");
    expect(src).toContain("actionHref");
  });

  it("no data-empty view is left as bare text", () => {
    for (const f of ["ModelLeaderboardTab.js", "ErrorClassificationTab.js", "TokenSavingsTab.js"]) {
      const src = readFileSync(resolve(componentsDir, f), "utf-8");
      expect(src).not.toContain(">No data available for this period");
    }
    expect(readFileSync(resolve(componentsDir, "ModelLeaderboardTab.js"), "utf-8")).toContain("EmptyWithAction");
    expect(readFileSync(resolve(componentsDir, "ErrorClassificationTab.js"), "utf-8")).toContain("EmptyWithAction");
  });

  it("Recent Requests offers a next step when empty", () => {
    const src = readFileSync(resolve(here, "../../src/shared/components/UsageStats.js"), "utf-8");
    expect(src).toContain("/dashboard/endpoint");
    expect(src).toContain("ActivityHeatmap");
  });
});