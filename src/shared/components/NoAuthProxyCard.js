"use client";

import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Card from "./Card";
import Select from "./Select";
import Badge from "./Badge";

const NONE_PROXY_POOL_VALUE = "__none__";
const STRATEGIES = [
  { value: "none", label: "None (single pool)" },
  { value: "round-robin", label: "Round-robin" },
  { value: "random", label: "Random" },
];

export default function NoAuthProxyCard({ providerId }) {
  const [proxyPools, setProxyPools] = useState([]);
  const [proxyPoolId, setProxyPoolId] = useState(NONE_PROXY_POOL_VALUE);
  const [rotateStrategy, setRotateStrategy] = useState("none");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [opencodeInstalled, setOpencodeInstalled] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/proxy-pools?isActive=true", { cache: "no-store" }).then((r) => r.ok ? r.json() : { proxyPools: [] }),
      fetch("/api/settings", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}),
      fetch("/api/providers", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}),
    ]).then(([poolData, settingsData, providersData]) => {
      if (cancelled) return;
      setProxyPools(poolData.proxyPools || []);
      const override = (settingsData.providerStrategies || {})[providerId] || {};
      setProxyPoolId(override.proxyPoolId || NONE_PROXY_POOL_VALUE);
      setRotateStrategy(override.rotateStrategy || "none");
      if (providersData?.opencodeInstalled !== undefined) {
        setOpencodeInstalled(Boolean(providersData.opencodeInstalled));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [providerId]);

  const save = useCallback(async (poolId, strategy) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = res.ok ? await res.json() : {};
      const current = data.providerStrategies || {};
      const override = { ...(current[providerId] || {}) };
      if (poolId === NONE_PROXY_POOL_VALUE) delete override.proxyPoolId;
      else override.proxyPoolId = poolId;
      if (strategy === "none") delete override.rotateStrategy;
      else override.rotateStrategy = strategy;
      const updated = { ...current };
      if (Object.keys(override).length === 0) delete updated[providerId];
      else updated[providerId] = override;
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerStrategies: updated }),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      console.log("Save proxy config error:", e);
    } finally {
      setSaving(false);
    }
  }, [providerId]);

  const handlePoolChange = (newPoolId) => {
    setProxyPoolId(newPoolId);
    save(newPoolId, rotateStrategy);
  };

  const handleStrategyChange = (newStrategy) => {
    setRotateStrategy(newStrategy);
    save(proxyPoolId, newStrategy);
  };

  const canRotate = proxyPools.length >= 2;
  const isRotation = rotateStrategy !== "none";

  const isOpencodeV2 = providerId === "opencode-v2";
  const proxyPoolOptions = [
    ...(isOpencodeV2 ? [{ value: "builtin", label: "Built-in Proxy (Residential Channel by t.me/abcseren)" }] : []),
    { value: NONE_PROXY_POOL_VALUE, label: "None (direct / unproxied)" },
    ...proxyPools.map((pool) => ({ value: pool.id, label: pool.name })),
  ];

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 text-green-500">
          <span className="material-symbols-outlined text-[20px]">lock_open</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">No authentication required</p>
          <p className="text-xs text-text-muted">
            {isOpencodeV2
              ? "Use built-in residential proxy, connect direct, or route through your custom proxy pools."
              : "Ready to use as-is, or route it through a proxy pool to bypass IP-based limits."}
          </p>
        </div>
        {savedFlash && <Badge variant="success" size="sm">Saved</Badge>}
      </div>

      <div className="space-y-4">
        <Select
          label="Proxy Source"
          value={proxyPoolId}
          onChange={(e) => handlePoolChange(e.target.value)}
          disabled={saving || isRotation}
          options={proxyPoolOptions}
          hint={
            isRotation
              ? "Rotation is on, so it uses every active proxy pool. The pool selector is ignored."
              : isOpencodeV2 && (proxyPoolId === "builtin" || proxyPoolId === NONE_PROXY_POOL_VALUE)
              ? "Built-in Proxy provides automated residential rotation to bypass upstream 403 FreeTierError."
              : undefined
          }
        />

        {proxyPools.length > 0 && (
          <Select
            label="Rotation Strategy"
            value={rotateStrategy}
            onChange={(e) => handleStrategyChange(e.target.value)}
            disabled={saving || !canRotate}
            options={STRATEGIES}
            hint={
              canRotate
                ? "Rotate across all active proxy pools on every request"
                : "Add at least 2 active proxy pools to enable rotation"
            }
          />
        )}
      </div>

      {isOpencodeV2 && proxyPoolId === "builtin" && (
        <div className="mt-4 pt-3.5 border-t border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-text-muted font-medium">Active Built-in Channel:</span>
            <a
              href="https://t.me/abcseren"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-mono font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              t.me/abcseren
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            </a>
          </div>
          <span className="text-[11px] text-text-muted/70 font-mono">residential-broadband</span>
        </div>
      )}
    </Card>
  );
}

NoAuthProxyCard.propTypes = {
  providerId: PropTypes.string.isRequired,
};
