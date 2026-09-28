import { getRequestDetails, statsEmitter } from "@/lib/usageDb";
import { getSessionContext } from "@/lib/auth/dashboardPermissions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_ROWS = 50;
const KEEPALIVE_MS = 25000;

// Live inspector rows are metadata only. The stored details also hold the full
// request/response payloads, so those keys are dropped before anything leaves
// the server, same reasoning as the redaction in request-details/route.js.
function toInspectorRow(detail) {
  return {
    id: detail.id,
    timestamp: detail.timestamp,
    provider: detail.provider,
    model: detail.model,
    resolvedModel: detail.resolvedModel,
    connectionId: detail.connectionId,
    status: detail.status,
    latency: detail.latency || {},
    tokens: detail.tokens || {},
    pxpipe: detail.pxpipe,
  };
}

async function loadRecentRows() {
  const result = await getRequestDetails({ page: 1, pageSize: MAX_ROWS });
  return (result.details || []).map(toInspectorRow);
}

/**
 * GET /api/usage/live-requests
 * Server-sent events stream of the newest request metadata. The first event is a
 * snapshot, every later event is the refreshed list (the observer is a rolling
 * window, not a delta, so reconnects and dropped events self-heal).
 */
export async function GET(request) {
  const { session } = await getSessionContext();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const state = { closed: false, keepalive: null, push: null };

  const stream = new ReadableStream({
    async start(controller) {
      const detach = () => {
        statsEmitter.off("update", state.push);
        clearInterval(state.keepalive);
      };

      state.push = async () => {
        if (state.closed) return;
        try {
          const rows = await loadRecentRows();
          if (state.closed) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ _type: "snapshot", rows })}\n\n`));
        } catch {
          state.closed = true;
          detach();
        }
      };

      await state.push();

      statsEmitter.on("update", state.push);

      state.keepalive = setInterval(() => {
        if (state.closed) { clearInterval(state.keepalive); return; }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          state.closed = true;
          detach();
        }
      }, KEEPALIVE_MS);
    },

    cancel() {
      state.closed = true;
      statsEmitter.off("update", state.push);
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
