import { describe, expect, it } from "vitest";
import {
  quotaPressure,
  quotaTitle,
  quotaBody,
  formatQuotaValue,
  formatResetIn,
} from "../../src/lib/notifications/quotaPressure.js";

const NOW = new Date("2026-10-20T21:00:00Z");

const key = (over = {}) => ({
  id: "k1",
  name: "budget-demo",
  isActive: true,
  limitKind: "tokens",
  tokenLimit: 100000,
  usedTokens: 0,
  requestLimit: 0,
  usedRequests: 0,
  dailyCostLimit: 0,
  costSpent: 0,
  costDay: "",
  resetInterval: "never",
  lastResetAt: null,
  ...over,
});

describe("quotaPressure reads the budget the key enforces", () => {
  it("warns at 90% and goes critical at the cap, per kind", () => {
    expect(quotaPressure(key({ usedTokens: 89000 }))).toBeNull();
    expect(quotaPressure(key({ usedTokens: 90000 })).level).toBe("warning");
    expect(quotaPressure(key({ usedTokens: 100000 })).level).toBe("critical");

    const req = key({ limitKind: "requests", requestLimit: 500, usedRequests: 450 });
    expect(quotaPressure(req)).toMatchObject({ kind: "requests", level: "warning" });
    expect(quotaPressure(key({ limitKind: "requests", requestLimit: 500, usedRequests: 500 })).level).toBe("critical");

    const cost = key({ limitKind: "cost", dailyCostLimit: 2.5, costSpent: 2.3, costDay: "2026-10-20" });
    expect(quotaPressure(cost, NOW)).toMatchObject({ kind: "cost", level: "warning" });
    expect(quotaPressure(key({ limitKind: "cost", dailyCostLimit: 2.5, costSpent: 2.5, costDay: "2026-10-20" }), NOW).level).toBe(
      "critical"
    );
  });

  it("counts yesterday's dollars as zero", () => {
    const stale = key({ limitKind: "cost", dailyCostLimit: 2.5, costSpent: 2.4, costDay: "2026-10-19" });
    expect(quotaPressure(stale, NOW)).toBeNull();
  });

  it("stays quiet for unlimited budgets, inactive keys and the unselected kinds", () => {
    expect(quotaPressure(key({ tokenLimit: 0 }))).toBeNull();
    expect(quotaPressure(key({ isActive: false, usedTokens: 100000 }))).toBeNull();
    // A spent request counter must not nag while the key is on the token budget.
    expect(quotaPressure(key({ usedRequests: 500, requestLimit: 500 }))).toBeNull();
    expect(quotaPressure(null)).toBeNull();
  });

  it("knows when each kind resets", () => {
    // Cost always rolls at 00:00 UTC regardless of the interval.
    const cost = quotaPressure(
      key({ limitKind: "cost", dailyCostLimit: 1, costSpent: 1, costDay: "2026-10-20", resetInterval: "7d" }),
      NOW
    );
    expect(cost.resetAt.toISOString()).toBe("2026-10-21T00:00:00.000Z");

    const windowed = quotaPressure(
      key({ usedTokens: 95000, resetInterval: "7d", lastResetAt: "2026-10-18T21:00:00Z" }),
      NOW
    );
    expect(windowed.resetAt.toISOString()).toBe("2026-10-25T21:00:00.000Z");

    expect(quotaPressure(key({ usedTokens: 95000, resetInterval: "never" }), NOW).resetAt).toBeNull();
  });
});

describe("quota wording names the kind instead of assuming tokens", () => {
  it("titles say which budget is under pressure", () => {
    const warn = quotaPressure(key({ usedTokens: 95000 }));
    const crit = quotaPressure(key({ usedTokens: 100000 }));
    expect(quotaTitle(key(), warn)).toBe('Key "budget-demo" is at 95% of its token budget');
    expect(quotaTitle(key(), crit)).toBe('Key "budget-demo" is out of its token budget');

    const cost = quotaPressure(key({ limitKind: "cost", dailyCostLimit: 2.5, costSpent: 2.5, costDay: "2026-10-20" }), NOW);
    expect(quotaTitle(key(), cost)).toBe('Key "budget-demo" is out of its daily budget');
  });

  it("bodies carry the amounts in the right unit and the reset", () => {
    const cost = quotaPressure(key({ limitKind: "cost", dailyCostLimit: 2.5, costSpent: 2.4, costDay: "2026-10-20" }), NOW);
    expect(quotaBody(cost, NOW)).toBe("$2.40 of $2.50 spent. Resets at 00:00 UTC.");
    // "spend used" / "spent used" read as a typo; dollars are spent, not used.
    expect(quotaBody(cost, NOW)).not.toMatch(/spen[dt] used/);

    const req = quotaPressure(key({ limitKind: "requests", requestLimit: 500, usedRequests: 450 }), NOW);
    expect(quotaBody(req, NOW)).toBe("450 of 500 calls used. No automatic reset.");

    const tokens = quotaPressure(key({ usedTokens: 95000, resetInterval: "7d", lastResetAt: "2026-10-18T21:00:00Z" }), NOW);
    expect(quotaBody(tokens, NOW)).toBe("95,000 of 100,000 tokens used. Resets in 5d.");
  });

  it("formats values per unit", () => {
    expect(formatQuotaValue("cost", 2.5)).toBe("$2.50");
    expect(formatQuotaValue("tokens", 95000)).toBe("95,000");
    expect(formatResetIn(new Date("2026-10-20T23:30:00Z"), NOW)).toBe("2h 30m");
    expect(formatResetIn(null, NOW)).toBeNull();
  });
});
