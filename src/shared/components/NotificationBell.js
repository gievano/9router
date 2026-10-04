"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@/store/sessionStore";

const POLL_MS = 60000;

const SEVERITY_STYLE = {
  error: { dot: "bg-red-500", text: "text-red-500", icon: "error" },
  warning: { dot: "bg-amber-500", text: "text-amber-500", icon: "warning" },
  info: { dot: "bg-primary", text: "text-primary", icon: "info" },
};

/**
 * Notification bell: quota pressure, updates and anything the scan route
 * derives. A key-signed session gets nothing — these messages describe this
 * install, not the caller's own key.
 */
export default function NotificationBell() {
  const role = useSessionStore((state) => state.role);
  const isAdmin = role !== "apikey";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnread(Number(data.unread) || 0);
    } catch {
      // A failed poll must not disturb the header.
    }
  }, [isAdmin]);

  // Conditions are derived server-side (deduped); polling keeps the badge fresh
  // without a socket, and the scan is cheap because nothing new is written twice.
  useEffect(() => {
    if (!isAdmin) return undefined;
    load();
    fetch("/api/notifications/scan", { cache: "no-store" }).catch(() => {});
    const timer = setInterval(() => {
      load();
      fetch("/api/notifications/scan", { cache: "no-store" }).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isAdmin, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", id: "all" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Number.isFinite(data.unread)) setUnread(data.unread);
      }
    } catch {
      load();
    }
  };

  if (!isAdmin) return null;

  const visible = items.filter((n) => !n.cleared);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center size-8 rounded-[10px] text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
        title="Notifications"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unread > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold leading-[15px] text-white ${
              items.some((n) => !n.read && n.severity === "error") ? "bg-red-500" : "bg-primary"
            }`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-border-subtle bg-surface shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(380px,60vh)] overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-text-muted">
                Nothing to report.
              </p>
            ) : (
              visible.map((n) => {
                const style = SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.info;
                const body = (
                  <>
                    <span className={`flex items-start gap-2 px-3.5 py-2.5 transition-colors hover:bg-surface-2 ${n.read ? "opacity-65" : ""}`}>
                      <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${style.text}`}>
                        {style.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-text-main">{n.title}</span>
                        {n.body && (
                          <span className="block text-[11px] text-text-muted mt-0.5 break-words">
                            {n.body}
                          </span>
                        )}
                        <span className="block text-[10px] text-text-muted/70 mt-1">
                          {new Date(n.at).toLocaleString()}
                        </span>
                      </span>
                      {!n.read && <span className={`size-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />}
                    </span>
                  </>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className="block border-b border-border-subtle/60 last:border-0"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={n.id} className="border-b border-border-subtle/60 last:border-0">
                    {body}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}