import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/localDb";

// Reset dashboard password to default by clearing the stored hash.
// Local-only (enforced by dashboardGuard). Never returns the default literal.
export async function POST() {
  try {
    // Clearing the password also clears the second factor: a locked-out operator
    // who resets to default must not face a PIN they cannot remember.
    await updateSettings({ password: null, pinHash: "", pinEnabled: false, pinCreatedAt: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
