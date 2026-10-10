import crypto from "node:crypto";

// TOTP (RFC 6238, SHA-1, 30s step, 6 digits) with no new dependency.
//
// Why hand-rolled: the bundle has no otplib/otpauth/speakeasy, and a TOTP core
// is ~60 lines of HMAC + bit math — one fewer supply-chain surface for the thing
// guarding the admin login. otpauth:// URIs follow the Key URI Format so any
// authenticator app (Google Authenticator, Authy, 1Password, …) can scan them.
// QR rendering stays client-side (qrcode.react-free canvas code in the settings
// panel), so no server dependency is needed for that either.

const STEP_SEC = 30;
const DIGITS = 6;
const WINDOW = 1; // accept one step of clock skew either way

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20) {
  const raw = crypto.randomBytes(bytes);
  let out = "";
  let bits = 0;
  let value = 0;
  for (const byte of raw) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function secretToBytes(secret) {
  const clean = String(secret || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secretBytes, counter) {
  const msg = Buffer.alloc(8);
  // 64-bit big-endian counter, high word first
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const mac = crypto.createHmac("sha1", secretBytes).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totpNow(secret, atMs = Date.now()) {
  const counter = Math.floor(atMs / 1000 / STEP_SEC);
  return hotp(secretToBytes(secret), counter);
}

/** Constant-time compare over the acceptance window. */
export function verifyTotp(secret, token, atMs = Date.now()) {
  const given = String(token || "").replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(given)) return false;
  const bytes = secretToBytes(secret);
  if (bytes.length < 10) return false;
  const counter = Math.floor(atMs / 1000 / STEP_SEC);
  for (let d = -WINDOW; d <= WINDOW; d++) {
    const cand = hotp(bytes, counter + d);
    if (crypto.timingSafeEqual(Buffer.from(cand), Buffer.from(given))) return true;
  }
  return false;
}

/** otpauth:// URI for the QR / manual entry. */
export function totpUri({ secret, account = "9router-admin", issuer = "9Router" }) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret: String(secret).replace(/[^A-Z2-7]/gi, "").toUpperCase(),
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SEC),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Self-check run by the route's module test: RFC 6238 SHA-1 vectors. */
export function totpSelfCheck() {
  // RFC 6238 Appendix B, SHA-1 secret "12345678901234567890" as base32.
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const cases = [
    [59_000, "287082"],
    [1_111_111_109_000, "081804"],
    [1_234_567_890_000, "005924"],
  ];
  return cases.every(([ms, want]) => totpNow(secret, ms) === want);
}