import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "@/lib/dataDir";
import { getSettings } from "@/lib/localDb";

// Fork default password; upstream's 24h session lifetime is kept.
const DEFAULT_PASSWORD = "seren123";
const SESSION_MAX_AGE_SEC = 24 * 60 * 60;

// The file name carries the auth shape version: when password login became
// two-step, old cookies had to die rather than keep dashboard access. Any future
// auth change bumps the suffix and every issued cookie stops verifying.
const SESSION_EPOCH = "v2";

function loadJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(DATA_DIR, `jwt-secret-${SESSION_EPOCH}`);
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {}
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const generated = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(file, generated, { mode: 0o600 });
  return generated;
}

const SECRET = new TextEncoder().encode(loadJwtSecret());

export function shouldUseSecureCookie(request) {
  const forceSecureCookie = process.env.AUTH_COOKIE_SECURE === "true";
  const forwardedProto = request?.headers?.get?.("x-forwarded-proto");
  const isHttpsRequest = forwardedProto === "https";
  return forceSecureCookie || isHttpsRequest;
}

export async function createDashboardAuthToken(claims = {}) {
  return new SignJWT({ authenticated: true, purpose: "dashboard-auth", ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

// Short-lived token proving "password was correct, PIN still pending".
// It is deliberately NOT accepted by verifyDashboardAuthToken below: a
// A half-finished login must never open the dashboard, even if the bearer
// presents this token to the guard.
// jti -> unix expiry. A pending token is single-use: once it has been
// exchanged for a session it must not mint a second one.
const SPENT_PENDING = new Map();

function dropSpent(jti) {
  const exp = SPENT_PENDING.get(jti);
  SPENT_PENDING.delete(jti);
  return exp;
}

// Called only after a successful exchange. A failed attempt deliberately does
// not spend the token, so the operator can retry without retyping the password.
export function spendPendingToken(payload) {
  const jti = payload?.jti;
  if (!jti) return;
  SPENT_PENDING.set(jti, payload.exp || Math.floor(Date.now() / 1000) + 300);
  setTimeout(
    () => dropSpent(jti),
    Math.max(1000, (payload.exp || 0) * 1000 - Date.now() + 60000)
  ).unref?.();
}

export async function createPendingToken() {
  return new SignJWT({ authenticated: false, purpose: "pending", jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(SECRET);
}

export async function verifyPendingToken(token) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload || payload.purpose !== "pending") return false;
    if (payload.jti && SPENT_PENDING.has(payload.jti)) return false;
    return payload;
  } catch {
    return false;
  }
}

export async function verifyDashboardAuthToken(token) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    // Full sessions only. The pending token proves the password but not the
    // factor, so it must fail here even though it is genuinely signed.
    if (payload.purpose && payload.purpose !== "dashboard-auth") return false;
    return payload.authenticated === true;
  } catch {
    return false;
  }
}

export async function getDashboardAuthSession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function setDashboardAuthCookie(cookieStore, request, claims = {}) {
  const token = await createDashboardAuthToken(claims);
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearDashboardAuthCookie(cookieStore) {
  cookieStore.delete("auth_token");
}

// Verify the current dashboard password (re-auth for sensitive actions).
export async function verifyDashboardPassword(password) {
  if (typeof password !== "string" || !password) return false;
  const settings = await getSettings();
  const storedHash = settings?.password;
  if (storedHash) return bcrypt.compare(password, storedHash);
  const initialPassword = process.env.INITIAL_PASSWORD || DEFAULT_PASSWORD;
  return password === initialPassword;
}
