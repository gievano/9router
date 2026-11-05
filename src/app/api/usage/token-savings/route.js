import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";
import { getProviderDisplayName } from "@/lib/db/repos/usageRepo.js";
import { getTokenSavingsReport } from "open-sse/rtk/tokenSaverStats.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/token-savings?period=30d
 * Period rollup of what Token Saver avoided: totals, per-model rows, and a
 * daily series for the chart. Cost is a live-rate estimate, flagged as such.
 *
 * Rows used to carry only the raw `provider/model` bucket key, so a compatible
 * node's generated id was printed as the model name. Each row now names its
 * provider as well, and the label is resolved here where the node table is
 * reachable.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const report = await getTokenSavingsReport(getAdapter(), searchParams.get("period") || "30d");

    const models = await Promise.all(
      (report.models || []).map(async (row) => {
        const providerName = await getProviderDisplayName(row.provider);
        return {
          ...row,
          providerName,
          modelLabel: row.model || providerName || "Unknown model",
        };
      }),
    );

    return NextResponse.json({ ...report, models });
  } catch (error) {
    console.error("Error building token-savings report:", error);
    return NextResponse.json({ error: "Failed to build token-savings report" }, { status: 500 });
  }
}
