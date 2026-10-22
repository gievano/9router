#!/usr/bin/env node
/**
 * Compare a vitest JSON report against the catalogued failures in
 * tests/__baseline__/known-fails.txt.
 *
 * The suite is deliberately not green on a clean checkout (see CLAUDE.md), so a
 * raw `vitest run` exit code says nothing about a regression. The rule enforced
 * here is the useful one: a failure that is NOT in the catalogue fails this
 * check, and a catalogued failure that has since been fixed is reported as
 * stale so the file can be pruned. Nothing else changes the exit code.
 *
 * Usage (from the repo root):
 *   node tests/__baseline__/compare-fails.mjs <vitest-json> [known-fails.txt]
 *
 * A catalogued entry reads `tests/unit/foo.test.js :: test name`, where the name
 * may be either the bare title or the full "describe > test" name; both match.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const reportPath = process.argv[2] || "tests/vitest-results.json";
const knownPath = process.argv[3] || path.join(repoRoot, "tests/__baseline__/known-fails.txt");

function readKnown() {
  try {
    return new Set(
      readFileSync(knownPath, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#")),
    );
  } catch {
    return new Set();
  }
}

function repoRelative(name) {
  const rel = path.isAbsolute(name) ? path.relative(repoRoot, name) : name;
  return rel.split(path.sep).join("/");
}

function failuresFrom(report) {
  const failures = [];
  for (const suite of report.testResults || []) {
    const file = repoRelative(suite.name);
    const assertions = suite.assertionResults || [];
    if (!assertions.length && suite.status === "failed") {
      failures.push({ file, name: "", title: "", message: suite.message || "suite failed to load" });
      continue;
    }
    for (const assertion of assertions) {
      if (assertion.status !== "failed") continue;
      failures.push({
        file,
        name: assertion.fullName || "",
        title: assertion.title || "",
        message: (assertion.failureMessages || [])[0] || "",
      });
    }
  }
  return failures;
}

function matchesKnown(failure, entry) {
  const [file, name] = entry.split(" :: ");
  if (file !== failure.file || !name) return false;
  // A suite that failed to load has no test name; it is catalogued as "(suite)".
  if (name === "(suite)") return !failure.name;
  return failure.name === name || failure.title === name || failure.name.endsWith(` ${name}`);
}

function main() {
  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (err) {
    console.error(`[fails] cannot read vitest report at ${reportPath}: ${err.message}`);
    return 1;
  }

  const known = [...readKnown()];
  const failures = failuresFrom(report);
  const isKnown = (failure) => known.some((entry) => matchesKnown(failure, entry));

  const unexpected = failures.filter((failure) => !isKnown(failure));
  const catalogued = failures.filter((failure) => isKnown(failure));
  // Stale entries are only meaningful for suites this report actually ran; a
  // single-file run must not claim every other catalogued failure was fixed.
  const ranFiles = new Set((report.testResults || []).map((suite) => repoRelative(suite.name)));
  const stale = known.filter(
    (entry) => ranFiles.has(entry.split(" :: ")[0]) && !failures.some((failure) => matchesKnown(failure, entry)),
  );

  const total = report.numTotalTests ?? 0;
  console.log(
    `[fails] ${total - failures.length}/${total} tests passed · ${catalogued.length} catalogued failure(s) · ${unexpected.length} new failure(s)`,
  );

  for (const failure of unexpected) {
    console.log(`\n[fails] NEW ${failure.file} :: ${failure.name || "(suite)"}`);
    const first = failure.message.split("\n").slice(0, 6).join("\n");
    if (first) console.log(first);
  }

  if (stale.length) {
    console.log(`\n[fails] ${stale.length} catalogued failure(s) now pass — prune tests/__baseline__/known-fails.txt:`);
    for (const entry of stale) console.log(`  - ${entry}`);
  }

  return unexpected.length ? 1 : 0;
}

process.exit(main());
