// The Anti Slop plugin exists to reproduce the antislop skill, so these tests hold it to that
// promise instead of to a vibe: FULL must BE the skill's core text (every section, verbatim,
// all 38 rules, the dials), ULTRA must additionally carry all five concern skills, and neither
// may smuggle in the parts of the skill that only make sense for an agent editing a repo
// (install wizard, self-update, AGENTS.md pointer block).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ANTISLOP_PROMPTS,
  ANTISLOP_LEVEL_CHARS,
  ANTISLOP_LEVELS,
} from "../../open-sse/rtk/antislopPrompt.js";
import { applyAntiSlop } from "../../open-sse/rtk/antislop.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { lite, full, ultra } = ANTISLOP_PROMPTS;

const CORE_SECTIONS = [
  "## What This Is (and What It Isn't)",
  "## Core Principle",
  "## The Craftsmanship Standard",
  "C-1 — Intentionality",
  "C-5 — Evidence Over Claims",
  "## Part 1: AI Slop Patterns (Warning Signs)",
  "### Visual & Color",
  "### Copywriting & Content",
  "### Accessibility",
  "## Part 2: Mandatory Rules (R-01 to R-38, grouped)",
  "### Group 1: Hard Gate (absolute, no exceptions)",
  "### Group 2: Purpose-Gate (technique allowed, purpose required)",
  "### Group 3: Quality Locks (consistency)",
  "## Part 3: Liveliness Toolkit",
  "### Three Dials (required)",
  "### Design Read (how the dials are set)",
  "## Functional Patterns",
  "## Delivery Gate (Mandatory)",
  "### Block 1: Hard Gate (absolute)",
  "### Block 4: Craftsmanship & Quality Locks",
];

const CONCERN_SKILLS = [
  "# antislop-ui",
  "# antislop-copywriting",
  "# antislop-human",
  "# antislop-layoutmobile",
  "# antislop-code",
];

describe("Anti Slop reproduces the skill, it does not summarise it", () => {
  it("FULL carries every section of the core verbatim", () => {
    for (const heading of CORE_SECTIONS) {
      expect(full, `missing section: ${heading}`).toContain(heading);
    }
    // Verbatim means the body came across too, not just the table of contents.
    expect(full).toMatch(/if the logo and product name were swapped out/i);
    expect(full).toContain("Delivery Gate (Mandatory)");
  });

  it("FULL carries all 38 rules, not a hand-picked subset", () => {
    const missing = [];
    for (let n = 1; n <= 38; n += 1) {
      const id = `R-${String(n).padStart(2, "0")}`;
      if (!full.includes(id)) missing.push(id);
    }
    expect(missing).toEqual([]);
  });

  it("FULL carries the liveliness toolkit the old condensed prompt dropped", () => {
    for (const marker of ["ENERGY", "RHYTHM", "MOTION", "Design Read"]) {
      expect(full, `missing ${marker}`).toContain(marker);
    }
  });

  it("ULTRA adds all five concern skills verbatim", () => {
    for (const heading of CONCERN_SKILLS) {
      expect(ultra, `missing concern skill: ${heading}`).toContain(heading);
    }
    // A concern skill's own rules travelled with it, not just its title.
    expect(ultra).toContain("contrast");
    expect(ultra.length).toBeGreaterThan(full.length * 2);
  });

  it("matches the checked-in upstream sources byte for byte", () => {
    // Not a sample and not a set of headings: the whole document, character for character. Any
    // paraphrase, reformat or dropped paragraph fails here.
    const core = fs.readFileSync(path.join(ROOT, "open-sse/rtk/antislop-src/core.md"), "utf8");
    const body = core.slice(core.indexOf("## What This Is")).trim();
    expect(full.includes(body), "core text is not verbatim in FULL").toBe(true);

    const stripFrontmatter = (md) => {
      const end = md.indexOf("\n---", 3);
      return (end > 0 ? md.slice(end + 4).replace(/^\s*\n/, "") : md).trim();
    };
    for (const [file, title] of [
      ["ui.md", "# antislop-ui"],
      ["copywriting.md", "# antislop-copywriting"],
      ["human.md", "# antislop-human"],
      ["layoutmobile.md", "# antislop-layoutmobile"],
      ["code.md", "# antislop-code"],
    ]) {
      const md = fs.readFileSync(path.join(ROOT, "open-sse/rtk/antislop-src", file), "utf8");
      const skill = `${title}\n\n${stripFrontmatter(md)}`;
      expect(ultra.includes(skill), `${file} is not verbatim in ULTRA`).toBe(true);
    }
  });

  it("leaves the repo-editing half of the skill out", () => {
    for (const text of [full, ultra, lite]) {
      expect(text).not.toMatch(/First-Run Install Wizard/);
      expect(text).not.toMatch(/npx antislop-ai/);
      expect(text).not.toMatch(/<!-- antislop:start -->/);
    }
    // The mode section is replaced by one runtime line, because the plugin's level IS the mode.
    expect(full).toMatch(/Do not ask which mode to use/);
  });

  it("keeps Lite cheap, and reports what each level costs", () => {
    expect(lite.length).toBeLessThan(1500);
    expect(ANTISLOP_LEVEL_CHARS).toEqual({
      lite: lite.length,
      full: full.length,
      ultra: ultra.length,
    });
    expect(ANTISLOP_LEVEL_CHARS.full).toBeGreaterThan(30000);
    expect(ANTISLOP_LEVEL_CHARS.ultra).toBeGreaterThan(100000);
  });

  it("injects the chosen level into the system prompt and falls back to FULL", () => {
    const body = { messages: [{ role: "system", content: "base instructions" }, { role: "user", content: "hi" }] };
    applyAntiSlop(body, "openai", "lite");
    expect(body.messages[0].content).toContain("base instructions");
    expect(body.messages[0].content).toContain("antislop");
    expect(body.messages[0].content.length).toBeLessThan(3000);

    const unknown = { messages: [{ role: "system", content: "base" }] };
    applyAntiSlop(unknown, "openai", "not-a-level");
    // An unknown level must still filter: silently injecting nothing is worse than filtering hard.
    expect(unknown.messages[0].content).toContain("## Part 2: Mandatory Rules");
    expect(unknown.messages[0].content.length).toBeGreaterThan(30000);
  });

  it("is in sync with its sources", async () => {
    const { execFileSync } = await import("node:child_process");
    const script = path.join(ROOT, "scripts/generateAntislopPrompt.mjs");
    expect(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
