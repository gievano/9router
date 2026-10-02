#!/usr/bin/env node
/**
 * Install or uninstall the git prepare-commit-msg hook that regenerates
 * today's CHANGELOG.md section before the commit message editor opens.
 *
 *   node scripts/installGitHook.mjs           # install
 *   node scripts/installGitHook.mjs --uninstall  # uninstall
 *
 * The hook uses `node scripts/generateChangelog.mjs --msg-file .git/COMMIT_EDITMSG`
 * so the commit being created is folded into today's section. The generator is
 * idempotent and never touches history before today.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const HOOK = ".git/hooks/prepare-commit-msg";
const MARK_START = "# >>> 9Router changelog hook >>>";
const MARK_END = "# <<< 9Router changelog hook <<<";

function isGitRepo() {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hookContent() {
  return `#!/bin/sh
${MARK_START}
# Regenerate today's CHANGELOG.md section from git history.
# Runs before the commit message editor opens so the new commit is included.
node scripts/generateChangelog.mjs --msg-file "$1" || true
${MARK_END}
`;
}

function main() {
  if (!isGitRepo()) {
    console.error("[hook] not inside a git repository");
    return 1;
  }
  const args = new Set(process.argv.slice(2));
  const uninstall = args.has("--uninstall");

  if (uninstall) {
    if (!existsSync(HOOK)) {
      console.log("[hook] already absent");
      return 0;
    }
    const current = readFileSync(HOOK, "utf8");
    if (!current.includes(MARK_START)) {
      console.warn("[hook] existing hook does not match; manual removal required");
      return 1;
    }
    unlinkSync(HOOK);
    console.log("[hook] uninstalled");
    return 0;
  }

  // Install
  const content = hookContent();
  writeFileSync(HOOK, content, { mode: 0o755 });
  console.log("[hook] installed at", HOOK);
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error("[hook] failed:", err?.message || err);
  process.exit(1);
}