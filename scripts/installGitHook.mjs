#!/usr/bin/env node
/**
 * Install or uninstall the git hook that keeps CHANGELOG.md in sync with
 * every commit.
 *
 *   node scripts/installGitHook.mjs             # install
 *   node scripts/installGitHook.mjs --uninstall  # uninstall
 *
 * A single post-commit hook, deliberately:
 *
 *   post-commit  regenerates today's section (the new commit is already in
 *                `git log` at this point, so its subject needs no special
 *                --msg-file handling), stages the output and amends it into
 *                the commit that just landed. Amending is the only moment the
 *                generated content can join that commit - staging from
 *                prepare-commit-msg is too early, because git snapshots the
 *                index before that hook's output could be staged. --no-verify
 *                keeps prepare-commit-msg (if a leftover copy exists) from
 *                rewriting the worktree past the amended content, and the
 *                NO_9R_CHANGLOG_AMEND guard stops the amend's own post-commit
 *                run from recursing. A second settle pass absorbs the one-off
 *                off-by-one between the pre-commit and post-commit counts.
 *
 * prepare-commit-msg is uninstalled on install: with the amend in place its
 * --msg-file count (pending commit + 1) can never match the settled count and
 * it only ever left the tree dirty.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";

const PREPARE_HOOK = ".git/hooks/prepare-commit-msg";
const POST_HOOK = ".git/hooks/post-commit";
const MARK_START = "# >>> 9Router changelog hook >>>";

function isGitRepo() {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Kept as one flat base64 literal: the body is shell with quotes, dollar
 * signs and backticks, none of which survive nesting inside a JS template.
 */
function hookContentPost() {
  return Buffer.from(
    "IyEvYmluL3NoCiMgPj4+IDlSb3V0ZXIgY2hhbmdlbG9nIGhvb2sgPj4+CiMgUmVnZW5lcmF0ZSB0b2RheSdzIENIQU5HRUxPRy5tZCBmcm9tIGdpdCBoaXN0b3J5ICh0aGUgbmV3IGNvbW1pdCBpcyBhbHJlYWR5CiMgaW4gYGdpdCBsb2dgIGhlcmUpIGFuZCBhbWVuZCBpdCBpbnRvIHRoZSBjb21taXQgdGhhdCBqdXN0IGxhbmRlZC4gLS1uby12ZXJpZnkgc3RvcHMgYSBsZWZ0b3ZlcgojIHByZXBhcmUtY29tbWl0LW1zZyBmcm9tIHJld3JpdGluZyB0aGUgd29ya3RyZWUgcGFzdCB0aGUgYW1lbmRlZCBjb250ZW50LiBUaGUgZW52IGd1YXJkIHN0b3BzIHRoZSBhbWVuZCdzIG93biBwb3N0LWNvbW1pdAojIHJ1biBmcm9tIHJlY3Vyc2luZy4KaWYgWyAtbiAiJE5PXzlSX0NIQU5HTE9HX0FNRU5EIiBdOyB0aGVuIGV4aXQgMDsgZmkKZm9yIGkgaW4gMSAyOyBkbwogIG5vZGUgc2NyaXB0cy9nZW5lcmF0ZUNoYW5nZWxvZy5tanMgPi9kZXYvbnVsbCAyPiYxIHx8IHRydWUKICBnaXQgYWRkIENIQU5HRUxPRy5tZCBwYWNrYWdlLmpzb24KICBOT185Ul9DSEFOR0xPR19BTUVORD0xIGdpdCBjb21taXQgLS1hbWVuZCAtLW5vLWVkaXQgLS1uby12ZXJpZnkgPi9kZXYvbnVsbCAyPiYxIHx8IHRydWUKZG9uZQojIDw8PCA5Um91dGVyIGNoYW5nZWxvZyBob29rIDw8PAo=",
    "base64"
  ).toString("utf8");
}

function removeHook(file) {
  if (!existsSync(file)) return 0;
  const current = readFileSync(file, "utf8");
  if (!current.includes(MARK_START)) {
    console.warn(`[hook] ${file} does not match; manual removal required`);
    return 1;
  }
  unlinkSync(file);
  return 0;
}

function main() {
  if (!isGitRepo()) {
    console.error("[hook] not inside a git repository");
    return 1;
  }
  const args = new Set(process.argv.slice(2));
  const uninstall = args.has("--uninstall");

  if (uninstall) {
    let rc = removeHook(PREPARE_HOOK);
    rc |= removeHook(POST_HOOK);
    if (rc === 0) console.log("[hook] uninstalled");
    return rc;
  }

  // Install: post-commit only; retire any leftover prepare-commit-msg copy.
  removeHook(PREPARE_HOOK);
  writeFileSync(POST_HOOK, hookContentPost(), { mode: 0o755 });
  console.log("[hook] installed at", POST_HOOK);
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error("[hook] failed:", err?.message || err);
  process.exit(1);
}
