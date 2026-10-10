import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import { verifyOtpPendingToken } from "@/lib/auth/dashboardSession";
import { newChallenge } from "@/lib/auth/otpChallenge";

// GET /api/auth/otp/challenge — Authorization: Bearer <otp-pending token>.
// Issues a fresh enrollment secret + otpauth URI. Only reachable with a token
// that proves the password was just accepted; the route re-checks the pending
// token itself, so making this path public in the guard is safe.
export async function GET(request) {
  const header = request.headers.get("authorization") || "";
  const token = (header.match(/^Bearer\s+(.+)$/i) || [])[1]?.trim();
  const pending = await verifyOtpPendingToken(token);
  if (!pending) {
    return NextResponse.json(
      { error: "Login session expired. Sign in with your password again." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const settings = await getSettings();
  if (settings.totpEnabled && settings.totpSecret) {
    return NextResponse.json(
      { error: "Two-factor is already set up for this dashboard." },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }
  const { id, secret, uri } = newChallenge();
  return NextResponse.json(
    { challengeId: id, secret, uri },
    { headers: { "Cache-Control": "no-store" } }
  );
}