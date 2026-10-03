import { NextResponse } from "next/server";
import { FILTERS, FALLBACK_SUGGESTIONS } from "./filters.js";
import REGISTRY from "open-sse/providers/registry/index.js";
import { getSyncedFreeCatalog, syncOneFreeCatalog, startFreeCatalogSync } from "@/shared/services/freeCatalogSync.js";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 15000;
const UPSTREAM_UNAVAILABLE_MESSAGE = "Live model list is unavailable, showing built-in models instead.";
const STALE_MESSAGE = "Live model list is unavailable, showing the last synced models instead.";

/** The registry entry whose modelsFetcher matches this url+type, if any. */
function findSyncableEntry(url, type) {
  for (const entry of REGISTRY || []) {
    const f = entry?.modelsFetcher;
    if (f && f.url === url && f.type === type && entry.noAuth && !entry.hidden) return entry;
  }
  return null;
}

let syncStarted = false;

export async function GET(request) {
  // First request arms the background syncer; afterwards this is a no-op.
  // The route is the earliest reliable hook on installs that never render the
  // provider page at boot.
  if (!syncStarted) {
    syncStarted = true;
    try {
      startFreeCatalogSync();
    } catch {
      /* a broken timer must not fail the request */
    }
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const type = searchParams.get("type");

  if (!url || !type) {
    return NextResponse.json({ error: "Missing url or type" }, { status: 400 });
  }

  const filter = FILTERS[type];
  if (!filter) {
    return NextResponse.json({ error: "Unknown filter type" }, { status: 400 });
  }

  const fallback = FALLBACK_SUGGESTIONS[type] ?? [];
  const entry = findSyncableEntry(url, type);

  // Durability first: a stored copy beats an empty list on a slow or blocked
  // network, and it is what keeps the suggested row from blinking out.
  const synced = entry ? await getSyncedFreeCatalog(entry.id).catch(() => null) : null;

  // opencode.ai only lists public models to requests carrying its desktop
  // client header; without it the catalogue can 403 or hang the fetch.
  const headers =
    type === "opencode-free" ? { "x-opencode-client": "desktop" } : undefined;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      ...(headers ? { headers } : {}),
    });
    if (!res.ok) {
      return synced
        ? NextResponse.json({ data: synced.data, stale: true, error: STALE_MESSAGE, syncedAt: synced.syncedAt })
        : NextResponse.json({ data: fallback, error: UPSTREAM_UNAVAILABLE_MESSAGE });
    }
    const json = await res.json();
    const raw = json.data ?? json.models ?? json;
    const data = filter(Array.isArray(raw) ? raw : []);
    if (data.length === 0) {
      return synced
        ? NextResponse.json({ data: synced.data, stale: true, error: STALE_MESSAGE, syncedAt: synced.syncedAt })
        : NextResponse.json({ data: fallback, error: UPSTREAM_UNAVAILABLE_MESSAGE });
    }
    // Refresh the stored copy opportunistically; failure only costs freshness.
    if (entry) syncOneFreeCatalog(entry).catch(() => {});
    return NextResponse.json({ data });
  } catch {
    return synced
      ? NextResponse.json({ data: synced.data, stale: true, error: STALE_MESSAGE, syncedAt: synced.syncedAt })
      : NextResponse.json({ data: fallback, error: UPSTREAM_UNAVAILABLE_MESSAGE });
  }
}
