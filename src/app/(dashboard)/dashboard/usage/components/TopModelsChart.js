"use client";

import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import Card from "@/shared/components/Card";
import ModelTierBadge from "@/shared/components/ModelTierBadge";

const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"];

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

export default function TopModelsChart({ byModel }) {
  const [viewMode, setViewMode] = useState("tokens");

  const chartData = useMemo(() => {
    if (!byModel) return [];
    const list = Object.values(byModel)
      .map((data) => {
        const raw = (data.rawModel || data.model || "Unknown").replace(/^\/+/, "");
        return {
          id: raw,
          name: raw,
          tokens: (data.promptTokens || 0) + (data.completionTokens || 0),
          requests: data.requests || 0,
        };
      })
      .filter((d) => d[viewMode] > 0)
      .sort((a, b) => b[viewMode] - a[viewMode])
      .slice(0, 5);

    const maxVal = list.length > 0 ? Math.max(...list.map((d) => d[viewMode])) : 1;
    return list.map((item) => ({
      ...item,
      percentage: Math.max(8, Math.round((item[viewMode] / maxVal) * 100)),
    }));
  }, [byModel, viewMode]);

  const fmt = viewMode === "tokens" ? fmtTokens : String;
  const unit = viewMode === "tokens" ? "tokens" : "req";

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Top Models</span>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-sidebar/60 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("tokens")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "tokens"
                ? "bg-primary text-white shadow-2xs font-semibold"
                : "text-text-muted hover:text-text-main hover:bg-sidebar"
            }`}
          >
            Tokens
          </button>
          <button
            type="button"
            onClick={() => setViewMode("requests")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "requests"
                ? "bg-primary text-white shadow-2xs font-semibold"
                : "text-text-muted hover:text-text-main hover:bg-sidebar"
            }`}
          >
            Requests
          </button>
        </div>
      </div>

      {!chartData.length ? (
        <div className="h-44 flex items-center justify-center text-text-muted text-sm">No model usage yet</div>
      ) : (
        <div className="flex flex-col gap-3 py-1">
          {chartData.map((item, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <div key={item.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-xs text-text-main truncate" title={item.id}>
                      {item.name}
                    </span>
                    <ModelTierBadge model={item.id} />
                  </div>
                  <span className="font-mono text-xs text-text-muted shrink-0 whitespace-nowrap">
                    <strong className="text-text-main font-semibold">{fmt(item[viewMode])}</strong> {unit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-sidebar overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: color,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

TopModelsChart.propTypes = {
  byModel: PropTypes.object,
};
