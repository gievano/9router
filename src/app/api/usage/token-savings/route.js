import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";
import { getTokenSavingsReport } from "open-sse/rtk/tokenSaverStats.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/token-savings?period=30d
 * Period rollup of what Token Saver avoided: totals, per-model rows, and a
 * daily series for the chart. Cost is a live-rate estimate, flagged as such.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const report = await getTokenSavingsReport(getAdapter(), searchParams.get("period") || "30d");
    return NextResponse.json(report);
  } catch (error) {
    console.error("Error building token-savings report:", error);
    return NextResponse.json({ error: "Failed to build token-savings report" }, { status: 500 });
  }
}