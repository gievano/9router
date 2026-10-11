// Credential for polling a background database import job.
//
// Why this exists: the import job rewrites the `settings` row, and that row is
// where the dashboard password hash lives. Re-authenticating each progress
// poll against the database therefore breaks mid-import - the poll starts
// 401-ing against a hash that no longer matches the password the user just
// typed, and the UI reports a failed import over a restore that actually
// committed. The password is verified once, at the POST that already checked
// it, and the job is handed a single-use credential for its own lifetime.
//
// Only a SHA-256 digest of the token is kept, so a memory dump yields nothing
// that can be replayed. The token is 32 random bytes, which is far beyond
// brute-force reach for the few minutes a job lives.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PASSWORD_HEADER = "x-9r-password";
export const POLL_TOKEN_HEADER = "x-9r-poll-token";

export function hashPollToken(token) {
  return createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

/**
 * Issue a poll credential. Returns the token to send to the client and the
 * digest to store on the job. The token is single-use in intent: it is
 * dropped from the job record once the job finishes.
 */
export function issuePollToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashPollToken(token) };
}

function safeEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Does `token` belong to `job`? A job with no stored digest answers false
 * rather than throwing, so a job created before this existed falls back to
 * password authentication instead of becoming unpolled.
 */
export function verifyPollToken(job, token) {
  if (!job || typeof job !== "object") return false;
  const stored = job.pollTokenHash;
  if (typeof stored !== "string" || !stored) return false;
  if (typeof token !== "string" || !token) return false;
  return safeEqualHex(hashPollToken(token), stored);
}

/** Read the poll token out of a request header bag, tolerating a null bag. */
export function pollTokenFromHeaders(headers) {
  if (!headers || typeof headers.get !== "function") return "";
  return String(headers.get(POLL_TOKEN_HEADER) || "");
}