import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { cookies } from "next/headers";
import {
  setDashboardAuthCookie,
  verifyPendingToken,
  spendPendingToken,
} from "@/lib/auth/dashboardSession";
import { checkLock, recordFail, recordSuccess, getClientIp } from "@/lib/auth/loginLimiter";
import { recordSecurityEvent } from "@/lib/db/repos/securityLogRepo";
import { hashPin, verifyPin, isPinFormat } from "@/lib/auth/pinAuth";

const NO_STORE = { "Cache-Control": "no-store" };

function bearer(request) {
  const h = request.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

async function issueSession(request, event) {
  const cookieStore = await cookies();
  await setDashboardAuthCookie(cookieStore, request, { role: "admin", mfa: "pin" });
  await recordSecurityEvent({
    ...event,
    ip: getClientIp(request),
    method: request.method,
    path: "/api/auth/pin",
    userAgent: request.headers?.get?.("user-agent") || "",
  });
}

// POST /api/auth/pin — { pendingToken?, pin, confirmPin? }
// Two jobs in one route because the login page owns the state machine:
//   * confirmPin present -> first-time creation (only while none is set)
//   * otherwise          -> verify against the stored hash
// Either way the session is issued here, so the pending token is spent on
// success and a half-finished login can never be resumed.
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

    const { pendingToken, pin, confirmPin } = await request.json();
    const pending = await verifyPendingToken(pendingToken || bearer(request));
    if (!pending) {
      return NextResponse.json(
        { error: "Login session expired. Sign in with your password again." },
        { status: 401, headers: NO_STORE }
      );
    }

    const settings = await getSettings();
    const creating = typeof confirmPin === "string" && confirmPin.length > 0;

    if (creating) {
      if (settings.pinEnabled && settings.pinHash) {
        return NextResponse.json(
          { error: "A PIN is already set for this dashboard." },
          { status: 409, headers: NO_STORE }
        );
      }
      if (!isPinFormat(pin)) {
        return NextResponse.json(
          { error: "PIN must be 4 to 8 digits." },
          { status: 400, headers: NO_STORE }
        );
      }
      if (pin !== confirmPin) {
        return NextResponse.json(
          { error: "The two PINs do not match." },
          { status: 400, headers: NO_STORE }
        );
      }
      await updateSettings({ pinHash: await hashPin(pin), pinEnabled: true, pinCreatedAt: Date.now() });
      recordSuccess(ip);
      spendPendingToken(pending);
      await issueSession(request, {
        type: "pin_created",
        severity: "info",
        actor: "Password user",
        detail: "PIN 2FA created and dashboard session issued",
      });
      return NextResponse.json({ success: true, role: "admin" }, { headers: NO_STORE });
    }

    if (!settings.pinEnabled || !settings.pinHash) {
      return NextResponse.json(
        { error: "No PIN is set yet. Create one first.", needsPinSetup: true },
        { status: 409, headers: NO_STORE }
      );
    }
    if (!isPinFormat(pin) || !(await verifyPin(pin, settings.pinHash))) {
      const { remainingBeforeLock } = recordFail(ip);
      await recordSecurityEvent({
        type: "pin_failed",
        severity: "warn",
        ip,
        method: request.method,
        path: "/api/auth/pin",
        userAgent: request.headers?.get?.("user-agent") || "",
        detail: `Wrong PIN; ${remainingBeforeLock} attempt(s) left before lockout`,
      });
      return NextResponse.json(
        { error: `Wrong PIN. ${remainingBeforeLock} attempt(s) left before lockout.`, remainingBeforeLock },
        { status: 401, headers: NO_STORE }
      );
    }

    recordSuccess(ip);
    spendPendingToken(pending);
    await issueSession(request, {
      type: "login_success",
      severity: "info",
      actor: "Password user",
      detail: "Password + PIN sign-in",
    });
    return NextResponse.json({ success: true, role: "admin" }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }
}

// DELETE /api/auth/pin — turn 2FA off. Behind the dashboard guard like every
// other admin API, so it needs a real session.
export async function DELETE() {
  const settings = await getSettings();
  if (!settings.pinEnabled && !settings.pinHash) {
    return NextResponse.json({ success: true, wasEnabled: false }, { headers: NO_STORE });
  }
  await updateSettings({ pinHash: "", pinEnabled: false, pinCreatedAt: 0 });
  return NextResponse.json({ success: true, wasEnabled: true }, { headers: NO_STORE });
}