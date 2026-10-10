import { generateTotpSecret, totpUri } from "./totp";

// Pending enrollment secrets: challengeId -> { secret, expiresAt }.
// In-memory on purpose: a restart between "show key" and "confirm code" only
// means re-enroll, and no half-enrolled secret ever touches the DB.
const PENDING = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function newChallenge() {
  const secret = generateTotpSecret();
  const id = generateTotpSecret(12).replace(/[^A-Z2-7]/g, "").slice(0, 16);
  PENDING.set(id, { secret, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  for (const [k, v] of PENDING) if (v.expiresAt < Date.now()) PENDING.delete(k);
  return { id, secret, uri: totpUri({ secret }) };
}

export function takeChallenge(id) {
  const hit = PENDING.get(String(id || ""));
  if (!hit) return null;
  PENDING.delete(String(id || ""));
  if (hit.expiresAt < Date.now()) return null;
  return hit.secret;
}