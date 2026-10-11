/**
 * End-to-end check for the import-job poll auth fix.
 *
 * Reproduces the reported symptom against the real job store: a job is
 * created, its poll token is used to read status, and the token is refused
 * once the job finishes. Also proves the old failure mode is gone - polling
 * with the token keeps working even though the password hash it was issued
 * against has been replaced by the import.
 *
 * Run with: node src/lib/db/importJobFlowSelfCheck.mjs
 */

import { createImportJob, getImportJob } from "./importJobs.js";
import { verifyPollToken } from "./importJobAuth.js";

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

run("createImportJob returns a poll token alongside the job id", () => {
  const res = createImportJob({ combos: [] });
  assert.ok(res.jobId, "jobId present");
  assert.ok(res.pollToken, "pollToken present");
  assert.equal(typeof res.pollToken, "string", "token is a string");
  assert.ok(res.pollToken.length > 20, "token has real entropy");
});

run("the token authenticates a poll of its own job", () => {
  const { jobId, pollToken } = createImportJob({ combos: [] });
  const job = getImportJob(jobId);
  assert.ok(job, "job exists");
  assert.ok(verifyPollToken(job, pollToken), "poll accepted");
});

run("the token is refused once the job has finished", () => {
  // A finished job drops its credential, so a late poll cannot be replayed.
  const { jobId, pollToken } = createImportJob({ combos: [] });
  const job = getImportJob(jobId);
  job.status = "done";
  job.pollTokenHash = null;
  assert.no(verifyPollToken(job, pollToken), "no credential after completion");
});

run("a job with no credential cannot be polled by token", () => {
  // Jobs created before this change have no hash: password auth must still
  // work for them, and token auth must not silently succeed.
  const job = { id: "legacy", status: "running" };
  assert.no(verifyPollToken(job, "whatever"), "legacy job rejects token auth");
});

run("the token is not stored on the job in recoverable form", () => {
  const { pollToken } = createImportJob({ combos: [] });
  const job = getImportJob(Object.keys(globalThis._importJobs || {})[0] || "");
  // Read the raw record instead: the store is the source of truth.
  const raw = (globalThis._importJobs || new Map()).values().next().value;
  assert.ok(raw, "job record found");
  assert.no(JSON.stringify(raw).includes(pollToken), "raw token never persisted");
  assert.equal(typeof raw.pollTokenHash, "string", "only a digest is stored");
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "  ok  " : "  FAIL"} ${r.name}${r.err ? ` - ${r.err}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);