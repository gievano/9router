#!/usr/bin/env node
/**
 * Regenerate today's CHANGELOG.md section from git history.
 *
 * Runs from the git prepare-commit-msg hook (see installGitHook.mjs) and by
 * hand:
 *   node scripts/generateChangelog.mjs                    # regenerate today
 *   node scripts/generateChangelog.mjs --dry-run          # print, don't write
 *   node scripts/generateChangelog.mjs --check            # exit 1 if stale
 *   node scripts/generateChangelog.mjs --msg-file .git/COMMIT_EDITMSG
 *
 * Idempotence is the property that makes it safe to run on every commit: the
 * section for today is rebuilt from the same commits each time, so a second
 * run produces a byte-identical file instead of appending duplicates, and the
 * version is reused rather than bumped again. Older sections are frozen and
 * never touched.
 *
 * The hook case is special: prepare-commit-msg runs BEFORE the commit object
 * exists, so today's newest commit is not in `git log` yet. Its subject is
 * passed via --msg-file and folded in as one more bullet for today.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  todayStamp,
  bulletsFromCommits,
  bumpVersion,
  parseSections,
  latestVersion,
  renderSection,
  spliceChangelog,
} from "./changelogCore.mjs";

const CHANGELOG = "CHANGELOG.md";
const PKG = "package.json";

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (err) {
    if (allowFailure) return "";
    throw err;
  }
}

/** Commits from the start of today, oldest first. */
function commitsToday(dateStamp) {
  const raw = git(["log", "--since", `${dateStamp} 00:00:00`, "--pretty=format:%s"], { allowFailure: true });
  if (!raw) return [];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((subject) => ({ subject }));
}

/** First line of a commit message file, or null. Merge commits are skipped. */
function subjectFromFile(file) {
  if (!file) return null;
  try {
    const first = readFileSync(file, "utf8").split("\n")[0].trim();
    if (!first || first.startsWith("Merge ")) return null;
    return { subject: first };
  } catch {
    return null;
  }
}

function readVersion() {
  try {
    return JSON.parse(readFileSync(PKG, "utf8")).version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function writeVersion(version) {
  try {
    const pkg = JSON.parse(readFileSync(PKG, "utf8"));
    if (pkg.version === version) return false;
    pkg.version = version;
    writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const dryRun = args.has("--dry-run");
  const check = args.has("--check");
  const msgIdx = argv.indexOf("--msg-file");
  const extra = subjectFromFile(msgIdx !== -1 ? argv[msgIdx + 1] : null);

  if (!existsSync(CHANGELOG)) {
    console.error(`[changelog] ${CHANGELOG} not found; skipping`);
    return 0;
  }

  const date = todayStamp();
  const existing = readFileSync(CHANGELOG, "utf8");
  const sections = parseSections(existing);
  const top = sections[0];
  const todayTop = top && top.date === date ? top : null;

  const commits = commitsToday(date);
  const bullets = bulletsFromCommits(commits, extra);
  const commitCount = commits.length + (extra ? 1 : 0);

  // Nothing new to say: leave the file byte-identical so the commit does not
  // show up as a dirty changelog.
  if (!bullets.length) {
    return 0;
  }

  // Today's section already exists: reuse its version and rebuild the body
  // from the same commits. This is what keeps a second run idempotent instead
  // of bumping 0.5.152 to 0.5.153 every time.
  const version = todayTop
    ? (todayTop.title.match(/^v[^\s(]*/) || [])[0]
    : `v${bumpVersion(latestVersion(existing) || `v${readVersion()}`, {
        feat: bullets.some((b) => b.section === "Features"),
      }).replace(/^v/i, "")}`;

  const section = renderSection({ version, date, bullets, commitCount });
  const next = spliceChangelog(existing, section, { version, date });

  if (dryRun) {
    console.log(section);
    return 0;
  }
  if (next === existing) {
    return 0;
  }

  writeFileSync(CHANGELOG, next);
  const bumped = version.replace(/^v/i, "");
  const versionWritten = writeVersion(bumped);
  if (check) {
    console.error("[changelog] CHANGELOG.md is out of date; run: node scripts/generateChangelog.mjs");
    return 1;
  }
  console.log(
    `[changelog] ${version} (${date}) - ${commitCount} commit${commitCount === 1 ? "" : "s"}${versionWritten ? `, version ${bumped}` : ""}`,
  );
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  // Never block a commit because the changelog could not be regenerated.
  console.error(`[changelog] skipped: ${err?.message || err}`);
  process.exit(0);
}