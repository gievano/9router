import { describe, it, expect } from "vitest";
import { readFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const modal = readFileSync(
  resolve(root, "src/shared/components/ChangelogModal.js"),
  "utf8"
);
const globals = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
const layout = readFileSync(resolve(root, "src/app/layout.js"), "utf8");

describe("changelog: every release card shows a commit count", () => {
  it("derives the count from the heading when present", () => {
    expect(modal).toMatch(/function countSectionCommits\(section\)/);
    expect(modal).toContain("section.commits != null");
  });

  it("falls back to counting body bullets for older entries", () => {
    expect(modal).toMatch(/function countBodyCommits\(body\)/);
    // one bullet is one changelog line; the hook writes one line per commit
    expect(modal).toContain('/^\\s*[-*]\\s+\\S/');
  });

  it("never appends a second count when the heading already has one", () => {
    expect(modal).toMatch(/function stripCommitCount\(title\)/);
    expect(modal).toContain("commits === 1 ? \"commit\" : \"commits\"");
    expect(modal).toMatch(/head = stripCommitCount\(head\)/);
  });

  it("sums every release merged into a day card", () => {
    expect(modal).toMatch(/group\.items\.reduce\(\(sum, s\) => sum \+ countSectionCommits\(s\), 0\)/);
  });

  it("new fork entries keep their '· N commits' heading format", () => {
    const cl = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
    const headings = cl.split("\n").filter((l) => /^# v\d/.test(l));
    expect(headings.length).toBeGreaterThan(10);
    const withCount = headings.filter((h) => /·\s*\d+\s+commits?/.test(h));
    // the changelog hook started writing counts; at least the newest entries have them
    expect(withCount.length).toBeGreaterThan(0);
  });
});

describe("icon subset: 114 KB instead of the 3.96 MB package font", () => {
  const subset = resolve(root, "public/fonts/material-symbols-subset.woff2");
  const list = resolve(root, "public/fonts/material-symbols-glyphs.txt");

  it("ships a subset well under a quarter MB", () => {
    expect(existsSync(subset)).toBe(true);
    expect(statSync(subset).size).toBeLessThan(250_000);
    expect(statSync(subset).size).toBeGreaterThan(10_000);
  });

  it("covers the icons the menu depends on", () => {
    const names = new Set(
      readFileSync(list, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
    );
    expect(names.size).toBeGreaterThanOrEqual(140);
    for (const icon of ["grid_view", "palette", "history", "power_settings_new", "logout"]) {
      expect(names.has(icon)).toBe(true);
    }
  });

  it("serves the subset first and keeps the package font as fallback", () => {
    expect(globals).toContain('url("/fonts/material-symbols-subset.woff2")');
    const faces = globals.split("@font-face").slice(1);
    expect(faces.length).toBeGreaterThanOrEqual(2);
    expect(faces[0]).toContain("material-symbols-subset.woff2");
    expect(faces[1]).toContain("material-symbols");
    expect(faces[1]).toContain("node_modules/material-symbols");
  });

  it("enables the rlig feature the font actually ships", () => {
    expect(globals).toMatch(/font-feature-settings:\s*'liga' 1, 'rlig' 1/);
  });

  it("reveals icons from fonts.ready with a hard fallback, never hanging at 0", () => {
    expect(layout).toContain("document.fonts.ready");
    expect(layout).toMatch(/setTimeout\(f,\s*1500\)/);
    // the gate class is always added: ready, catch, and the timer all call f
    expect(layout).toMatch(/r\.classList\.remove\('fonts-loading'\)/);
  });
});