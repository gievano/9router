import { NextResponse } from "next/server";
import {
  getSemanticCacheStats,
  resetSemanticCacheStats,
} from "open-sse/rtk/semanticCache.js";

export const dynamic = "force-dynamic";

/**
 * Hit/miss counters for the response cache.
 *
 * The cache toggle is otherwise unfalsifiable from the UI: there is no way to
 * tell a cache that never hits from one that is saving every repeat prompt.
 */
export async function GET() {
  try {
    return NextResponse.json(getSemanticCacheStats());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    resetSemanticCacheStats();
    return NextResponse.json(getSemanticCacheStats());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
