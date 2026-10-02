/**
 * Changelog generation from git history.
 *
 * No imports on purpose: the hook, the CLI and the self-check all load this, and
 * the self-check runs it under plain node.
 *
 * The rule that makes this safe to run on every commit: the section for TODAY is
 * generated and owned by this module, older sections are frozen history. So a
 * second run over the same commits produces byte-identical output (no duplicate
 * bullets, nothing to clean up by hand), and hand-written entries from previous
 * releases are never rewritten.
 */

// Conventional Commits type -> changelog section. Upstream's own changelog uses
// these exact section names, so the fork's file stays diffable against it.
const SECTION_BY_TYPE = {
  feat: "Features",
  feature: "Features",
  fix: "Fixes",
  perf: "Improvements",
  docs: "Docs",
  security: "Security",
  refactor: "Internal",
  test: "Internal",
  tests: "Internal",
  build: "Internal",
  chore: "Internal",
  ci: "Internal",
  style: "Internal",
};

// Display order inside a version, richest first.
const SECTION_ORDER = ["Features", "Fixes", "Improvements", "Security", "Docs", "Internal"];

// No scope in the commit message is the norm here, so the area label is guessed
// from the text. First match wins, so the order is deliberate: "backup import"
// must label as Backup, not Import.
const AREA_KEYWORDS = [
  ["API Keys", /\bapi[ -]?key\b|\bapikey\b/i],
  ["Auth", /\bauth\b|\blogin\b|\bpassword\b|\bjwt\b|\bsession\b/i],
  ["Security", /\bsecurity\b|\bCVE-\d|\bvulnerab|\bGHSA-/i],
  ["Backup", /\bbackup\b|\brestore\b|\bimport\b|\bexport\b/i],
  ["Models", /\bmodel picker\b|\bcustom model\b|\bmodels?\b/i],
  ["Combos", /\bcombo\b/i],
  ["Providers", /\bprovider\b|\bregistry\b/i],
  ["Usage", /\busage\b|\bquota\b|\bstats\b/i],
  ["Inspector", /\binspector\b|\blive[ -]requests?\b/i],
  ["Streaming", /\bstream/i],
  ["Tool Calls", /\btool[ -]?call/i],
  ["Translation", /\btranslat|\btranslator\b|\bi18n\b/i],
  ["Chat", /\bchat\b|\bconversation\b/i],
  ["Dashboard", /\bdashboard\b|\bui\b|\bmodal\b/i],
  ["Settings", /\bsettings\b|\bconfig\b|\btracing\b/i],
  ["Build", /\bbuild\b|\bnext\.?js\b|\bwebpack\b|\bbun\b|\brailway\b|\bdependenc/i],
  ["CLI", /\bcli\b|\btray\b/i],
  ["Changelog", /\bchangelog\b|\bchange[ -]?log\b/i],
];

/** A version boundary: h1/h2 whose text starts with an optional "v" + digit. */
const VERSION_HEADING = /^ {0,3}#{1,2}\s+(v?\d[^\n]*)$/i;
const HEADING_DATE = /\((\d{4}-\d{2}-\d{2})\)/;

export function todayStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Split "fix(models): stop the picker" into its parts. A commit with no type is
 * not conventional and is treated as an Internal note rather than dropped.
 */
export function parseConventional(subject) {
  const text = String(subject || "").trim();
  const match = text.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i);
  if (!match) return { type: "chore", scope: "", breaking: false, text };
  const type = match[1].toLowerCase();
  const rest = match[4].trim();
  const breaking = Boolean(match[3]) || /^security\b/i.test(rest);
  return {
    type,
    scope: (match[2] || "").trim(),
    breaking,
    // Drop a leading security banner the message repeats in its body.
    text: rest.replace(/^security\s*[:\-—]\s*/i, ""),
  };
}

export function sectionFor({ type, breaking, text }) {
  if (breaking || /\bCVE-\d|\bGHSA-|\bvulnerab|\bauth bypass\b/i.test(text)) return "Security";
  return SECTION_BY_TYPE[type] || "Internal";
}

export function areaFor({ scope, text }) {
  if (scope) {
    // "api-key-usage" reads better as "API Key Usage" than as "api-key-usage".
    const words = scope.split(/[-_\s]+/).filter(Boolean);
    if (words.length) {
      const head = words[0].toLowerCase();
      const named = { api: "API", cli: "CLI", ui: "UI", i18n: "i18n", db: "DB" };
      return words
        .map((w, i) => (i === 0 && named[w.toLowerCase()]) || w)
        .join(" ")
        .replace(/^./, (c) => c.toUpperCase());
    }
  }
  for (const [area, re] of AREA_KEYWORDS) {
    if (re.test(text)) return area;
  }
  return "General";
}

// Pure bookkeeping commits would otherwise fill the file with noise about the
// changelog itself.
const IGNORED = /^(chore|ci)(\([^)]*\))?:\s*.*changelog/i;

function isIgnored(subject) {
  return IGNORED.test(String(subject || "").trim());
}

/**
 * Commits -> bullets. `extra` is the commit being created right now (a git hook
 * runs before the object exists), so it is folded in with today's date.
 */
export function bulletsFromCommits(commits, extra) {
  const all = [...(commits || []), ...(extra ? [extra] : [])]
    .filter((c) => c && !isIgnored(c.subject))
    .sort((a, b) => String(a.subject).localeCompare(String(b.subject)));

  const bySection = new Map();
  for (const commit of all) {
    const parsed = parseConventional(commit.subject);
    const section = sectionFor(parsed);
    const bullet = `- **${areaFor({ scope: parsed.scope, text: parsed.text })}**: ${parsed.text}`;
    if (!bySection.has(section)) bySection.set(section, new Set());
    bySection.get(section).add(bullet);
  }

  const out = [];
  for (const section of SECTION_ORDER) {
    for (const bullet of bySection.get(section) || []) out.push({ section, bullet });
  }
  return out;
}

export function bumpVersion(version, { feat = false } = {}) {
  const cleaned = String(version || "0.0.0").trim().replace(/^v/i, "");
  const dash = cleaned.indexOf("-");
  const suffix = dash === -1 ? "" : cleaned.slice(dash);
  const parts = cleaned.slice(0, dash === -1 ? undefined : dash).split(".");
  while (parts.length < 3) parts.push("0");
  const [major, minor, patch] = parts.map((n) => parseInt(n, 10) || 0);
  // A breaking type is rare enough here that patch stays the default step.
  return `${major}.${feat ? minor + 1 : minor}.${feat ? 0 : patch + 1}${suffix}`;
}

/** Version sections of an existing changelog, newest first. */
export function parseSections(md) {
  const sections = [];
  let cur = null;
  for (const line of String(md || "").split("\n")) {
    const m = line.match(VERSION_HEADING);
    if (m) {
      if (cur) sections.push(cur);
      cur = { title: m[1].trim(), date: (m[1].match(HEADING_DATE) || [])[1] || null, body: "", start: 0 };
    } else if (cur) {
      cur.body += line + "\n";
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

/** The version the newest section declares, e.g. "v0.5.151". */
export function latestVersion(md) {
  const m = String(md || "").match(/^#{1,2}\s+(v[0-9][^\s(]*)/m);
  return m ? m[1].trim() : null;
}

/** Date of the newest section, ISO, or null. */
export function latestDate(md) {
  const first = String(md || "").match(/^#{1,2}\s+(v[0-9][^\n]*)$/im);
  return first ? ((first[1].match(HEADING_DATE) || [])[1] || null) : null;
}

export function renderSection({ version, date, bullets, commitCount }) {
  const bySection = new Map();
  for (const { section, bullet } of bullets) {
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push(bullet);
  }
  const commitLabel = commitCount ? ` · ${commitCount} commit${commitCount === 1 ? "" : "s"}` : "";
  const parts = [`# ${version} (${date})${commitLabel}`];
  for (const section of SECTION_ORDER) {
    const lines = bySection.get(section);
    if (lines && lines.length) parts.push(`## ${section}\n${lines.join("\n")}`);
  }
  return parts.join("\n\n");
}

/**
 * Put `section` at the top of `md`, replacing the previous section when that
 * section is the same version+date (the regenerate-today case).
 */
export function spliceChangelog(md, section, { version, date }) {
  const text = String(md || "").trim();
  // Match the FIRST LINE only: VERSION_HEADING is anchored with $ and the
  // changelog is multiline, so running it against the whole document never
  // matches a heading and every run would prepend a duplicate section.
  const firstLine = text.split("\n")[0];
  const match = firstLine.match(VERSION_HEADING);
  const firstIsSame = Boolean(match)
    && match[1].trim().startsWith(version)
    && ((match[1].match(HEADING_DATE) || [])[1] || null) === date;

  if (firstIsSame) {
    // Skip the WHOLE old section (heading + body), not just the heading line,
    // or the old body is kept and the new one is prepended on top of it.
    const rest = text.slice(match[0].length + (text[match[0].length] === "\n" ? 1 : 0));
    // Locate the next version heading by scanning lines: VERSION_HEADING is $
    // -anchored without the m flag, so a whole-document match silently fails
    // and everything below the first section would be dropped.
    const restLines = rest.split("\n");
    let after = "";
    for (let i = 0; i < restLines.length; i += 1) {
      if (restLines[i].match(VERSION_HEADING)) {
        after = restLines.slice(i).join("\n");
        break;
      }
    }
    return `${section}\n\n${after}`.trim() + "\n";
  }
  return `${section}\n\n${text}`.trim() + "\n";
}

export { SECTION_ORDER, AREA_KEYWORDS };