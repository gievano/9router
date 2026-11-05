import { getUsageStats, statsEmitter, getActiveRequests } from "@/lib/usageDb";
import { getSessionContext } from "@/lib/auth/dashboardPermissions";

export const dynamic = "force-dynamic";

// Every open tab runs its own stream, and each emitter tick asked the database to
// re-aggregate the whole period per connection - so three tabs meant three
// identical scans per burst of traffic. A short shared memo keeps the page live
// (updates still land within a second) while a burst costs one aggregation.
const STREAM_STATS_TTL_MS = 750;
const streamStatsCache = (global._streamStatsCache ||= new Map());

async function getStreamStats(period, apiKeyFilter, allowedModels) {
  const key = `${period}|${apiKeyFilter || ""}|${allowedModels}`;
  const hit = streamStatsCache.get(key);
  if (hit && Date.now() - hit.ts < STREAM_STATS_TTL_MS) return hit.value;
  const value = await getUsageStats(period, apiKeyFilter, allowedModels);
  if (streamStatsCache.size > 32) streamStatsCache.clear();
  streamStatsCache.set(key, { value, ts: Date.now() });
  return value;
}

export async function GET(request) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "today";

  const ctx = await getSessionContext();
  const apiKeyFilter = ctx.apiKeyFilter;
  const allowedModels = ctx.allowedModels || "*";

  const state = { closed: false, keepalive: null, send: null, sendPending: null, cachedStats: null };

  const stream = new ReadableStream({
    async start(controller) {
      state.send = async () => {
        if (state.closed) return;
        try {
          if (state.cachedStats) {
            const { activeRequests, recentRequests, errorProvider } = await getActiveRequests(apiKeyFilter, allowedModels);
            const quickStats = { ...state.cachedStats, activeRequests, recentRequests, errorProvider, _type: "pending" };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(quickStats)}\n\n`));
          }
          // allowedModels is not optional here: this stream is the second source the
          // Usage page merges in, and omitting it silently widens the scope to every
          // model, which is what let unrelated providers show up under an API-key login.
          const stats = await getStreamStats(period, apiKeyFilter, allowedModels);
          state.cachedStats = stats;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...stats, _type: "full" })}\n\n`));
        } catch {
          state.closed = true;
          statsEmitter.off("update", state.send);
          statsEmitter.off("pending", state.sendPending);
          clearInterval(state.keepalive);
        }
      };

      state.sendPending = async () => {
        if (state.closed || !state.cachedStats) return;
        try {
          const { activeRequests, recentRequests, errorProvider } = await getActiveRequests(apiKeyFilter, allowedModels);
          const stats = { ...state.cachedStats, activeRequests, recentRequests, errorProvider, _type: "pending" };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
        } catch {
          state.closed = true;
          statsEmitter.off("update", state.send);
          statsEmitter.off("pending", state.sendPending);
          clearInterval(state.keepalive);
        }
      };

      await state.send();

      statsEmitter.on("update", state.send);
      statsEmitter.on("pending", state.sendPending);

      state.keepalive = setInterval(() => {
        if (state.closed) { clearInterval(state.keepalive); return; }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          state.closed = true;
          clearInterval(state.keepalive);
        }
      }, 25000);
    },

    cancel() {
      state.closed = true;
      statsEmitter.off("update", state.send);
      statsEmitter.off("pending", state.sendPending);
      clearInterval(state.keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
