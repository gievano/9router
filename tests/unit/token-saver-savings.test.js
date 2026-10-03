/**
 * Token-saver savings: measure → record → report, in isolation.
 *
 * Measurement runs against plain request bodies (no DB): pruning counts only
 * the turns that would be dropped, RTK converts byte savings with the shared
 * /4 rule, a cache hit replays the provider's own billed usage. Recording and
 * reporting run against an injected fake adapter — kv schema drift must not
 * break unit coverage, and the recorder must not reach for the real driver.
 */
import { describe, expect, it } from "vitest";
import {
  measurePruningSavings,
  measureRtkSavings,
  measureCacheSavings,
  recordTokenSavings,
  getTokenSavingsReport,
  priceSavedTokens,
} from "../../open-sse/rtk/tokenSaverStats.js";

function msgs(n, len = 100) {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: `m${i}-` + "x".repeat(len),
  }));
}

/** Minimal kv-shaped adapter: get/all/run over a scope-keyed map. */
function fakeDb(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get(_q, params) {
      const [scope, key] = params;
      const value = store.get(`${scope}/${key}`);
      return value === undefined ? null : { value };
    },
    all(_q, params) {
      const scope = params[0];
      return [...store.entries()]
        .filter(([k]) => k.startsWith(`${scope}/`))
        .map(([k, value]) => ({ key: k.slice(scope.length + 1), value }))
        .sort((a, b) => a.key.localeCompare(b.key));
    },
    run(q, params) {
      const [scope, key, value] = params;
      // The recorder issues both an upsert and per-row deletes; branch on SQL.
      if (/INSERT/i.test(q)) store.set(`${scope}/${key}`, value);
      else if (/DELETE/i.test(q)) store.delete(`${scope}/${key}`);
    },
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

describe("measurePruningSavings", () => {
  it("counts only the dropped turns, never system prompts", () => {
    const body = { messages: [{ role: "system", content: "sys" }, ...msgs(10, 96)] };
    const got = measurePruningSavings(body, 4);
    // 10 non-system, keep 4 → 6 dropped, each ~100 chars + role frame.
    expect(got).toBeGreaterThan(120);
    expect(got).toBeLessThan(320);
  });

  it("returns 0 when nothing would be dropped", () => {
    expect(measurePruningSavings({ messages: msgs(3) }, 20)).toBe(0);
    expect(measurePruningSavings({ messages: [] }, 4)).toBe(0);
    expect(measurePruningSavings(null, 4)).toBe(0);
  });

  it("supports the Responses and Gemini body shapes", () => {
    expect(measurePruningSavings({ input: msgs(10, 96) }, 4)).toBeGreaterThan(0);
    expect(measurePruningSavings({ contents: msgs(10, 96) }, 4)).toBeGreaterThan(0);
  });
});

describe("measureRtkSavings", () => {
  it("converts RTK byte savings with the shared rule", () => {
    expect(measureRtkSavings({ hits: [{ saved: 4000 }] })).toBe(1000);
  });

  it("ignores hits without a byte figure", () => {
    expect(measureRtkSavings({ hits: [{ filter: "x" }] })).toBe(0);
    expect(measureRtkSavings(null)).toBe(0);
    expect(measureRtkSavings({ hits: [] })).toBe(0);
  });
});

describe("measureCacheSavings", () => {
  it("replays the provider's own billed usage", () => {
    const cached = { usage: { prompt_tokens: 1200, completion_tokens: 300, total_tokens: 1500 } };
    expect(measureCacheSavings(cached)).toBe(1500);
  });

  it("falls back to the parts when the total is missing", () => {
    const cached = { usage: { input_tokens: 800, output_tokens: 200 } };
    expect(measureCacheSavings(cached)).toBe(1000);
  });

  it("returns 0 without a usable usage block", () => {
    expect(measureCacheSavings({})).toBe(0);
    expect(measureCacheSavings({ usage: {} })).toBe(0);
    expect(measureCacheSavings(null)).toBe(0);
  });
});

describe("priceSavedTokens", () => {
  it("prices prompt-side tokens at the model's live rate", () => {
    const cost = priceSavedTokens("openai", "totally-unlisted-model-xyz", 1_000_000);
    // Unlisted models fall back to DEFAULT_PRICING.input ($0.50/M).
    expect(cost).toBeCloseTo(0.5, 3);
  });

  it("prices free-tier models at zero", () => {
    expect(priceSavedTokens("opencode", "mimo-v2.6-flash-free", 1_000_000)).toBe(0);
  });

  it("returns 0 for no savings", () => {
    expect(priceSavedTokens("openai", "gpt-4o", 0)).toBe(0);
  });
});

describe("recordTokenSavings + getTokenSavingsReport", () => {
  it("accumulates into today's bucket, split per model", async () => {
    const db = fakeDb();
    await recordTokenSavings(Promise.resolve(db), {
      provider: "p1", model: "alpha", pruning: 500, cache: 1500,
    });
    await recordTokenSavings(Promise.resolve(db), {
      provider: "p1", model: "beta", rtk: 400,
    });

    const report = await getTokenSavingsReport(Promise.resolve(db), "30d");
    expect(report.totals.requests).toBe(2);
    expect(report.totals.savedTokens).toBe(2400);
    expect(report.models.map((m) => m.model).sort()).toEqual(["p1/alpha", "p1/beta"]);
    expect(report.daily).toHaveLength(1);
    expect(report.daily[0].date).toBe(todayKey());
    expect(report.estimated).toBe(true);
  });

  it("skips the write entirely when nothing was saved", async () => {
    const db = fakeDb();
    const res = await recordTokenSavings(Promise.resolve(db), { provider: "p", model: "m" });
    expect(res).toBeNull();
    expect(db.store.size).toBe(0);
  });

  it("keeps a prior day's bucket when a second entry lands", async () => {
    const db = fakeDb();
    await recordTokenSavings(Promise.resolve(db), { provider: "p", model: "m", pruning: 100 });
    await recordTokenSavings(Promise.resolve(db), { provider: "p", model: "m", cache: 200 });
    const report = await getTokenSavingsReport(Promise.resolve(db), "7d");
    expect(report.totals.requests).toBe(2);
    expect(report.totals.savedTokens).toBe(300);
    expect(report.models[0].savedTokens).toBe(300);
  });

  it("excludes days outside the period window", async () => {
    const oldKey = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
    const db = fakeDb({
      [`tokenSaverStats/${oldKey}`]: JSON.stringify({
        date: oldKey, requests: 9, savedTokens: 9999, savedCost: 1, byModel: {},
      }),
    });
    const report = await getTokenSavingsReport(Promise.resolve(db), "7d");
    expect(report.totals.savedTokens).toBe(0);
    const all = await getTokenSavingsReport(Promise.resolve(db), "60d");
    expect(all.totals.savedTokens).toBe(9999);
  });

  it("survives a corrupt day bucket without losing the report", async () => {
    const db = fakeDb({ [`tokenSaverStats/${todayKey()}`]: "{not json" });
    const report = await getTokenSavingsReport(Promise.resolve(db), "30d");
    expect(report.totals.savedTokens).toBe(0);
    expect(report.daily).toEqual([]);
  });
});
