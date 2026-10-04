import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import {
  listNotifications,
  markRead,
  clearNotificationByKind,
  getUnreadCount,
} from "@/lib/db/repos/notificationsRepo.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications - the bell feed.
 * POST /api/notifications - { action: "read", id } or { action: "clear", kind, dedupeKey }.
 *
 * Closed to key sessions: these messages name quota pressure and failed
 * attempts against this install, which is administrator information.
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
    if (!session || session.role === "apikey") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const data = await listNotifications({ limit: limit ? Number(limit) : undefined });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.log("Error listing notifications:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
    if (!session || session.role === "apikey") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "read") {
      await markRead(body.id ? String(body.id) : "all");
      const unread = await getUnreadCount();
      return NextResponse.json({ ok: true, unread });
    }

    if (action === "clear") {
      await clearNotificationByKind(String(body.kind || ""), body.dedupeKey);
      const unread = await getUnreadCount();
      return NextResponse.json({ ok: true, unread });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.log("Error updating notifications:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}