import crypto from "node:crypto";

// Dashboard 2FA is a self-chosen numeric PIN, not an authenticator app.
//
// Hashed with scrypt (memory-hard, built into node:crypto, no dependency) and
// compared in constant time. The PIN never leaves the server as plaintext and
// is never returned by any endpoint - even the profile status row only ever
// reports a boolean.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

function derive(pin, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      pin,
      salt,
      KEY_LEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 },
      (err, dk) => (err ? reject(err) : resolve(dk))
    );
  });
}

// "scrypt$N$r$p$saltB64$hashB64" - self-describing so parameters can change
// later without invalidating existing rows.
export async function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const dk = await derive(pin, salt);
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    dk.toString("base64"),
  ].join("$");
}

export async function verifyPin(pin, stored) {
  if (typeof pin !== "string" || typeof stored !== "string" || !stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  // crypto.scrypt is callback-style - derive() above wraps it properly, so reuse
  // it verbatim with an explicit key length instead of awaiting a value that
  // never resolves (that was the "correct PIN rejected" bug: awaited undefined
  // threw, the catch returned false for every PIN).
  const hkdf = (password, saltBytes, keylen) =>
    new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        saltBytes,
        keylen,
        { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 },
        (err, dk) => (err ? reject(err) : resolve(dk))
      );
    });
  try {
    const expected = Buffer.from(hashB64, "base64");
    const salt = Buffer.from(saltB64, "base64");
    const actual = await hkdf(pin, salt, expected.length);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// 4-8 digits. Short enough to remember, long enough that the login limiter
// (plus scrypt cost) makes online guessing unattractive.
export function isPinFormat(pin) {
  return typeof pin === "string" && /^\d{4,8}$/.test(pin);
}