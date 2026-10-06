import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getUpdateInfo } from "@/lib/updateCheck";
import { getApiKeys } from "@/lib/db/repos/apiKeysRepo.js";
import { notify, clearNotificationByKind } from "@/lib/db/repos/notificationsRepo.js";

export const dynamic = "force-dynamic";

// GET /api/notifications/scan - derive conditions into notifications.
//
// A notification is written once per condition (dedupeKey), so this can run on
// every dashboard load without flooding the feed. Each condition also clears
// itself when it stops being true, so a resolved problem stops nagging and a
// relapse is announced again.

function quotaState(key) {
  const limit = Number(key.tokenLimit) || 0;
  const used = Number(key.usedTokens) || 0;
  if (!limit) return null;
  const pct = used / limit;
  if (pct >= 1) return { level: "critical", pct };
  if (pct >= 0.9) return { level: "warning", pct };
  return null;
}

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
    const keys = await getApiKeys();
    const seen = new Set();
    for (const key of keys || []) {
      const state = quotaState(key);
      if (!state) continue;
      seen.add(key.id);
      const dedupeKey = `quota:${key.id}:${state.level}`;
      await notify({
        kind: "quota",
        severity: state.level === "critical" ? "error" : "warning",
        title:
          state.level === "critical"
            ? `Key "${key.name}" is out of tokens`
            : `Key "${key.name}" is at ${Math.round(state.pct * 100)}% of its token limit`,
        body: `${used(key.usedTokens)} of ${used(key.tokenLimit)} tokens used.`,
        link: "/dashboard/endpoint",
        dedupeKey,
      });
      created.push(`quota:${key.id}`);
    }
    // clear quotas that recovered (not in `seen`)
    for (const key of keys || []) {
      if (!seen.has(key.id)) {
        await clearNotificationByKind("quota", `quota:${key.id}:warning`);
        await clearNotificationByKind("quota", `quota:${key.id}:critical`);
      }
    }
  } catch (error) {
    // Deriving conditions must never break the dashboard.
    console.warn("[notifications] scan failed:", error?.message || error);
  }

  return Response.json({ created, checkedAt: new Date().toISOString() });
}

function used(n) {
  return (Number(n) || 0).toLocaleString();
}