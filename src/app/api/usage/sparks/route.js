import { NextResponse } from "next/server";
import { getSparks } from "@/lib/db/repos/usageRepo.js";
import { getSessionContext } from "@/lib/auth/dashboardPermissions";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/sparks?period=30d
 * Compact per-day totals for the Overview card sparklines plus recent
 * session-scoped timestamps for the activity heatmap.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }
    const ctx = await getSessionContext();
    const sparks = await getSparks(period, ctx.apiKeyFilter, ctx.allowedModels);
    return NextResponse.json(sparks);
  } catch (error) {
    console.error("[API] Failed to get usage sparks:", error);
    return NextResponse.json({ error: "Failed to fetch usage sparks" }, { status: 500 });
  }
}
