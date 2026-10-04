import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const banner = fs.readFileSync(path.join(ROOT, "src/shared/components/LongTaskBanner.js"), "utf8");
const loading = fs.readFileSync(path.join(ROOT, "src/shared/components/Loading.js"), "utf8");
const dock = fs.readFileSync(path.join(ROOT, "src/shared/components/TaskDock.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");

describe("loading banner theme + layout (user: 5 points)", () => {
  it("(1) themed panel: bg-surface + backdrop-blur, no bare translucent white", () => {
    expect(banner).toContain("bg-surface/95");
    expect(banner).toContain("backdrop-blur-md");
    expect(banner).not.toMatch(/bg-white\/\d|bg-black\/\d(?!.*backdrop)/);
  });

  it("(1) a caller with no progress still gets a bar (indeterminate sweep)", () => {
    expect(banner).toContain("progress-indeterminate");
    expect(css).toContain("@keyframes progressSweep");
    expect(css).toContain(".progress-indeterminate");
  });

  it("(2) background chip carries title, message, percent AND a progress bar", () => {
    const chip = banner.slice(banner.indexOf("function BackgroundChip"), banner.indexOf("function Panel"));
    expect(chip).toContain("{title");
    expect(chip).toContain("{message");
    expect(chip).toContain("ProgressBar");
    expect(chip).toContain("w-[min(86vw,320px)]");
  });

  it("(2) chip clears mobile browser chrome and sits bottom-right on desktop", () => {
    expect(banner).toContain("bottom-20 right-4");
    expect(banner).toContain("sm:bottom-6");
  });

  it("(3) only the full-screen overlay blocks input; chips stay pointer-transparent", () => {
    expect(banner).toContain("fixed inset-0 z-[70]");
    expect(banner).toContain("pointer-events-none fixed bottom-20");
    expect(banner).toContain("pointer-events-auto flex");
  });

  it("(4) background swap fades first, then mounts the chip (no teleport)", () => {
    expect(banner).toContain("SWAP_MS");
    expect(banner).toContain("setExiting(true)");
    expect(banner).toMatch(/setTimeout\(\(\) => \{\s*\n?\s*setBackgrounded\(true\)/);
  });

  it("(4) expanding the chip mounts the panel, not the reverse", () => {
    expect(banner).toMatch(/onExpand=\{\(\) => setBackgrounded\(false\)\}/);
  });

  it("(4) background is offered even when the caller cannot cancel", () => {
    expect(banner).toMatch(/typeof onBackground === "function" \|\| fixed/);
  });

  it("(5) the chip has its own Cancel button next to expand", () => {
    expect(banner).toContain("Cancel operation");
    expect(banner).toMatch(/expand_less[\s\S]{0,400}Cancel operation/);
  });

  it("ProgressCard has no duplicate unthemed chip left", () => {
    expect(loading).not.toContain("minimized");
    expect(loading).toContain("<LongTaskBanner");
  });

  it("dock renders one overlay max; extras stack as inline chips", () => {
    expect(dock).toContain("const [first, ...rest] = tasks");
    expect(dock).toContain("inlineChip");
    expect(banner).toContain("inlineChip");
  });
});