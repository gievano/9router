"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/utils/cn";

/**
 * Security Log — who signed in, what was refused, and anything that reads like
 * a probe. Rows the classifier marked critical (or even a plain refusal) render
 * red so a breach is visible at a glance rather than buried in a list of 200
 * quiet entries.
 */

const LEVEL_STYLE = {
  critical: {
    row: "border-red-500/40 bg-red-500/10",
    text: "text-red-500",
    chip: "bg-red-500 text-white",
  },
  warn: {
    row: "border-red-500/20 bg-red-500/5",
    text: "text-red-400",
    chip: "bg-red-500/80 text-white",
  },
  info: {
    row: "border-border-subtle",
    text: "text-text-muted",
    chip: "bg-surface-2 text-text-muted",
  },
};

const TYPE_ICONS = {
  login_success: "login",
  apikey_login_success: "key",
  login_failed: "error",
  apikey_login_failed: "vpn_key",
  login_locked: "lock",
  login_default_password: "warning",
  guard_denied: "shield",
  request_denied: "block",
  key_created: "key",
  key_deleted: "delete",
  settings_changed: "settings",
};

const TABS = [
  { id: "events", label: "Security events", icon: "shield" },
  { id: "requests", label: "Recent requests", icon: "travel_explore" },
];

function timeLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function Stat({ label, value, tone }) {
  return (
    <div className="flex-1 min-w-[120px] rounded-xl border border-border-subtle bg-surface p-3">
      <div className={cn("text-xl font-semibold leading-none", tone || "text-text-main")}>{value}</div>
      <div className="mt-1.5 text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
    </div>
  );
}

export default function SecurityLogClient() {
  const [tab, setTab] = useState("events");
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [eventsRes, requestsRes] = await Promise.all([
        fetch("/api/security-logs?limit=300", { cache: "no-store" }),
        fetch("/api/security-logs/access?limit=200", { cache: "no-store" }),
      ]);
      if (eventsRes.status === 403 || requestsRes.status === 403) {
        setError("The security log is available to password sign-ins only.");
        setLoading(false);
        return;
      }
      if (!eventsRes.ok) throw new Error(`events ${eventsRes.status}`);
      const data = await eventsRes.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setSummary(data.summary || null);
      if (requestsRes.ok) {
        const reqData = await requestsRes.json();
        setRequests(Array.isArray(reqData.events) ? reqData.events : []);
      }
      setError("");
      setLastUpdate(new Date());
    } catch (e) {
      setError("Could not load the security log. " + (e && e.message ? e.message : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [refresh]);

  const critical = events.filter((e) => e.level === "critical");
  const warnings = events.filter((e) => e.level === "warn");
  const redCount = critical.length + warnings.length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-main">Security Log</h1>
          <p className="text-sm text-text-muted">
            Sign-ins, refusals and admin changes — persistent, so a restart does not erase it.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-sm text-text-muted hover:text-text-main hover:bg-surface-2 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Stat
          label="Needs attention"
          value={redCount}
          tone={redCount > 0 ? "text-red-500" : "text-text-main"}
        />
        <Stat label="Critical" value={critical.length} tone={critical.length ? "text-red-500" : "text-text-main"} />
        <Stat
          label="Sign-ins (failed)"
          value={`${summary?.logins?.success ?? 0} / ${summary?.logins?.failed ?? 0}`}
          tone={(summary?.logins?.failed ?? 0) > 0 ? "text-red-400" : "text-text-main"}
        />
        <Stat label="Sign-in IPs" value={summary?.uniqueLoginIps ?? 0} />
        <Stat label="Events stored" value={summary?.total ?? events.length} />
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border-subtle w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
              tab === t.id
                ? "bg-primary/15 text-primary"
                : "text-text-muted hover:text-text-main",
            )}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {tab === "events" && (
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
          {loading && events.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">Loading…</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">
              Nothing recorded yet. Sign in, fail a sign-in, or hit a protected route — every attempt
              lands here.
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {events.map((event, idx) => {
                const style = LEVEL_STYLE[event.level] || LEVEL_STYLE.info;
                return (
                  <li
                    key={`${event.at}-${idx}`}
                    className={cn("flex items-start gap-3 px-4 py-2.5 border-l-2", style.row)}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-[18px] mt-0.5 shrink-0",
                        style.text,
                      )}
                    >
                      {TYPE_ICONS[event.type] || "info"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm font-medium", event.level === "info" ? "text-text-main" : style.text)}>
                          {event.label || event.type}
                        </span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", style.chip)}>
                          {event.level.toUpperCase()}
                        </span>
                        {event.status ? (
                          <span className="text-[11px] text-text-muted">HTTP {event.status}</span>
                        ) : null}
                      </div>
                      {event.detail && (
                        <div className="text-xs text-text-muted mt-0.5 break-words">{event.detail}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <div className="text-xs text-text-muted font-mono">{timeLabel(event.at)}</div>
                      <div className="text-[11px] text-text-muted font-mono">{event.ip}</div>
                      {event.actor ? (
                        <div className="text-[11px] text-text-muted">{event.actor}</div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">No dashboard requests recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted border-b border-border-subtle">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-2 py-2 font-medium">Method</th>
                  <th className="px-2 py-2 font-medium">Path</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">ms</th>
                  <th className="px-2 py-2 font-medium">As</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {requests.map((req, idx) => (
                  <tr
                    key={`${req.at}-${idx}`}
                    className={cn(req.status >= 400 && "text-red-400")}
                  >
                    <td className="px-4 py-1.5 font-mono text-xs text-text-muted">{timeLabel(req.at)}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{req.method}</td>
                    <td className="px-2 py-1.5 font-mono text-xs truncate max-w-[280px]" title={req.path}>
                      {req.path}
                    </td>
                    <td className={cn("px-2 py-1.5 font-mono text-xs", req.status >= 400 ? "text-red-500" : "")}>
                      {req.status}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs text-text-muted">{req.ms}</td>
                    <td className="px-2 py-1.5 text-xs text-text-muted">{req.role}</td>
                    <td className="px-4 py-1.5 font-mono text-xs text-text-muted">{req.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {lastUpdate && (
        <div className="text-[11px] text-text-muted">
          Last refreshed {lastUpdate.toLocaleTimeString()} · auto every 10s
        </div>
      )}
    </div>
  );
}
