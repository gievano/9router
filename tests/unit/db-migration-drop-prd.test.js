/**
 * Migration 004 - the forward pass that converges every database on the
 * PRD Builder removal: prune its kv scope, drop any leftover PRD table.
 * 003 stays in the chain because it already ran on live installs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-prd-mig-"));
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

describe("drop prd builder leftovers (migration 004)", () => {
  it("appends to the chain after 003 and stamps a fresh DB at 4", async () => {
    const { MIGRATIONS, latestVersion } = await import("@/lib/db/migrations/index.js");
    expect(MIGRATIONS.map((m) => m.version)).toEqual([1, 2, 3, 4]);
    expect(latestVersion()).toBe(4);

    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    const row = db.get(`SELECT value FROM _meta WHERE key='schemaVersion'`);
    expect(parseInt(row.value, 10)).toBe(4);
  });

  it("purges PRD storage from an existing install and leaves other scopes alone", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    // Simulate an install still carrying the feature's footprint, then rewind
    // the stamp so the next boot re-applies only the pending migrations.
    db.exec(`CREATE TABLE prdDocs (id TEXT PRIMARY KEY, data TEXT)`);
    db.exec(`CREATE TABLE prdBuilderDrafts (id TEXT PRIMARY KEY)`);
    db.exec(`INSERT INTO kv(scope, key, value) VALUES('prdDocs', 'a', '{}')`);
    db.exec(`INSERT INTO kv(scope, key, value) VALUES('prdDocs', 'b', '{}')`);
    db.exec(`INSERT INTO kv(scope, key, value) VALUES('otherScope', 'keep', '{}')`);
    db.exec(`UPDATE _meta SET value = '3' WHERE key='schemaVersion'`);
    db.close?.();

    delete global._dbAdapter;
    vi.resetModules();
    const { getAdapter: reboot } = await import("@/lib/db/driver.js");
    const db2 = await reboot();

    const tables = db2.all(`SELECT name FROM sqlite_master WHERE type='table'`).map((t) => t.name);
    expect(tables).not.toContain("prdDocs");
    expect(tables).not.toContain("prdBuilderDrafts");
    expect(tables).toContain("kv");
    expect(db2.all(`SELECT key FROM kv WHERE scope='prdDocs'`)).toHaveLength(0);
    expect(db2.all(`SELECT key FROM kv WHERE scope='otherScope'`)).toHaveLength(1);

    const row = db2.get(`SELECT value FROM _meta WHERE key='schemaVersion'`);
    expect(parseInt(row.value, 10)).toBe(4);
  });
});
