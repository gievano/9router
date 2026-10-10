import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { setDashboardAuthCookie } from "@/lib/auth/dashboardSession";
import { isOidcConfigured } from "@/lib/auth/oidc";
import { isSamlConfigured } from "@/lib/auth/saml.js";
import { checkLock, recordFail, recordSuccess, getClientIp } from "@/lib/auth/loginLimiter";
import { isTrustedNetworkRequest } from "@/lib/auth/trustedPeer";
import { normalizePermissions, firstAllowedPage } from "@/lib/auth/permissionPaths";
import { recordSecurityEvent } from "@/lib/db/repos/securityLogRepo";

// One helper so every branch below writes the same shape, and so the raw secret
// can never reach the log by accident.
function audit(request, ip, event) {
  return recordSecurityEvent({
    ...event,
    ip,
    method: "POST",
    path: "/api/auth/login",
    userAgent: request.headers?.get?.("user-agent") || "",
  });
}

const RESET_HINT = "Forgot password? Reset to default via 9Router CLI → Settings → Reset Password to Default.";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

// Short, non-sensitive description of what a key may do, for the audit trail.
function permissionsPreview(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {};
    const held = Object.entries(parsed)
      .filter(([, on]) => on === true)
      .map(([name]) => name);
    return held.length ? held.join(", ") : "no permissions";
  } catch {
    return "unknown permissions";
  }
}

function isTunnelRequest(request, settings) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const tunnelHost = settings.tunnelUrl ? new URL(settings.tunnelUrl).hostname.toLowerCase() : "";
  const tailscaleHost = settings.tailscaleUrl ? new URL(settings.tailscaleUrl).hostname.toLowerCase() : "";
  return (tunnelHost && host === tunnelHost) || (tailscaleHost && host === tailscaleHost);
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const lock = checkLock(ip);
    if (lock.locked) {
      await audit(request, ip, {
        type: "login_locked",
        severity: "warn",
        detail: `Locked out after repeated failures; retry allowed in ${lock.retryAfter}s`,
      });
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${lock.retryAfter}s. ${RESET_HINT}`, retryAfter: lock.retryAfter, resetHint: RESET_HINT },
        { status: 429, headers: { "Retry-After": String(lock.retryAfter) } }
      );
    }

    const { password, apiKey } = await request.json();
    const settings = await getSettings();

    // Block login via tunnel/tailscale if dashboard access is disabled
    if (isTunnelRequest(request, settings) && settings.tunnelDashboardAccess !== true) {
      return NextResponse.json({ error: "Dashboard access via tunnel is disabled" }, { status: 403 });
    }

    // Support Login via API Key
    if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
      const { validateApiKey, getApiKeyByKey } = await import("@/lib/localDb");
      const keyStr = apiKey.trim();
      const valid = await validateApiKey(keyStr, null, ip);
      if (valid !== true) {
        let msg = "Invalid API key";
        if (valid === "KEY_DISABLED") msg = "API key is disabled";
        else if (valid === "KEY_EXPIRED") msg = "API key is expired";
        else if (valid === "QUOTA_EXCEEDED") msg = "API key quota exceeded";
        else if (valid === "IP_NOT_ALLOWED") msg = "Client IP not allowed for this API key";
        await audit(request, ip, {
          type: "apikey_login_failed",
          severity: "warn",
          // The reason, never the key: this table is readable in the dashboard.
          detail: msg,
          actor: keyStr.slice(0, 8) + "…",
        });
        return NextResponse.json({ error: msg }, { status: 401 });
      }

      const keyObj = await getApiKeyByKey(keyStr);
      if (!keyObj) {
        return NextResponse.json({ error: "API key not found" }, { status: 401 });
      }

      recordSuccess(ip);
      await audit(request, ip, {
        type: "apikey_login_success",
        severity: "info",
        actor: keyObj.name || keyObj.id,
        detail: `Signed in with API key "${keyObj.name || keyObj.id}" (${permissionsPreview(keyObj.permissions)})`,
      });
      const cookieStore = await cookies();
      const permissions = normalizePermissions(keyObj.permissions);
      await setDashboardAuthCookie(cookieStore, request, {
        role: "apikey",
        keyId: keyObj.id,
        keyName: keyObj.name || "API Key",
        apiKey: keyObj.key,
        permissions,
        allowedModels: keyObj.allowedModels || "*",
        tokenLimit: keyObj.tokenLimit || 0,
      });

      const homePath = firstAllowedPage(permissions);
      return NextResponse.json(
        { success: true, role: "apikey", mustChangePassword: false, homePath },
        { headers: NO_STORE_HEADERS }
      );
    }

    // Default password is 'seren123' if not set
    const storedHash = settings.password;

    if (settings.authMode === "sso" || settings.authMode === "saml" || settings.authMode === "oidc") {
      const ssoType = settings.ssoType || (settings.authMode === "saml" ? "saml" : "oidc");
      if (ssoType === "saml" && isSamlConfigured(settings)) {
        return NextResponse.json({ error: "Password login is disabled. Use SAML SSO sign in." }, { status: 403 });
      }
      if (ssoType === "oidc" && isOidcConfigured(settings)) {
        return NextResponse.json({ error: "Password login is disabled. Use OIDC sign in." }, { status: 403 });
      }
    }

    let isValid = false;
    if (storedHash) {
      isValid = await bcrypt.compare(password, storedHash);
    } else {
      // Use env var or default
      const initialPassword = process.env.INITIAL_PASSWORD || "seren123";
      isValid = password === initialPassword;
    }

    if (isValid) {
      recordSuccess(ip);
      // A fresh install still on the published default password must not hand a
      // session to a stranger. A Docker bridge or LAN peer counts as the operator's
      // own machine, so the advertised default works there without INITIAL_PASSWORD.
      const remoteDefaultLogin =
        !storedHash && !process.env.INITIAL_PASSWORD && !isTrustedNetworkRequest(request);
      // Escape hatch for a first login from a public address you cannot reach
      // localhost from: set ALLOW_REMOTE_DEFAULT_LOGIN=true just for that login.
      const mustChangePassword =
        remoteDefaultLogin && process.env.ALLOW_REMOTE_DEFAULT_LOGIN !== "true";

      if (mustChangePassword) {
        // Do NOT issue a session token: a fresh install's default password is
        // public knowledge ("123456"), so handing out a valid JWT would let any
        // remote attacker authenticate and (e.g.) PATCH /api/settings to disable
        // authentication entirely (CVE-2026-56679 class). Require the password
        // to be changed first.
        //
        // NOTE: this intentionally leaves no remote self-service password-change
        // path — the change-password flow (PATCH /api/settings) requires a JWT,
        // which we deliberately withhold. A remote fresh-install user must either
        // change the password from the local machine or set INITIAL_PASSWORD
        // before first launch. This is a deliberate security trade-off, not an
        // oversight: issuing any credential before the default password is
        // rotated re-opens the exact attack chain this branch closes.
        await audit(request, ip, {
          type: "login_default_password",
          severity: "critical",
          detail: "The published default password was used from a remote address; no session was issued",
        });
        return NextResponse.json(
          { success: false, error: "The default password only works from the machine running 9Router, or from the same Docker/LAN network. Open localhost there and change it, or start once with INITIAL_PASSWORD. Set ALLOW_REMOTE_DEFAULT_LOGIN=true to allow the first login from anywhere.", mustChangePassword },
          { status: 403, headers: NO_STORE_HEADERS }
        );
      }

      const cookieStore = await cookies();
      await setDashboardAuthCookie(cookieStore, request, { role: "admin" });
      await audit(request, ip, {
        type: "login_success",
        severity: "info",
        actor: "Password user",
        detail: storedHash
          ? "Password sign-in"
          : "Password sign-in using the initial/default password",
      });

      return NextResponse.json({ success: true, role: "admin", mustChangePassword: false }, { headers: NO_STORE_HEADERS });
    }

    const { remainingBeforeLock } = recordFail(ip);
    const postLock = checkLock(ip);
    if (postLock.locked) {
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${postLock.retryAfter}s. ${RESET_HINT}`, retryAfter: postLock.retryAfter, resetHint: RESET_HINT },
        { status: 429, headers: { "Retry-After": String(postLock.retryAfter) } }
      );
    }
    await audit(request, ip, {
      type: "login_failed",
      severity: "warn",
      detail: `Wrong password; ${remainingBeforeLock} attempt(s) left before lockout`,
    });
    return NextResponse.json(
      { error: `Invalid password. ${remainingBeforeLock} attempt(s) left before lockout.`, remainingBeforeLock },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
