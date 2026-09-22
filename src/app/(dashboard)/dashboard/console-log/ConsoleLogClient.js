"use client";

import { useState, useEffect, useRef } from "react";
import { Card, Button } from "@/shared/components";
import { CONSOLE_LOG_CONFIG } from "@/shared/constants/config";

const LOG_LEVEL_COLORS = {
  LOG: "text-green-400",
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  DEBUG: "text-purple-400",
};

function colorLine(line, index) {
  // Detect log level from tags like [LOG], [INFO], [WARN], [ERROR], [DEBUG]
  let levelColor = "text-gray-300";
  if (line.includes("[ERROR]") || line.includes("✗")) levelColor = "text-red-400";
  else if (line.includes("[WARN]")) levelColor = "text-yellow-400";
  else if (line.includes("[INFO]") || line.includes("▶")) levelColor = "text-blue-400";
  else if (line.includes("[DEBUG]")) levelColor = "text-purple-400";
  else if (line.includes("✓") || line.includes("done")) levelColor = "text-green-400";

  return (
    <div className="flex gap-2 hover:bg-white/5 px-1 rounded">
      <span className="text-gray-600 select-none shrink-0 w-8 text-right">{index + 1}</span>
      <span className={levelColor}>{line}</span>
    </div>
  );
}

// Some reverse proxies / tunnels (e.g. Cloudflare Quick Tunnel) buffer a
// long-lived chunked SSE response and never flush it, so EventSource "opens"
// (HTTP 200) but no frame is ever delivered. Fall back to polling the plain
// JSON endpoint, which streams fine through any proxy.
const SSE_STALL_TIMEOUT_MS = 4000;
const POLL_INTERVAL_MS = CONSOLE_LOG_CONFIG.pollIntervalMs || 2000;

export default function ConsoleLogClient() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const logRef = useRef(null);

  const handleClear = async () => {
    try {
      await fetch("/api/translator/console-logs", { method: "DELETE" });
      // UI cleared via SSE "clear" event / next poll
    } catch (err) {
      console.error("Failed to clear console logs:", err);
    }
  };

  useEffect(() => {
    let closed = false;
    let es = null;
    let stallTimer = null;
    let pollTimer = null;
    let pollSeen = "";

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const pollOnce = async () => {
      try {
        const r = await fetch("/api/translator/console-logs", { cache: "no-store" });
        if (!r.ok) {
          if (!closed) setConnected(false);
          return;
        }
        const d = await r.json();
        if (closed || !d.success) return;
        setConnected(true);
        if (Array.isArray(d.logs)) {
          // Compare a signature, not just length: the buffer is a fixed-size
          // ring, so once full the length stops changing while content rotates.
          const sig = d.logs.length + "|" + (d.logs[d.logs.length - 1] || "");
          if (sig !== pollSeen) {
            pollSeen = sig;
            setLogs(d.logs.slice(-CONSOLE_LOG_CONFIG.maxLines));
          }
        }
      } catch {
        if (!closed) setConnected(false);
      }
    };

    const startPolling = () => {
      if (closed || pollTimer) return;
      if (es) {
        es.close();
        es = null;
      }
      pollOnce();
      pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
    };

    // Safety net: if SSE never delivers a frame, switch to polling.
    stallTimer = setTimeout(() => startPolling(), SSE_STALL_TIMEOUT_MS);

    try {
      es = new EventSource("/api/translator/console-logs/stream");

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        // A frame arrived — SSE is actually streaming, cancel the fallback.
        if (stallTimer) {
          clearTimeout(stallTimer);
          stallTimer = null;
        }
        stopPolling();
        const msg = JSON.parse(e.data);
        if (msg.type === "init") {
          setLogs(msg.logs.slice(-CONSOLE_LOG_CONFIG.maxLines));
        } else if (msg.type === "line") {
          setLogs((prev) => {
            const next = [...prev, msg.line];
            return next.length > CONSOLE_LOG_CONFIG.maxLines ? next.slice(-CONSOLE_LOG_CONFIG.maxLines) : next;
          });
        } else if (msg.type === "lines") {
          setLogs((prev) => {
            const next = [...prev, ...msg.lines];
            return next.length > CONSOLE_LOG_CONFIG.maxLines ? next.slice(-CONSOLE_LOG_CONFIG.maxLines) : next;
          });
        } else if (msg.type === "clear") {
          setLogs([]);
        }
      };

      es.onerror = () => {
        // On error, prefer polling over a dead/half-open stream.
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      closed = true;
      if (stallTimer) clearTimeout(stallTimer);
      stopPolling();
      if (es) es.close();
    };
  }, []);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="">
      <Card>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-text-muted">receipt_long</span>
            <span className="text-sm font-medium text-text-main">Console Logs</span>
            <span className="text-xs text-text-muted">({logs.length} lines)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded ${connected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
              {connected ? "Connected" : "Disconnected"}
            </span>
            <Button size="sm" variant="outline" icon="delete" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
        <div
          ref={logRef}
          className="bg-black rounded-b-lg p-4 text-xs font-mono h-[calc(100vh-220px)] overflow-y-auto"
        >
          {logs.length === 0 ? (
            <span className="text-text-muted">No console logs yet.</span>
          ) : (
            <div className="space-y-0.5">
              {logs.map((line, i) => (
                <div key={i}>{colorLine(line, i)}</div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
