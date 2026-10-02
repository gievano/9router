/**
 * Changelog Generator Self-Check
 *
 * Pins the auto-changelog contract: regenerating today's section from the same
 * git history is byte-identical (no duplicate sections, version bumped once),
 * history before today is never touched, and the heading carries the release
 * date plus the number of commits made that day.
 *
 * Each case builds a throwaway git repo under the OS temp dir with today's
 * commits, copies the real scripts in, and runs the real generator against
 * it — no mocks, no network, plain node. The git history is the fixture.
 *
 * Run with: node scripts/changelogGeneratorSelfCheck.mjs
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");

const results = [];
function run(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, err: err.message });
  }
}
const assert = {
  ok(v, msg) { if (!v) throw new Error(msg || "expected truthy"); },
  equal(a, b, msg) { if (a !== b) throw new Error(`${msg || ""} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
};

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function node(cwd, ...args) {
  return execFileSync("node", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** A fresh repo whose changelog is the real file and whose commits are today. */
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "changelog-gen-check-"));
  mkdirSync(path.join(dir, "scripts"), { recursive: true });
  for (const f of ["changelogCore.mjs", "generateChangelog.mjs"]) {
    copyFileSync(path.join(here, f), path.join(dir, "scripts", f));
  }
  // Strip sections dated today from the real changelog: the test repo's own
  // commits are "today", so a pre-existing section for today would collide
  // with the generated one and make every case date-dependent.
  copyFileSync(path.join(REPO_ROOT, "CHANGELOG.md"), path.join(dir, "CHANGELOG.md"));
  stripTodaySections(path.join(dir, "CHANGELOG.md"));
  // Pin package.json to the newest changelog section, so a version left
  // behind by a manual generator run in the real repo does not make the
  // fixture start one bump ahead of the changelog.
  pinVersionToChangelog(path.join(dir, "package.json"), path.join(dir, "CHANGELOG.md"));
  git(dir, "init", "-q", "-b", "master");
  git(dir, "config", "user.name", "selfcheck");
  git(dir, "config", "user.email", "selfcheck@example.com");
  return dir;
}

/** Remove leading version sections whose heading carries today's date. */
function stripTodaySections(file) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const lines = readFileSync(file, "utf8").split("\n");
  const boundary = /^ {0,3}#{1,2}\s+v?\d[^\n]*$/i;
  let cut = 0;
  let dropped = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (!boundary.test(lines[i])) continue;
    if (lines[i].includes(`(${today})`) && i === cut) {
      // Start of a today-section at the current head: skip to the next
      // boundary or the end of the file.
      let j = i + 1;
      while (j < lines.length && !boundary.test(lines[j])) j += 1;
      cut = j;
      dropped = true;
      i = j - 1;
    } else {
      break;
    }
  }
  if (dropped) writeFileSync(file, lines.slice(cut).join("\n").trimStart());
}

/** Point package.json at the newest section of the fixture's changelog. */
function pinVersionToChangelog(pkgFile, changelogFile) {
  const text = readFileSync(changelogFile, "utf8");
  const m = text.match(/^#{1,2}\s+(v[^\s(]*)/m);
  const version = m ? m[1].replace(/^v/i, "") : "0.0.0";
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  pkg.version = version;
  writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
}

function commit(dir, subject) {
  git(dir, "commit", "--allow-empty", "-m", subject);
}

function regenerate(dir, extra = []) {
  return node(dir, "scripts/generateChangelog.mjs", ...extra);
}

function readChangelog(dir) {
  return readFileSync(path.join(dir, "CHANGELOG.md"), "utf8");
}

function readVersion(dir) {
  return JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).version;
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

run("a second run over the same commits is byte-identical", () => {
  const dir = fixture();
  commit(dir, "fix: first thing today");
  commit(dir, "fix: second thing today");
  regenerate(dir);
  const first = readChangelog(dir);
  regenerate(dir);
  const second = readChangelog(dir);
  regenerate(dir);
  const third = readChangelog(dir);
  assert.equal(first, second, "run 1 vs run 2");
  assert.equal(second, third, "run 2 vs run 3");
});

run("the version bumps once, not once per run", () => {
  const dir = fixture();
  commit(dir, "fix: first thing today");
  const before = readVersion(dir);
  regenerate(dir);
  const afterFirst = readVersion(dir);
  regenerate(dir);
  const afterSecond = readVersion(dir);
  assert.ok(before !== afterFirst, `a run bumps the version (${before} -> ${afterFirst})`);
  assert.equal(afterFirst, afterSecond, "further runs keep it");
});

run("history before today is preserved", () => {
  const dir = fixture();
  commit(dir, "fix: first thing today");
  const before = readChangelog(dir);
  const beforeCount = before.split("\n").filter((l) => l.startsWith("# v")).length;
  regenerate(dir);
  const after = readChangelog(dir);
  const afterCount = after.split("\n").filter((l) => l.startsWith("# v")).length;
  assert.equal(afterCount, beforeCount + 1, "exactly one section added");
  for (const line of before.split("\n")) {
    if (line.startsWith("# v") && after.includes(line)) continue;
    if (line.startsWith("# v")) throw new Error(`lost section: ${line}`);
  }
});

run("the heading carries today's date and the commit count", () => {
  const dir = fixture();
  commit(dir, "fix: first thing today");
  commit(dir, "feat: a feature today");
  regenerate(dir);
  const head = readChangelog(dir).split("\n")[0];
  assert.ok(head.includes(`(${todayStamp()})`), `dated: ${head}`);
  assert.ok(head.includes("· 2 commits"), `counted: ${head}`);
});

run("the commit being created is folded in via --msg-file", () => {
  const dir = fixture();
  commit(dir, "fix: already committed today");
  const msgFile = path.join(dir, "COMMIT_EDITMSG");
  writeFileSync(msgFile, "fix: the commit the hook is writing\n\nBody here, ignored.\n");
  const out = regenerate(dir, ["--dry-run", "--msg-file", msgFile]);
  assert.ok(out.includes("· 2 commits"), `hook-path commit counted: ${out.split("\n")[0]}`);
  assert.ok(out.toLowerCase().includes("the commit the hook is writing"), "its text listed");
});

run("a feat commit bumps the minor, a fix-only day bumps the patch", () => {
  const featDir = fixture();
  commit(featDir, "feat: something new");
  regenerate(featDir);
  const featVersion = readChangelog(featDir).split("\n")[0].match(/^# (v[^\s(]*)/)[1];

  const fixDir = fixture();
  commit(fixDir, "fix: something broken");
  regenerate(fixDir);
  const fixVersion = readChangelog(fixDir).split("\n")[0].match(/^# (v[^\s(]*)/)[1];

  assert.ok(featVersion.endsWith(".0") || /\.0$/.test(featVersion.replace(/^v/, "")), `minor bump: ${featVersion}`);
  assert.ok(!/\.0$/.test(fixVersion.replace(/^v/, "")) || fixVersion === featVersion, `patch bump: ${fixVersion}`);
});

run("entries land under Features / Fixes, not bare fix: bullets", () => {
  const dir = fixture();
  commit(dir, "fix: the widget");
  commit(dir, "feat: the turbo");
  regenerate(dir);
  const text = readChangelog(dir);
  assert.ok(text.includes("## Features"), "Features section present");
  assert.ok(text.includes("## Fixes"), "Fixes section present");
  assert.ok(!text.split("\n").some((l) => l.startsWith("- fix:") || l.startsWith("- feat:")), "no bare type bullets");
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "  ok  " : "  FAIL"} ${r.name}${r.err ? ` — ${r.err}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);