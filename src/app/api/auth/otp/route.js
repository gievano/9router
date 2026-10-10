import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { cookies } from "next/headers";
import {
  setDashboardAuthCookie,
  verifyOtpPendingToken,
} from "@/lib/auth/dashboardSession";
import { checkLock, recordFail, recordSuccess, getClientIp } from "@/lib/auth/loginLimiter";
import { recordSecurityEvent } from "@/lib/db/repos/securityLogRepo";
import { verifyTotp } from "@/lib/auth/totp";
import { takeChallenge } from "@/lib/auth/otpChallenge";

const NO_STORE = { "Cache-Control": "no-store" };

function bearer(request) {
  const h = request.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

function audit(request, ip, event) {
  return recordSecurityEvent({
    ...event,
    ip,
    method: request.method,
    path: "/api/auth/otp",
    userAgent: request.headers?.get?.("user-agent") || "",
  });
}

// GET /api/auth/otp/challenge — Authorization: Bearer <otpToken>
// Returns a fresh secret + otpauth URI for the authenticator app.
export async function GET(request) {
  const pending = await verifyOtpPendingToken(bearer(request));
  if (!pending) {
    return NextResponse.json({ error: "Login session expired. Sign in with your password again." }, { status: 401, headers: NO_STORE });
  }
  const settings = await getSettings();
  if (settings.totpEnabled && settings.totpSecret) {
    return NextResponse.json({ error: "Two-factor is already set up for this dashboard." }, { status: 409, headers: NO_STORE });
  }
  const { id, secret } = newChallenge();
  return NextResponse.json(
    { challengeId: id, secret, uri: totpUri({ secret }) },
    { headers: NO_STORE }
  );
}

// POST /api/auth/otp — { otpToken, code, challengeId? }
// With challengeId: first enrollment (prove the scanned secret works).
// Without: steady-state second factor.
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const lock = checkLock(ip);
    if (lock.locked) {
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${lock.retryAfter}s.`, retryAfter: lock.retryAfter },
        { status: 429, headers: { "Retry-After": String(lock.retryAfter), ...NO_STORE } }
      );
    }
    const { otpToken, code, challengeId } = await request.json();
    const pending = await verifyOtpPendingToken(otpToken || bearer(request));
    if (!pending) {
      return NextResponse.json({ error: "Login session expired. Sign in with your password again." }, { status: 401, headers: NO_STORE });
    }

    if (challengeId) {
      // ——— enrollment ———
      const settings = await getSettings();
      if (settings.totpEnabled && settings.totpSecret) {
        return NextResponse.json({ error: "Two-factor is already set up for this dashboard." }, { status: 409, headers: NO_STORE });
      }
      const secret = takeChallenge(challengeId);
      if (!secret) {
        return NextResponse.json({ error: "Setup code expired. Get a new one and try again." }, { status: 410, headers: NO_STORE });
      }
      if (!verifyTotp(secret, code)) {
        const { remainingBeforeLock } = recordFail(ip);
        await audit(request, ip, { type: "otp_setup_failed", severity: "warn", detail: `Wrong setup code; ${remainingBeforeLock} attempt(s) left before lockout` });
        return NextResponse.json({ error: `Wrong code. ${remainingBeforeLock} attempt(s) left before lockout.`, remainingBeforeLock }, { status: 401, headers: NO_STORE });
      }
      await updateSettings({ totpSecret: secret, totpEnabled: true, totpCreatedAt: Date.now() });
      recordSuccess(ip);
      const cookieStore = await cookies();
      await setDashboardAuthCookie(cookieStore, request, { role: "admin", mfa: "totp" });
      await audit(request, ip, { type: "otp_setup_success", severity: "info", actor: "Password user", detail: "Two-factor enrolled and dashboard session issued" });
      return NextResponse.json({ success: true, role: "admin" }, { headers: NO_STORE });
    }

    // ——— steady state ———
    const settings = await getSettings();
    if (!settings.totpEnabled || !settings.totpSecret) {
      return NextResponse.json({ error: "Two-factor is not set up yet. Enroll first.", needsOtpSetup: true }, { status: 409, headers: NO_STORE });
    }
    if (!verifyTotp(settings.totpSecret, code)) {
      const { remainingBeforeLock } = recordFail(ip);
      await audit(request, ip, { type: "otp_failed", severity: "warn", detail: `Wrong OTP; ${remainingBeforeLock} attempt(s) left before lockout` });
      return NextResponse.json({ error: `Wrong code. ${remainingBeforeLock} attempt(s) left before lockout.`, remainingBeforeLock }, { status: 401, headers: NO_STORE });
    }
    recordSuccess(ip);
    const cookieStore = await cookies();
    await setDashboardAuthCookie(cookieStore, request, { role: "admin", mfa: "totp" });
    await audit(request, ip, {
      type: "login_success",
      severity: "info",
      actor: "Password user",
      detail: "Password + OTP sign-in",
    });
    return NextResponse.json({ success: true, role: "admin" }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
}

// DELETE /api/auth/otp — disable the second factor (admin session required;
// the route lives behind the dashboard guard like every other admin API).
export async function DELETE() {
  await updateSettings({ totpSecret: "", totpEnabled: false, totpCreatedAt: 0 });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}