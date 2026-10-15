import { NextResponse } from "next/server";
import {
  createDashboardJob,
  getDashboardJob,
  cancelDashboardJob,
  listDashboardJobs,
  DASHBOARD_JOB_POLL_MS,
} from "@/lib/db/dashboardJobs";
// Importing this module registers the operation handlers.
import "@/lib/db/dashboardJobHandlers";

export const dynamic = "force-dynamic";

// POST /api/dashboard-jobs - start a server-side dashboard operation.
//
// The operation runs on the server and survives the browser closing; the
// dashboard polls for progress and can leave. Same shape as
// /api/proxy-pools/import-jobs, generalised past the one hardcoded operation.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const kind = typeof body?.kind === "string" ? body.kind : "";
  if (!kind) {
    return NextResponse.json({ error: "kind is required" }, { status: 400 });
  }

  try {
    const title = typeof body?.title === "string" ? body.title : "";
    const { jobId } = createDashboardJob(kind, body?.payload || {}, title);
    return NextResponse.json({ jobId, pollMs: DASHBOARD_JOB_POLL_MS }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Could not start the operation" },
      { status: 400 }
    );
  }
}

// GET /api/dashboard-jobs?id=... - one job's progress.
// GET /api/dashboard-jobs (no id) - every live job, for the notification bell.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const job = getDashboardJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job });
  }

  const jobs = listDashboardJobs().filter(
    (j) => j.status === "queued" || j.status === "running"
  );
  return NextResponse.json({ jobs, pollMs: DASHBOARD_JOB_POLL_MS });
}

// DELETE /api/dashboard-jobs?id=... - stop a running job.
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const ok = cancelDashboardJob(id);
  if (!ok) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}