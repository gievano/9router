import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/localDb";

// Reset dashboard password to default by clearing the stored hash.
// Local-only (enforced by dashboardGuard). Never returns the default literal.
export async function POST() {
  try {
    // Clearing the password also clears the second factor: a locked-out operator
    // who resets to default must not face an OTP whose secret they lost.
    await updateSettings({ password: null, totpSecret: "", totpEnabled: false, totpCreatedAt: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
