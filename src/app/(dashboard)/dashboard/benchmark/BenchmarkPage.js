"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, ModelSelectModal } from "@/shared/components";
import { cn } from "@/shared/utils/cn";

const MAX_MODELS = 10;

/**
 * Model Benchmark - speed ranking built from stored runs.
 *
 * Ranking is by median latency over the last runs per model, not the newest
 * single run: one timeout or a warm cache would otherwise decide the order.
 * Only models that answered at least once get a rank; failures stay in the table
 * so a model that is down is visible rather than quietly missing.
 */
export default function BenchmarkPage() {
  const [ranking, setRanking] = useState([]);
  const [recent, setRecent] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [pickerFor, setPickerFor] = useState(null);
  const [activeProviders, setActiveProviders] = useState([]);
  const [modelAliases, setModelAliases] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/models/benchmark", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRanking(Array.isArray(data.ranking) ? data.ranking : []);
      setRecent(Array.isArray(data.recent) ? data.recent : []);
    } catch {
      // leave the previous view in place
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const [p, a] = await Promise.all([
          fetch("/api/providers", { cache: "no-store" }),
          fetch("/api/models/alias", { cache: "no-store" }),
        ]);
        if (p.ok) setActiveProviders((await p.json()).connections || []);
        if (a.ok) setModelAliases((await a.json())?.aliases || {});
      } catch {
        // the picker degrades to manual entry
      }
    })();
  }, [load]);

  const addModel = (value) => {
    const v = String(value || "").trim();
    if (!v || models.includes(v) || models.length >= MAX_MODELS) return;
    setModels((prev) => [...prev, v]);
    setPickerFor(null);
  };

  const run = async () => {
    if (!models.length || running) return;
    setRunning(true);
    setError("");
    setProgress(`Starting ${models.length} model${models.length === 1 ? "" : "s"}…`);
    try {
      const res = await fetch("/api/models/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Benchmark failed");
      const ok = (data.results || []).filter((r) => r.ok).length;
      const failed = (data.results || []).length - ok;
      setProgress(
        failed
          ? `Done: ${ok} responded, ${failed} failed. Failures stay in the table below.`
          : "Done."
      );
      if (data.ranking) setRanking(data.ranking);
      load();
    } catch (err) {
      setError(err.message || "Benchmark failed");
    } finally {
      setRunning(false);
    }
  };

  const slowest = ranking.filter((r) => r.ok).reduce((max, r) => Math.max(max, r.medianLatencyMs || 0), 0) || 1;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card padding="md">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-main">Benchmark models</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Sends one real request per model and records latency. Uses your provider quota.
            </p>
          </div>
          <Button
            onClick={run}
            disabled={!models.length || running}
            loading={running}
            icon="speed"
          >
            Run benchmark
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {models.map((model, index) => (
            <div key={model} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-text-muted w-4 shrink-0 text-center">
                {index + 1}
              </span>
              <code className="flex-1 min-w-0 truncate rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-text-main">
                {model}
              </code>
              <button
                type="button"
                onClick={() => setModels((prev) => prev.filter((m) => m !== model))}
                className="p-1.5 rounded text-text-muted hover:text-red-500 transition-colors shrink-0"
                aria-label={`Remove ${model}`}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button
            variant="secondary"
            icon="add"
            onClick={() => setPickerFor(0)}
            disabled={models.length >= MAX_MODELS}
          >
            Pick model
          </Button>
          <Input
            value=""
            placeholder="…or type a model id and press Enter"
            onChange={(e) => {
              if (e.target.value.includes("/") || e.target.value.trim().length > 6) {
                // free-text entry: only committed on Enter below
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addModel(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
            className="flex-1 min-w-[180px]"
          />
        </div>

        <p className="text-[11px] text-text-muted mt-2">
          Up to {MAX_MODELS} models per run. Ranking uses the median of the last 10 runs each.
        </p>

        {(progress || error) && (
          <p className={cn("text-xs mt-3", error ? "text-red-500" : "text-text-muted")} role="status">
            {error || progress}
          </p>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-sm font-semibold text-text-main mb-3">Speed ranking</h2>
        {loading ? (
          <p className="text-xs text-text-muted">Loading…</p>
        ) : ranking.length === 0 ? (
          <p className="text-xs text-text-muted">
            No runs yet. Pick models above and press Run benchmark.
          </p>
        ) : (
          <div className="flex flex-col">
            {ranking.map((row) => (
              <div
                key={row.model}
                className="flex items-center gap-3 py-2.5 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
              >
                <span className="w-6 shrink-0 text-center text-xs font-bold text-text-muted">
                  {row.rank || "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs text-text-main truncate">{row.model}</code>
                    {row.ok === 0 && (
                      <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                        failed
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 w-full max-w-[280px] rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        row.ok === 0 ? "bg-red-500/40" : "bg-primary"
                      )}
                      style={{
                        width: `${Math.max(
                          4,
                          Math.round(
                            ((row.medianLatencyMs || 0) / slowest) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  {row.lastError && (
                    <p className="text-[10px] text-red-500/80 mt-1 truncate">{row.lastError}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs text-text-main">
                    {row.ok ? `${(row.medianLatencyMs || 0).toLocaleString()}ms` : "—"}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    median of {row.ok}/{row.runs}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {recent.length > 0 && (
        <Card padding="md">
          <h2 className="text-sm font-semibold text-text-main mb-3">Recent runs</h2>
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border">
                  <th className="py-1.5 text-left font-semibold text-text-muted">Model</th>
                  <th className="py-1.5 text-right font-semibold text-text-muted">Latency</th>
                  <th className="py-1.5 text-right font-semibold text-text-muted">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recent.map((run) => (
                  <tr key={run.id} className="hover:bg-surface-2 transition-colors">
                    <td className="py-1.5 font-mono truncate max-w-[180px]">{run.model}</td>
                    <td className="py-1.5 text-right font-mono">
                      <span className={cn(run.ok ? "text-text-main" : "text-red-500")}>
                        {run.ok ? `${(run.latencyMs || 0).toLocaleString()}ms` : "failed"}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-text-muted whitespace-nowrap">
                      {new Date(run.at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pickerFor !== null && (
        <ModelSelectModal
          isOpen
          onClose={() => setPickerFor(null)}
          onSelect={(modelObj) => addModel(modelObj?.value || "")}
          activeProviders={activeProviders}
          modelAliases={modelAliases}
          title="Pick a model to benchmark"
        />
      )}
    </div>
  );
}