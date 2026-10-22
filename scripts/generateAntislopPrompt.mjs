// Regenerates `open-sse/rtk/antislopPrompt.js` from the upstream antislop sources kept in
// `open-sse/rtk/antislop-src/`.
//
// Why a generator instead of hand-written prompts: the plugin's job is to reproduce the
// skill, and a hand-condensed copy drifts. The plain-text sources live next to the code so
// a diff shows exactly what upstream changed; this script only wraps them in the shape the
// runtime needs (one string per level) and escapes them safely.
//
// Usage:
//   node scripts/generateAntislopPrompt.mjs            # rewrite the module
//   node scripts/generateAntislopPrompt.mjs --check    # fail if the module is stale
//
// Updating upstream: replace the .md files in `antislop-src/` (they are verbatim copies of
// antislop.md and skills/*/SKILL.md from github.com/miqdadbadjuber/anti-slop), then run this.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "open-sse/rtk/antislop-src");
const OUT = path.join(ROOT, "open-sse/rtk/antislopPrompt.js");

const read = (name) => fs.readFileSync(path.join(SRC_DIR, name), "utf8");

// The skill ships an install wizard, a self-update section and a mode-resolution section at
// the top. None of them is a design rule: they tell an agent to write pointer blocks into
// AGENTS.md and to ask which mode to use. Inside a system prompt they would invite the model
// to edit files and to interrogate the operator, so the core is cut at "What This Is" and the
// note below stands in for the mode section - the plugin's level IS the mode here.
const CORE_START = "## What This Is";

const MODE_NOTE = `> Runtime note: this text is injected by 9Router's Anti Slop plugin. Ignore the skill's own
> install wizard and mode resolution - there is nothing to install, and the intensity is
> already chosen (${"${level}"}). Do not ask which mode to use; apply the rules and continue.`;

function coreBody() {
  const full = read("core.md");
  const at = full.indexOf(CORE_START);
  if (at < 0) throw new Error("core.md: '## What This Is' not found - upstream layout changed");
  return full.slice(at).trim();
}

/** Strip the YAML frontmatter a SKILL.md opens with; it is metadata, not instructions. */
function stripFrontmatter(md) {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  if (end < 0) return md;
  return md.slice(end + 4).replace(/^\s*\n/, "").trim();
}

function subSkill(name, title) {
  return `# ${title}\n\n${stripFrontmatter(read(name)).trim()}`;
}

// LITE stays a hand-written condensation: it exists to be cheap, so it deliberately is not a
// slice of the core. FULL and ULTRA are verbatim upstream text.
const LITE = `You use antislop: rules for AI coding agents. (from the antislop rules, https://github.com/miqdadbadjuber/anti-slop)
It is a FILTER, not a style guide. It stops generic AI slop in generated UI, copy and code. It never invents direction: if the project has no DESIGN.md or stated direction, say so plainly instead of inventing taste.

Before any visual or copy technique, answer: what does this serve? If the only answer is "it looks AI" or "it looks safe", cut it or rework it. If the answer names a hierarchy, identity or readability goal, keep it and write the reason down.

Scan your output for: blue-purple gradient washes, blur everywhere, every element pill-shaped, oversized soft shadows, generic hero + 3 equal cards + centered CTA, "Welcome to X" / "Elevate" / "Unlock the power of" filler, emoji as icons, nav that goes nowhere, missing empty/error states. One of these is fine when it serves a purpose.`;

const core = coreBody();

const FULL = `# antislop\n\n${MODE_NOTE.replace("${level}", "full")}\n\n${core}`;

const ULTRA = [
  "# antislop",
  "",
  MODE_NOTE.replace("${level}", "ultra"),
  "",
  core,
  "",
  "---",
  "",
  "The five concern skills below are part of the same system. When the task touches one of",
  "them, follow that skill's section as strictly as the core.",
  "",
  subSkill("ui.md", "antislop-ui"),
  "",
  subSkill("copywriting.md", "antislop-copywriting"),
  "",
  subSkill("human.md", "antislop-human"),
  "",
  subSkill("layoutmobile.md", "antislop-layoutmobile"),
  "",
  subSkill("code.md", "antislop-code"),
].join("\n\n");

const PROMPTS = { lite: LITE, full: FULL, ultra: ULTRA };
for (const [level, text] of Object.entries(PROMPTS)) {
  if (text.length < 500) throw new Error(`${level} prompt is suspiciously short (${text.length} chars)`);
}

const stats = Object.fromEntries(Object.entries(PROMPTS).map(([k, v]) => [k, v.length]));

const banner = `// GENERATED FILE - edit \`open-sse/rtk/antislop-src/*.md\` and run
// \`node scripts/generateAntislopPrompt.mjs\`. Do not hand-edit.
//
// Anti Slop prompt set, adapted from https://github.com/miqdadbadjuber/anti-slop (MIT).
//
// Levels, and what each one actually contains:
//   lite  - a hand-written condensation, ${stats.lite} chars, for cheap always-on filtering.
//   full  - the skill's core text verbatim, ${stats.full} chars.
//   ultra - the core plus all five concern skills (ui, copywriting, human, layoutmobile,
//           code) verbatim, ${stats.ultra} chars.
//
// The core is cut at "## What This Is": upstream's install wizard, self-update section and
// mode-resolution section tell an agent to write pointer blocks into AGENTS.md and to ask
// which mode to use, which is wrong for a system prompt injected on every request. A one-line
// runtime note replaces them - the plugin's level IS the mode.
`;

const source = `${banner}
export const ANTISLOP_LEVELS = {
  LITE: "lite",
  FULL: "full",
  ULTRA: "ultra",
};

/** Character counts per level, so the UI can warn about the cost before someone enables it. */
export const ANTISLOP_LEVEL_CHARS = ${JSON.stringify(stats, null, 2)};

const LITE = ${JSON.stringify(PROMPTS.lite)};

const FULL = ${JSON.stringify(PROMPTS.full)};

const ULTRA = ${JSON.stringify(PROMPTS.ultra)};

export const ANTISLOP_PROMPTS = {
  [ANTISLOP_LEVELS.LITE]: LITE,
  [ANTISLOP_LEVELS.FULL]: FULL,
  [ANTISLOP_LEVELS.ULTRA]: ULTRA,
};
`;

const check = process.argv.includes("--check");
const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (check) {
  if (current !== source) {
    console.error("antislopPrompt.js is stale - run: node scripts/generateAntislopPrompt.mjs");
    process.exit(1);
  }
  console.log("antislopPrompt.js matches its sources");
} else if (current === source) {
  console.log("antislopPrompt.js already up to date");
} else {
  fs.writeFileSync(OUT, source);
  console.log(`wrote antislopPrompt.js: lite ${stats.lite}, full ${stats.full}, ultra ${stats.ultra} chars`);
}
