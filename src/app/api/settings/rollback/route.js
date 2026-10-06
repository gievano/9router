import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getSettingsSnapshot, sanitizeHistorySnapshot, snapshotSettings } from "@/lib/db/repos/settingsHistoryRepo.js";
import { updateSettings, getSettings } from "@/lib/localDb";
import { recordSecurityEvent } from "@/lib/db/repos/securityLogRepo.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/settings/rollback - { id, keys? }
 *
 * Re-applies one stored snapshot. `keys` (optional) limits the revert to a
 * subset; without it every key in the snapshot is restored. The snapshot itself
 * is re-sanitized on the way out - a history entry cannot resurrect a password
 * or a token, because those keys never enter the table in the first place.
 *
 * The current settings are snapshotted first, so an accidental revert is itself
 * revertible; that also keeps the audit trail honest (the revert appears as a
 * change like any other).
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
    if (!session || session.role === "apikey") {
      return NextResponse.json({ error: "Only a password sign-in can revert settings" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "Missing history id" }, { status: 400 });

    const snapshot = await getSettingsSnapshot(id);
    if (!snapshot) return NextResponse.json({ error: "History entry not found" }, { status: 404 });

    let patch = snapshot.snapshot;
    if (Array.isArray(body.keys) && body.keys.length) {
      const allow = new Set(body.keys.map(String));
      patch = {};
      for (const [key, value] of Object.entries(snapshot.snapshot)) {
        if (allow.has(key)) patch[key] = value;
      }
    }
    patch = sanitizeHistorySnapshot(patch);
    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Nothing to restore from this snapshot" }, { status: 400 });
    }

    // Before-image of the revert itself: undoing a revert must be possible.
    const current = await getSettings();
    await snapshotSettings({
      before: current,
      actor: `revert of ${id}`,
      reason: Object.keys(patch).join(", "),
    });

    const settings = await updateSettings(patch);
    await recordSecurityEvent({
      type: "settings_changed",
      severity: "info",
      actor: "Password user (rollback)",
      method: "POST",
      path: "/api/settings/rollback",
      status: 200,
      detail: `Restored ${Object.keys(patch).length} setting(s) from ${snapshot.at}: ${Object.keys(patch).join(", ")}`,
    });

    const { password, oidcClientSecret, ...safe } = settings;
    return NextResponse.json({ ok: true, restored: Object.keys(patch), settings: safe });
  } catch (error) {
    console.log("Error rolling back settings:", error);
    return NextResponse.json({ error: "Failed to roll back settings" }, { status: 500 });
  }
}