import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { recordBenchmark, getBenchmarkRanking, getRecentBenchmarks } from "@/lib/db/repos/benchmarkRepo.js";
import { pingModelByKind } from "@/app/api/models/test/ping";

export const dynamic = "force-dynamic";

const MAX_MODELS = 10;
const MODEL_TIMEOUT_MS = 30000;

/**
 * GET /api/models/benchmark - ranking + recent runs.
 * POST /api/models/benchmark - { models: [...] } runs a speed test per model.
 *
 * A benchmark spends the operator's own provider quota (one real completion
 * per model), so listing is admin-only like the test endpoint it reuses. Each
 * model gets a deadline rather than the whole request sharing one: a provider
 * that hangs must not take the models after it down.
 */
async function requireAdmin() {
  const cookieStore = await cookies();
  const session = await getDashboardAuthSession(cookieStore.get("auth_token")?.value);
  return session && session.role !== "apikey";
}

export async function GET(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const perModel = searchParams.get("perModel");
    const [ranking, recent] = await Promise.all([
      getBenchmarkRanking({ perModel: perModel ? Number(perModel) : undefined }),
      getRecentBenchmarks({ limit: 50 }),
    ]);
    return NextResponse.json({ ranking, recent }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.log("Error loading benchmark:", error);
    return NextResponse.json({ error: "Failed to load benchmark" }, { status: 500 });
  }
}

export async function POST(request) {
  let models = [];
  try {
    const body = await request.json();
    models = Array.isArray(body.models) ? body.models.map(String).filter(Boolean) : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Only a password sign-in can run a benchmark" }, { status: 403 });
  }
  if (!models.length) {
    return NextResponse.json({ error: "No models given" }, { status: 400 });
  }
  models = Array.from(new Set(models)).slice(0, MAX_MODELS);

  const results = [];
  for (const model of models) {
    const started = Date.now();
    let outcome;
    try {
      outcome = await withTimeout(pingModelByKind(model, "llm"), MODEL_TIMEOUT_MS);
    } catch (err) {
      outcome = { ok: false, error: err?.message || "benchmark timed out" };
    }
    // pingModelByKind reports its own latency against the live endpoint; the
    // outer timer only exists to bound the call when it hangs.
    const latencyMs = Number(outcome.latencyMs) || (Date.now() - started);
    const provider = model.includes("/") ? model.split("/")[0] : null;
    const id = await recordBenchmark({
      model,
      provider,
      ok: outcome.ok === true,
      latencyMs,
      ttftMs: Number(outcome.ttftMs) || null,
      outputTokens: Number(outcome.outputTokens ?? outcome.tokens?.completion_tokens) || null,
      error: outcome.ok ? null : outcome.error || "failed",
    });
    results.push({ id, model, ok: outcome.ok === true, latencyMs, error: outcome.ok ? null : outcome.error || "failed" });
  }

  const ranking = await getBenchmarkRanking();
  return NextResponse.json({ results, ranking });
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}