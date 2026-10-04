import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getSettings } from "@/lib/localDb";
import { getSecurityEvents, getSecuritySummary } from "@/lib/db/repos/securityLogRepo";

// The security trail: who signed in, what was refused, and anything that looks
// like a probe. Administrators only — a key session never reads who else came
// through the door.
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
  if (!session) {
    const settings = await getSettings();
    if (settings.requireLogin === false) return { ok: true }; // open install: no session exists by design
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (session.role === "apikey") {
    return { ok: false, status: 403, error: "The security log is available to password sign-ins only" };
  }
  return { ok: true };
}

export async function GET(request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 300;
    const severity = url.searchParams.get("severity") || null;
    const [events, summary] = await Promise.all([
      getSecurityEvents({ limit, severity }),
      getSecuritySummary(),
    ]);
    return NextResponse.json(
      { events, summary },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[API ERROR] /api/security-logs failed:", error);
    return NextResponse.json({ error: "Failed to read the security log" }, { status: 500 });
  }
}
