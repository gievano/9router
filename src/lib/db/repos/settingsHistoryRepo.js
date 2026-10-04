import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

// Settings history: every mutation keeps the before-image, so a bad change can
// be reverted. The table stores full snapshots (not diffs): settings is one
// row of ~dozens of keys, the table is pruned to 30 entries, and a snapshot
// reads itself back without a merge step that can be wrong.
//
// Secrets never enter the history. PROTECTED_SETTING_KEYS mirrors the PATCH
// handler's own list; the snapshot is taken after the handler already stripped
// them, and the revert path applies the same strip again, so restoring an old
// snapshot cannot resurrect a deleted password or OIDC secret.
const MAX_HISTORY = 30;
const DENY_REVERT = new Set(["password", "oidcClientSecret", "oidcClientId", "telegramBotToken", "githubToken"]);

let historyReady = false;

function ensureHistoryTable(db) {
  if (historyReady) return;
  db.run(`CREATE TABLE IF NOT EXISTS settingsHistory (
    id TEXT PRIMARY KEY,
    at TEXT NOT NULL,
    actor TEXT,
    reason TEXT,
    snapshot TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_settings_history_at ON settingsHistory(at DESC)`);
  historyReady = true;
}

/** Strip anything that must never be stored or restored. */
export function sanitizeHistorySnapshot(obj = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (DENY_REVERT.has(key)) continue;
    // Secrets can also hide one level down under provider-shaped keys; a value
    // that names a secret stays out even if the key is unfamiliar.
    const k = String(key).toLowerCase();
    if (k.includes("secret") || k.includes("token") || k === "password") continue;
    clean[key] = value;
  }
  return clean;
}

/** Take the before-image of a mutation. `before` is the current settings object. */
export async function snapshotSettings({ before, actor = "", reason = "" } = {}) {
  const db = await getAdapter();
  ensureHistoryTable(db);
  const clean = sanitizeHistorySnapshot(before || {});
  const id = `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  db.run(`INSERT INTO settingsHistory(id, at, actor, reason, snapshot) VALUES(?, ?, ?, ?, ?)`, [
    id,
    now,
    String(actor || ""),
    String(reason || ""),
    stringifyJson(clean),
  ]);
  // Prune old entries without a second query round-trip.
  db.run(
    `DELETE FROM settingsHistory WHERE id NOT IN (SELECT id FROM settingsHistory ORDER BY at DESC LIMIT ?)`,
    [MAX_HISTORY]
  );
  return id;
}

export async function listSettingsHistory({ limit = MAX_HISTORY } = {}) {
  const db = await getAdapter();
  ensureHistoryTable(db);
  const safeLimit = Math.min(Math.max(Number(limit) || MAX_HISTORY, 1), MAX_HISTORY);
  const rows = db.all(
    `SELECT id, at, actor, reason, snapshot FROM settingsHistory ORDER BY at DESC LIMIT ?`,
    [safeLimit]
  );
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    actor: r.actor,
    reason: r.reason,
    keys: Object.keys(parseJson(r.snapshot, {}) || {}),
  }));
}

/** One snapshot, with its full body. */
export async function getSettingsSnapshot(id) {
  if (!id) return null;
  const db = await getAdapter();
  ensureHistoryTable(db);
  const row = db.get(`SELECT id, at, actor, reason, snapshot FROM settingsHistory WHERE id = ?`, [String(id)]);
  if (!row) return null;
  return {
    id: row.id,
    at: row.at,
    actor: row.actor,
    reason: row.reason,
    snapshot: sanitizeHistorySnapshot(parseJson(row.snapshot, {})),
  };
}

export async function getSettingsSnapshotCount() {
  const db = await getAdapter();
  ensureHistoryTable(db);
  const row = db.get(`SELECT COUNT(*) AS n FROM settingsHistory`);
  return Number(row?.n || 0);
}