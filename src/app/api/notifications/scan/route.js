import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getUpdateInfo } from "@/lib/updateCheck";
import { getApiKeys } from "@/lib/db/repos/apiKeysRepo.js";
import { notify, clearNotificationByKind } from "@/lib/db/repos/notificationsRepo.js";
import { quotaPressure, quotaTitle, quotaBody } from "@/lib/notifications/quotaPressure.js";

export const dynamic = "force-dynamic";

// GET /api/notifications/scan - derive conditions into notifications.
//
// A notification is written once per condition (dedupeKey), so this can run on
// every dashboard load without flooding the feed. Each condition also clears
// itself when it stops being true, so a resolved problem stops nagging and a
// relapse is announced again.

// Every kind a key can enforce, so a notice written under one kind is cleared when the
// key is switched to another (or its budget is raised) instead of lingering as advice
// about a budget that no longer exists.
const QUOTA_KINDS = ["tokens", "cost", "requests"];
const QUOTA_LEVELS = ["warning", "critical"];

export async function GET() {
  // Bell button and the header call this. A key session gets nothing to derive
  // from: key names and quota pressure are admin-only facts.
  const cookieStore = await cookies();
  const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
  if (!session || session.role === "apikey") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created = [];
  try {
    // --- update available ---
    const info = await getUpdateInfo();
    if (info.hasUpdate) {
      const dedupeKey = `update:${info.currentRevision || info.currentVersion}`;
      await notify({
        kind: "update",
        severity: "info",
        title: `Update available: ${info.latestVersion}`,
        body: info.commitMessage || info.releaseNotes?.[0] || "A newer release is on the repository.",
        link: "/dashboard/profile",
        dedupeKey,
      });
      created.push("update");
    } else {
      await clearNotificationByKind("update", `update:${info.currentRevision || info.currentVersion}`);
    }

    // --- key quota pressure ---
    // Reads the budget the key actually enforces (`limitKind`), not just the token cap:
    // a key switched to a USD or request budget used to spend itself in silence.
    const keys = await getApiKeys();
    const live = new Set();
    for (const key of keys || []) {
      const state = quotaPressure(key);
      if (!state) continue;
      const dedupeKey = `quota:${key.id}:${state.kind}:${state.level}`;
      live.add(dedupeKey);
      await notify({
        kind: "quota",
        severity: state.level === "critical" ? "error" : "warning",
        title: quotaTitle(key, state),
        body: quotaBody(state),
        link: "/dashboard/endpoint",
        dedupeKey,
      });
      created.push(`quota:${key.id}`);
    }
    // Clear every notice this pass did not recreate: recovered, raised, deactivated, or
    // switched to a different kind.
    for (const key of keys || []) {
      for (const kind of QUOTA_KINDS) {
        for (const level of QUOTA_LEVELS) {
          const dedupeKey = `quota:${key.id}:${kind}:${level}`;
          if (!live.has(dedupeKey)) await clearNotificationByKind("quota", dedupeKey);
        }
      }
    }

  } catch (error) {
    // Deriving conditions must never break the dashboard.
    console.warn("[notifications] scan failed:", error?.message || error);
  }

  return Response.json({ created, checkedAt: new Date().toISOString() });
}
