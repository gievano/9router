import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { listSettingsHistory, getSettingsSnapshot, getSettingsSnapshotCount } from "@/lib/db/repos/settingsHistoryRepo.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/history - the before-images of the last settings mutations.
 * Exposed as part of the security trail: "what did this install look like just
 * before that change" is the question a revert needs answered first.
 */
async function requireAdmin() {
  const cookieStore = await cookies();
  const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
  if (!session || session.role === "apikey") return false;
  return true;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [entries, count] = await Promise.all([listSettingsHistory(), getSettingsSnapshotCount()]);
    return NextResponse.json(
      { history: entries, total: count },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.log("Error listing settings history:", error);
    return NextResponse.json({ error: "Failed to load settings history" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "Missing history id" }, { status: 400 });
    const snapshot = await getSettingsSnapshot(id);
    if (!snapshot) return NextResponse.json({ error: "History entry not found" }, { status: 404 });
    // Return the body so the caller can show what a revert would apply.
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.log("Error reading settings history:", error);
    return NextResponse.json({ error: "Failed to read settings history" }, { status: 500 });
  }
}