import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

// Benchmark history: latency and token throughput per model over time.
//
// Ranking is computed from this table, not recomputed per request: a benchmark
// that measured one prompt would rank by noise. Keeping the raw runs makes the
// ranking explainable ("fastest on median over the last 20 runs") and lets a
// later run dilute a single unlucky slow one.
const DEFAULT_LIMIT = 50;

let tableReady = false;

function ensureTable(db) {
  if (tableReady) return;
  db.run(`CREATE TABLE IF NOT EXISTS modelBenchmarks (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    provider TEXT,
    ok INTEGER NOT NULL,
    latencyMs INTEGER,
    ttftMs INTEGER,
    outputTokens INTEGER,
    error TEXT,
    at TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bench_model ON modelBenchmarks(model, at DESC)`);
  tableReady = true;
}

export async function recordBenchmark(run = {}) {
  const model = String(run.model || "").trim();
  if (!model) return null;
  const db = await getAdapter();
  ensureTable(db);
  const id = `bm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  db.run(
    `INSERT INTO modelBenchmarks(id, model, provider, ok, latencyMs, ttftMs, outputTokens, error, at)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      model,
      run.provider ? String(run.provider) : null,
      run.ok ? 1 : 0,
      Number.isFinite(run.latencyMs) ? Math.round(run.latencyMs) : null,
      Number.isFinite(run.ttftMs) ? Math.round(run.ttftMs) : null,
      Number.isFinite(run.outputTokens) ? Math.round(run.outputTokens) : null,
      run.error ? String(run.error).slice(0, 300) : null,
      new Date().toISOString(),
    ]
  );
  // Keep the table bounded: only the most recent runs per model matter.
  db.run(
    `DELETE FROM modelBenchmarks WHERE id NOT IN (
       SELECT id FROM modelBenchmarks ORDER BY at DESC LIMIT 1000
     )`
  );
  return id;
}

function median(values) {
  const sorted = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Ranking over the most recent runs of each model. */
export async function getBenchmarkRanking({ perModel = 10 } = {}) {
  const db = await getAdapter();
  ensureTable(db);
  const take = Math.min(Math.max(Number(perModel) || 10, 1), 50);
  const rows = db.all(
    `SELECT model, ok, latencyMs, ttftMs, outputTokens, at FROM modelBenchmarks
     ORDER BY model ASC, at DESC`
  );
  const byModel = new Map();
  for (const row of rows) {
    const list = byModel.get(row.model) || [];
    if (list.length < take) list.push(row);
    byModel.set(row.model, list);
  }

  const results = [];
  for (const [model, list] of byModel) {
    const okRuns = list.filter((r) => r.ok);
    const latencies = okRuns.map((r) => r.latencyMs);
    const ttfts = okRuns.map((r) => r.ttftMs);
    const outputs = okRuns.map((r) => r.outputTokens).filter((n) => Number.isFinite(n));
    results.push({
      model,
      provider: list.find((r) => r.provider)?.provider || null,
      runs: list.length,
      ok: okRuns.length,
      failed: list.length - okRuns.length,
      // median, not mean: one timeout should not move the ranking
      medianLatencyMs: median(latencies),
      medianTtftMs: median(ttfts),
      // tokens per second needs both duration and count; skip when unknown
      tokensPerSec: outputs.length
        ? Math.round(
            outputs.reduce((a, b) => a + b, 0) /
              Math.max(1, latencies.filter(Number.isFinite).reduce((a, b) => a + b, 0)) * 1000
          )
        : null,
      lastRunAt: list[0]?.at || null,
      lastError: list.find((r) => !r.ok)?.error || null,
    });
  }

  // Rank only models that answered at least once, fastest median first.
  results.sort((a, b) => {
    if (a.ok === 0) return 1;
    if (b.ok === 0) return -1;
    return (a.medianLatencyMs ?? Infinity) - (b.medianLatencyMs ?? Infinity);
  });
  return results.map((r, i) => ({ rank: r.ok ? i + 1 : null, ...r }));
}

export async function getRecentBenchmarks({ limit = DEFAULT_LIMIT } = {}) {
  const db = await getAdapter();
  ensureTable(db);
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 200);
  const rows = db.all(
    `SELECT id, model, provider, ok, latencyMs, ttftMs, outputTokens, error, at
     FROM modelBenchmarks ORDER BY at DESC LIMIT ?`,
    [safeLimit]
  );
  return rows.map((r) => ({
    id: r.id,
    model: r.model,
    provider: r.provider,
    ok: Boolean(r.ok),
    latencyMs: r.latencyMs,
    ttftMs: r.ttftMs,
    outputTokens: r.outputTokens,
    error: r.error,
    at: r.at,
  }));
}