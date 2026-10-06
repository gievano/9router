import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { killAppProcesses } from "@/lib/appUpdater";
import { closeDb } from "@/lib/db/driver";

// Shutdown app to release file locks for manual update.
//
// Password sessions only: stopping the process is an administrator action, and
// a key-signed session must reach this endpoint only to be told no - hiding the
// button in the menu is presentation, this is the rule.
export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
    if (!session || session.role === "apikey") {
      return NextResponse.json(
        { success: false, message: "Only a password session can shut the server down" },
        { status: 403 }
      );
    }
  } catch {
    // A session that cannot be read is not an administrator.
    return NextResponse.json(
      { success: false, message: "Only a password session can shut the server down" },
      { status: 403 }
    );
  }

  try {
    await closeDb();
  } catch { /* best effort */ }

  try {
    await killAppProcesses();
  } catch { /* best effort */ }

  const response = NextResponse.json({ success: true, message: "Shutting down for manual update..." });

  setTimeout(() => process.exit(0), 500);

  return response;
}
