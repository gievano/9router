"use client";

import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Card from "@/shared/components/Card";

const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#10b981", "#f97316"];

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

// Prices come from the pricing table, so a model without one contributes 0.
const fmtCost = (n) => {
  if (!n) return "$0";
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
};

// Recharts wraps a long category tick onto as many lines as it needs and the
// lines then overlap the neighbouring row. One line, cut to fit the gutter.
function AxisTick({ x, y, payload }) {
  const text = String(payload.value);
  const shown = text.length > 20 ? `${text.slice(0, 19)}…` : text;
  return (
    <text x={x} y={y} dy={3} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.8}>
      {shown}
    </text>
  );
}

// "OpenAI Compatible (330688af)" is two compatible endpoints away from a
// useful axis tick. The hash stays in the tooltip and the table; the axis reads
// the base name.
function shortLabel(name) {
  return String(name).replace(/\s*\([0-9a-f]{6,8}\)\s*$/i, "");
}

export default function ProviderBarChart({ byProvider, labels }) {
  const [viewMode, setViewMode] = useState("tokens");

  const chartData = useMemo(() => {
    if (!byProvider) return [];
    return Object.entries(byProvider)
      .map(([id, data]) => ({
        // The key stays the raw provider id; only the printed name is resolved.
        // The axis gets the short form (Recharts wraps long ticks onto three
        // lines and they collide with neighbouring rows); the tooltip keeps the
        // full label so two accounts of one provider stay distinguishable.
        name: labels?.[id] || id,
        axisName: shortLabel(labels?.[id] || id),
        tokens: (data.promptTokens || 0) + (data.completionTokens || 0),
        requests: data.requests || 0,
        cost: data.cost || 0,
      }))
      .filter((d) => d[viewMode] > 0)
      .sort((a, b) => b[viewMode] - a[viewMode]);
  }, [byProvider, labels, viewMode]);

  const fmt = viewMode === "tokens" ? fmtTokens : viewMode === "cost" ? fmtCost : String;
  const label = viewMode === "tokens" ? "Tokens" : viewMode === "cost" ? "Estimated cost" : "Requests";

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">By Provider</span>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-sidebar/60 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("tokens")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewMode === "tokens" ? "bg-primary text-white shadow-2xs font-semibold" : "text-text-muted hover:text-text-main hover:bg-sidebar"}`}
          >
            Tokens
          </button>
          <button
            type="button"
            onClick={() => setViewMode("requests")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewMode === "requests" ? "bg-primary text-white shadow-2xs font-semibold" : "text-text-muted hover:text-text-main hover:bg-sidebar"}`}
          >
            Requests
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cost")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewMode === "cost" ? "bg-primary text-white shadow-2xs font-semibold" : "text-text-muted hover:text-text-main hover:bg-sidebar"}`}
          >
            Cost
          </button>
        </div>
      </div>

      {!chartData.length ? (
        <div className="h-44 flex items-center justify-center text-text-muted text-sm">No provider usage yet</div>
      ) : (
        // Horizontal bars: provider labels are long enough that a vertical chart
        // either truncates them or overlaps them.
        <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 34)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.6 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmt}
            />
            <YAxis
              type="category"
              dataKey="axisName"
              tick={AxisTick}
              tickLine={false}
              axisLine={false}
              interval={0}
              width={132}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface, #1e1e24)",
                border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--color-text-main, #fff)",
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
              formatter={(value) => [fmt(value), label]}
            />
            <Bar dataKey={viewMode} radius={[0, 4, 4, 0]} maxBarSize={26}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

ProviderBarChart.propTypes = {
  byProvider: PropTypes.object,
  labels: PropTypes.object,
};
