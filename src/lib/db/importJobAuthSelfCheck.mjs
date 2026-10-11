/**
 * Import Job Poll Authentication Self-Check
 *
 * Pins the fix for: "backup import shows a red 'Invalid password' even though
 * the password is right and the import actually succeeded".
 *
 * Why it happened: the background import job replaces the `settings` row,
 * which is where the dashboard password hash lives. Every progress poll
 * re-authenticated by bcrypt-comparing against that row, so as soon as the
 * settings stage committed, the already-authenticated poll started 401-ing
 * against a hash that no longer matched the password the user had just typed.
 * The restore itself was committed per stage and completed fine, so the UI
 * showed a failure over a successful import.
 *
 * The fix binds the job to a credential issued once, at the POST that already
 * verified the password, instead of re-deriving trust from a row the job
 * itself is rewriting. That credential is a random token stored only as a
 * SHA-256 digest, so nothing reversible is kept in memory.
 *
 * Behavioural, not structural: this module deliberately has no Next.js or DB
 * dependency so plain node can exercise the real code path.
 *
 * Run with: node src/lib/db/importJobAuthSelfCheck.mjs
 */

import {
  issuePollToken,
  verifyPollToken,
  hashPollToken,
  PASSWORD_HEADER,
  POLL_TOKEN_HEADER,
} from "./importJobAuth.js";

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
  no(v, msg) { if (v) throw new Error(msg || "expected falsy"); },
  equal(a, b, msg) { if (a !== b) throw new Error(`${msg || ""} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
};

run("a freshly issued token is returned and is not a digest", () => {
  const issued = issuePollToken();
  assert.ok(issued.token, "token present");
  assert.ok(issued.hash, "hash present");
  assert.no(issued.hash === issued.token, "hash must not equal the token");
  assert.equal(issued.hash.length, 64, "sha-256 hex digest");
});

run("every issued token is distinct", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) seen.add(issuePollToken().token);
  assert.equal(seen.size, 500, "no collisions");
});

run("the token verifies against the job it was issued for", () => {
  const { token, hash } = issuePollToken();
  const job = { pollTokenHash: hash };
  assert.ok(verifyPollToken(job, token), "valid token accepted");
});

run("a wrong token is rejected", () => {
  const { hash } = issuePollToken();
  const job = { pollTokenHash: hash };
  assert.no(verifyPollToken(job, "not-the-token"), "garbage rejected");
});

run("a token issued for another job is rejected", () => {
  const a = issuePollToken();
  const b = issuePollToken();
  assert.no(verifyPollToken({ pollTokenHash: a.hash }, b.token), "cross-job replay rejected");
});

run("an empty or missing token is rejected", () => {
  const { hash } = issuePollToken();
  const job = { pollTokenHash: hash };
  assert.no(verifyPollToken(job, ""), "empty string rejected");
  assert.no(verifyPollToken(job, undefined), "undefined rejected");
  assert.no(verifyPollToken(job, null), "null rejected");
});

run("a job with no token cannot be polled with a token alone", () => {
  // Pre-fix jobs have no hash: the caller must fall back to password auth.
  assert.no(verifyPollToken({}, issuePollToken().token), "no hash means no token auth");
  assert.no(verifyPollToken(null, issuePollToken().token), "null job is safe");
});

run("verification never throws on a malformed hash", () => {
  const job = { pollTokenHash: "not-a-hash" };
  assert.no(verifyPollToken(job, "anything"), "malformed stored hash rejected, not thrown");
});

run("hashing is stable for the same input", () => {
  assert.equal(hashPollToken("abc"), hashPollToken("abc"), "deterministic");
  assert.no(hashPollToken("abc") === hashPollToken("abd"), "different input differs");
});

run("the token travels in its own header, distinct from the password one", () => {
  // Sharing a header would let a client overwrite the password by sending both.
  assert.no(POLL_TOKEN_HEADER === PASSWORD_HEADER, "headers must differ");
  assert.equal(POLL_TOKEN_HEADER, "x-9r-poll-token", "stable header name");
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "  ok  " : "  FAIL"} ${r.name}${r.err ? ` - ${r.err}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);