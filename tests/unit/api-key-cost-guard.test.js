// The daily cost cap is enforced from a counter on the key row, not from the usage
// log: the log is pruned, so counting it would under-report spend and let a key
// overspend after a cleanup. These tests drive the real SQLite adapter because the
// rollover lives in SQL (date('now')), and a mock would prove nothing about it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-cost-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

const KEY = "sk-cost-guard-test";
const today = () => new Date().toISOString().slice(0, 10);
// gpt-4o-mini is priced at 0.15 USD per 1M prompt tokens in the bundled catalogue,
// so one million prompt tokens is a spend we can assert exactly.
const EXPENSIVE_CALL = {
  provider: "openai",
  model: "gpt-4o-mini",
  tokens: { prompt_tokens: 1_000_000, completion_tokens: 0 },
  status: "ok",
};

async function seedKey({ dailyCostLimit = 0, costSpent = 0, costDay = "", limitKind = "tokens", tokenLimit = 0, usedTokens = 0, requestLimit = 0, usedRequests = 0 } = {}) {
  const { getAdapter } = await import("@/lib/db/driver.js");
  const db = await getAdapter();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt, tokenLimit, usedTokens,
                         limitKind, requestLimit, usedRequests,
                         resetInterval, lastResetAt, allowedModels, rpmLimit, tpmLimit,
                         dailyCostLimit, costSpent, costDay, ipWhitelist, expiresAt,
                         systemPrompt, permissions, createdBy)
     VALUES(?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'never', ?, '*', 0, 0, ?, ?, ?, '', NULL, '', '{}', '')`,
    [`id-${Math.random().toString(36).slice(2)}`, KEY, "cost guard", "machine", now,
      tokenLimit, usedTokens, limitKind, requestLimit, usedRequests, now,
      dailyCostLimit, costSpent, costDay]
  );
  return db;
}

describe("API key daily cost limit", () => {
  it("adds the cost of a logged request to today's counter", async () => {
    const db = await seedKey({ limitKind: "cost", dailyCostLimit: 10 });
    const { saveRequestUsage } = await import("@/lib/db/repos/usageRepo.js");

    await saveRequestUsage({ ...EXPENSIVE_CALL, apiKey: KEY, timestamp: "2026-10-20T01:00:00.000Z" });

    const row = db.get(`SELECT costSpent, costDay FROM apiKeys WHERE key = ?`, [KEY]);
    expect(row.costSpent).toBeCloseTo(0.15, 6);
    expect(row.costDay).toBe(today());
  });

  it("refuses with COST_LIMIT_EXCEEDED once the day's spend reaches the cap", async () => {
    await seedKey({ limitKind: "cost", dailyCostLimit: 0.1 });
    const { saveRequestUsage } = await import("@/lib/db/repos/usageRepo.js");
    const { validateApiKey } = await import("@/lib/db/repos/apiKeysRepo.js");

    await saveRequestUsage({ ...EXPENSIVE_CALL, apiKey: KEY, timestamp: "2026-10-20T02:00:00.000Z" });

    expect(await validateApiKey(KEY)).toBe("COST_LIMIT_EXCEEDED");
  });

  it("lets the key through while today's spend is still below the cap", async () => {
    await seedKey({ limitKind: "cost", dailyCostLimit: 1 });
    const { saveRequestUsage } = await import("@/lib/db/repos/usageRepo.js");
    const { validateApiKey } = await import("@/lib/db/repos/apiKeysRepo.js");

    await saveRequestUsage({ ...EXPENSIVE_CALL, apiKey: KEY, timestamp: "2026-10-20T03:00:00.000Z" });

    expect(await validateApiKey(KEY)).toBe(true);
  });

  it("ignores the cap when it is zero, even with spend already recorded", async () => {
    await seedKey({ limitKind: "cost", dailyCostLimit: 0, costSpent: 99, costDay: today() });
    const { validateApiKey } = await import("@/lib/db/repos/apiKeysRepo.js");

    expect(await validateApiKey(KEY)).toBe(true);
  });

  it("rolls over: a stamp from an earlier day neither blocks nor survives the next write", async () => {
    const db = await seedKey({ limitKind: "cost", dailyCostLimit: 0.1, costSpent: 5, costDay: "2000-01-01" });
    const { saveRequestUsage } = await import("@/lib/db/repos/usageRepo.js");
    const { validateApiKey } = await import("@/lib/db/repos/apiKeysRepo.js");

    // Yesterday's 5 USD must not block today's first request.
    expect(await validateApiKey(KEY)).toBe(true);

    await saveRequestUsage({ ...EXPENSIVE_CALL, apiKey: KEY, timestamp: "2026-10-20T04:00:00.000Z" });

    const row = db.get(`SELECT costSpent, costDay FROM apiKeys WHERE key = ?`, [KEY]);
    // Replaced, not added to: 0.15 and not 5.15.
    expect(row.costSpent).toBeCloseTo(0.15, 6);
    expect(row.costDay).toBe(today());
  });

  it("counts logged requests and refuses at the request cap", async () => {
    const { saveRequestUsage } = await import("@/lib/db/repos/usageRepo.js");
    const { validateApiKey } = await import("@/lib/db/repos/apiKeysRepo.js");
    await seedKey({ limitKind: "requests", requestLimit: 1 });

    await saveRequestUsage({ ...EXPENSIVE_CALL, apiKey: KEY, timestamp: "2026-10-20T05:00:00.000Z" });

    expect(await validateApiKey(KEY)).toBe("REQUEST_LIMIT_EXCEEDED");
  });

  it("lets requests through below the cap while a stale token cap stays ignored", async () => {
    const { saveRequestUsage } = await import("@/lib/db/repos/usageRepo.js");
    const { validateApiKey } = await import("@/lib/db/repos/apiKeysRepo.js");
    // The token budget is already exhausted, but requests is the selected kind.
    await seedKey({ limitKind: "requests", requestLimit: 3, tokenLimit: 10, usedTokens: 999 });

    await saveRequestUsage({ ...EXPENSIVE_CALL, apiKey: KEY, timestamp: "2026-10-20T06:00:00.000Z" });

    expect(await validateApiKey(KEY)).toBe(true);
  });

  it("enforces only the selected kind, and switching kind switches the budget", async () => {
    const { validateApiKey, updateApiKey } = await import("@/lib/db/repos/apiKeysRepo.js");
    const db = await seedKey({ limitKind: "cost", dailyCostLimit: 5, tokenLimit: 10, usedTokens: 999 });

    // The exhausted token budget must not block while cost is the selected kind.
    expect(await validateApiKey(KEY)).toBe(true);

    const key = db.get(`SELECT id FROM apiKeys WHERE key = ?`, [KEY]);
    await updateApiKey(key.id, { limitKind: "tokens" });

    expect(await validateApiKey(KEY)).toBe("QUOTA_EXCEEDED");
  });

  it("answers 429 for the cost reason instead of falling back to 401", async () => {
    const { apiKeyGateFailure } = await import("@/sse/services/keyGate.js");

    expect(apiKeyGateFailure("COST_LIMIT_EXCEEDED")).toEqual({
      status: 429,
      message: "API key daily cost limit exceeded",
    });
  });
});
