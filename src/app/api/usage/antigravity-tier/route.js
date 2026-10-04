import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/dashboardPermissions";
import { getAntigravityTier } from "@/lib/usage/antigravityTier";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/antigravity-tier
 *
 * Reports whether the connected Antigravity account can actually reach the
 * Claude 5.5 models, so the UI can mark them instead of offering them blind.
 *
 * Claude Opus/Sonnet 5.5 are gated behind Antigravity's `standard-tier`, which
 * is a separate subscription from Google One AI Pro. Google One Pro on a trial
 * leaves the account on `free-tier`, and upstream then answers those model ids
 * with 404 — so the flag has to come from the live tier, never from a hardcoded
 * assumption. Read-only: no tokens are persisted or logged here.
 */
export async function GET() {
  try {
    const ctx = await getSessionContext();
    if (!ctx.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getAntigravityTier();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // A tier probe failure must never break the page; fall back to "unknown"
    // and let the UI keep its neutral styling.
    return NextResponse.json(
      { tierId: null, tierName: null, canUseClaude55: false, error: error?.message || "tier probe failed" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}