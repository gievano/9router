import { NextResponse } from "next/server";
import {
  createProxyImportJob,
  getProxyImportJob,
  cancelProxyImportJob,
  listProxyImportJobs,
  PROXY_IMPORT_POLL_MS,
} from "@/lib/db/proxyImportJobs";

export const dynamic = "force-dynamic";

// POST /api/proxy-pools/import-jobs - start a server-side bulk import.
//
// The pasted list is parsed and validated on the client, so by the time it
// arrives here it is trusted data, not raw text. The job runs on the server
// and survives the browser closing; the dashboard polls for progress.
export async function POST(request) {

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const entries = Array.isArray(body?.entries) ? body.entries : [];
  const clean = [];
  const errors = [];

  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i] || {};
    const name = typeof e.name === "string" ? e.name.trim() : "";
    const proxyUrl = typeof e.proxyUrl === "string" ? e.proxyUrl.trim() : "";
    if (!name || !/^https?:\/\//i.test(proxyUrl)) {
      errors.push(`Entry ${i + 1}: missing name or http(s) proxyUrl`);
      continue;
    }
    clean.push({ name, proxyUrl });
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: `Invalid entries:\n${errors.slice(0, 10).join("\n")}` },
      { status: 400 }
    );
  }
  if (clean.length === 0) {
    return NextResponse.json({ error: "Nothing to import" }, { status: 400 });
  }

  try {
    const job = createProxyImportJob(clean);
    return NextResponse.json(
      { jobId: job.jobId, status: job.status, total: job.total, pollMs: PROXY_IMPORT_POLL_MS },
      { status: 202 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not start the import" },
      { status: 400 }
    );
  }
}

// GET /api/proxy-pools/import-jobs - list recent jobs to reattach to, or one
// job when ?id= is given.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    const job = getProxyImportJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { jobs: listProxyImportJobs().slice(0, 10) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// DELETE /api/proxy-pools/import-jobs?id= - ask a running job to stop.
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  if (!cancelProxyImportJob(id)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
