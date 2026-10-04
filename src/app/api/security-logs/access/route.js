import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { getSettings } from "@/lib/localDb";
import { getAccessEvents } from "@/lib/db/repos/securityLogRepo";

// The access trail half of the security page: recent dashboard/API requests.
// Same rule as /api/security-logs — password sign-ins only.
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
    if (!session) {
      const settings = await getSettings();
      if (settings.requireLogin !== false) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (session.role === "apikey") {
      return NextResponse.json(
        { error: "The security log is available to password sign-ins only" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 200;
    const events = await getAccessEvents({ limit });
    return NextResponse.json(
      { events, total: events.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[API ERROR] /api/security-logs/access failed:", error);
    return NextResponse.json({ error: "Failed to read request log" }, { status: 500 });
  }
}