/**
 * Unit tests for the live free-model catalogue merge.
 *
 * Free tiers move weekly, so /v1/models and the picker merge the provider's
 * public list at request time (10-min cache) instead of freezing on the curated
 * registry table. These tests pin the merge contract, not any particular
 * upstream model: the fallback keeps the registry promise when the network
 * fails, and live results only fill in what the registry lacks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Import the real filter/cache module so the contract under test is the one the
// routes import — only the network boundary is stubbed per test.
import {
  fetchSuggestedModelsServer,
  FILTERS,
  FALLBACK_SUGGESTIONS,
} from "@/app/api/providers/suggested-models/filters.js";

function jsonResponse(data, { ok = true } = {}) {
  return { ok, json: async () => data };
}

const ZEN = { url: "https://opencode.ai/zen/v1/models", type: "opencode-free" };

describe("fetchSuggestedModelsServer", () => {
  beforeEach(() => {
    vi.unstubAllGlobals?.();
  });

  it("returns filtered live models when upstream answers", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({
      data: [
        { id: "brand-new-model-free" },
        { id: "some-paid-model" },
        { id: "big-pickle" },
      ],
    }));
    const data = await fetchSuggestedModelsServer(ZEN);
    const ids = data.map((m) => m.id);
    expect(ids).toContain("brand-new-model-free");
    expect(ids).toContain("big-pickle");
    expect(ids).not.toContain("some-paid-model");
  });

  it("falls back to the registry table when upstream is unreachable", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    const data = await fetchSuggestedModelsServer({ url: "https://bad.invalid/x", type: "opencode-free" });
    expect(data.length).toBeGreaterThan(0);
    expect(data.map((m) => m.id)).toEqual(
      FALLBACK_SUGGESTIONS["opencode-free"].map((m) => m.id)
    );
  });

  it("falls back when upstream returns nothing usable", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({ data: [{ id: "paid-only" }] }));
    const data = await fetchSuggestedModelsServer({ url: "https://other.invalid/y", type: "opencode-free" });
    expect(data.map((m) => m.id)).toEqual(
      FALLBACK_SUGGESTIONS["opencode-free"].map((m) => m.id)
    );
  });

  it("rejects unknown filter types instead of passing junk through", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({ data: [{ id: "x" }] }));
    expect(await fetchSuggestedModelsServer({ url: ZEN.url, type: "nope" })).toEqual([]);
    expect(await fetchSuggestedModelsServer(null)).toEqual([]);
    expect(await fetchSuggestedModelsServer({ url: ZEN.url })).toEqual([]);
  });

  it("keeps the free-model predicate stable for known ids", () => {
    const filter = FILTERS["opencode-free"];
    const ids = filter([
      { id: "a-free" }, { id: "b:free" }, { id: "big-pickle" }, { id: "paid" },
    ]).map((m) => m.id);
    expect(ids).toEqual(["a-free", "b:free", "big-pickle"]);
  });
});