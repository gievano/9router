"use client";
import { useState, useEffect, useMemo } from "react";
import EmptyWithAction from "./EmptyWithAction.js";

const fmt = (n) => {
  n = Number(n) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
};

const money = (n) => "$" + (Number(n) || 0).toFixed(4);

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(5);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

// Bars, not a chart library: the series is one number per day, and a flex row
// keeps the card readable at any width. Colour carries meaning here - empty days
// sit as a muted track, active days fill emerald in proportion to the peak, and
// the peak day is the only one drawn at full strength - so a month of zeros can
// never look like a month of wins.
function DailyBars({ daily, peak }) {
  const max = Math.max(...daily.map((d) => d.savedTokens), 0);
  const days = daily.length;
  const labelEvery = Math.max(1, Math.ceil(days / 8));
  const peakDate = peak?.savedTokens > 0 ? peak.date : null;
  const peakIndex = peakDate ? daily.findIndex((d) => d.date === peakDate) : -1;
  const labelled = new Set();
  for (let i = 0; i < days; i += labelEvery) labelled.add(i);
  labelled.add(days - 1);
  if (peakIndex >= 0) {
    // The peak keeps its own label; neighbouring ticks step aside so the two
    // never print on top of each other.
    labelled.delete(peakIndex - 1);
    labelled.delete(peakIndex + 1);
    labelled.add(peakIndex);
  }

  if (max === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-muted">
        No tokens saved in this period
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex h-28 flex-col justify-between py-0.5 text-right text-[10px] tabular-nums text-text-muted">
          <span>{fmt(max)}</span>
          <span>{fmt(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <div className="border-t border-border/40" />
            <div className="border-t border-border/30" />
            <div className="border-t border-border/60" />
          </div>
          <div className="relative flex h-28 items-stretch gap-[3px]">
            {daily.map((d, i) => {
              const isPeak = d.date === peakDate;
              const height = max > 0 ? (d.savedTokens / max) * 100 : 0;
              const showLabel = labelled.has(i);
              return (
                <div key={d.date} className="group relative flex min-w-0 flex-1 flex-col justify-end">
                  <div
                    className={
                      d.savedTokens > 0
                        ? `w-full rounded-[3px] ${isPeak ? "bg-emerald-400" : "bg-emerald-500/55"} group-hover:bg-emerald-400`
                        : "w-full rounded-full bg-border"
                    }
                    style={{ height: d.savedTokens > 0 ? `max(3px, ${height}%)` : "2px" }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-[10px] leading-tight text-text-main shadow-lg group-hover:block">
                    <div className="font-medium">{longDate(d.date)}</div>
                    <div className="tabular-nums text-emerald-400">{fmt(d.savedTokens)} tokens</div>
                    <div className="tabular-nums text-text-muted">
                      {money(d.savedCost)} · {d.requests} req
                    </div>
                  </div>
                  <div className="relative mt-1 text-[10px] leading-3 text-text-muted">
                    {showLabel && (
                      // Centred and absolutely positioned: a slot is only ~25px
                      // wide at 30 days, so an inline label would be clipped.
                      <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                        {shortDate(d.date)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TokenSavingsTab({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/usage/token-savings?period=${period}`)
      .then((r) => r.json())
      .then((json) => {
        if (alive) setData(json);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period]);

  const models = data?.models || [];
  const daily = data?.daily || [];

  const rows = useMemo(() => {
    const query = modelFilter.trim().toLowerCase();
    if (!query) return models;
    return models.filter(
      (m) =>
        String(m.modelLabel || m.model || "").toLowerCase().includes(query) ||
        String(m.providerName || m.provider || "").toLowerCase().includes(query),
    );
  }, [models, modelFilter]);

  const stats = useMemo(() => {
    const activeDays = daily.filter((d) => d.savedTokens > 0).length;
    const peakTokens = data?.peak?.savedTokens || 0;
    const total = data?.totals?.savedTokens || 0;
    return {
      activeDays,
      peakTokens,
      peakDate: peakTokens > 0 ? data.peak.date : null,
      average: activeDays > 0 ? total / activeDays : 0,
    };
  }, [daily, data]);

  if (loading) return <div className="text-sm text-text-muted">Loading savings...</div>;
  if (!data || !data.totals) {
    return <div className="text-sm text-text-muted">Couldn&apos;t load savings - refresh the page and try again.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="text-xs text-text-muted">Tokens saved</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-400">{fmt(data.totals.savedTokens)}</div>
          <div className="text-xs text-text-muted">across {fmt(data.totals.requests)} requests</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="text-xs text-text-muted">Est. cost avoided</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-400">{money(data.totals.savedCost)}</div>
          <div className="text-xs text-text-muted">at live model rates</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="text-xs text-text-muted">Coverage</div>
          <div className="mt-1 text-2xl font-semibold text-text-main">{models.length} models</div>
          <div className="text-xs text-text-muted">
            {stats.activeDays} active {stats.activeDays === 1 ? "day" : "days"} of {daily.length}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-text-main">Daily savings</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
            {data.totals.savedTokens === 0 ? null : stats.peakDate ? (
              <span>
                Peak <span className="text-emerald-400">{fmt(stats.peakTokens)}</span> on {shortDate(stats.peakDate)}
              </span>
            ) : null}
            <span>
              Avg <span className="text-text-main">{fmt(stats.average)}</span> / active day
            </span>
          </div>
        </div>
        <DailyBars daily={daily} peak={data.peak} />
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-text-main">
            Per model
            {models.length > 0 ? (
              <span className="ml-2 text-xs font-normal text-text-muted">
                {rows.length} of {models.length}
              </span>
            ) : null}
          </div>
          {models.length > 0 ? (
            <input
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="Filter models..."
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-main placeholder:text-text-muted sm:w-56"
            />
          ) : null}
        </div>
        {rows.length === 0 ? (
          <div className="text-sm text-text-muted">
            {models.length === 0 ? "No savings recorded in this period yet." : "No models match your filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Model</th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted whitespace-nowrap">Requests</th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted whitespace-nowrap">Saved tokens</th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted whitespace-nowrap">Est. saved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const share = data.totals.savedTokens > 0 ? (m.savedTokens / data.totals.savedTokens) * 100 : 0;
                  const modelLabel = m.modelLabel || m.model || "Unknown model";
                  const providerLabel = m.providerName || m.provider || "";
                  return (
                    <tr key={m.key || `${providerLabel}/${modelLabel}`} className="border-b border-border/50 hover:bg-state-hover">
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 flex-col">
                          <span className="max-w-[260px] truncate font-mono text-[13px] text-text-main" title={modelLabel}>
                            {modelLabel}
                          </span>
                          <span className="max-w-[260px] truncate text-[11px] text-text-muted" title={providerLabel}>
                            {providerLabel}
                            {m.model ? "" : " · all models"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-main">{fmt(m.requests)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                            <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${Math.max(2, share)}%` }} />
                          </div>
                          <span className="tabular-nums text-emerald-400">{fmt(m.savedTokens)}</span>
                        </div>
                        <div className="text-[10px] tabular-nums text-text-muted">{share.toFixed(1)}% of saved</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{money(m.savedCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2 text-xs text-text-muted">
          Cost is an estimate at live per-model rates; free-tier models record $0.
        </div>
      </div>
    </div>
  );
}
