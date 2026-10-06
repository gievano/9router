import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

// Notification feed for the dashboard bell.
//
// Why a table and not a derived view: the interesting state is "already told
// the user about this", which nothing else stores. The update banner re-asks
// GitHub every hour, the security log is a raw trail nobody reads twice, and
// quota state lives per key. A notification is therefore written once when a
// condition is first detected and then stays read/unread until acknowledged, so
// the bell can count what is new without re-deriving anything on every render.
//
// `dedupeKey` is what makes that work: a condition that is still true (an
// install still behind master, a key still over its limit) re-detects on every
// check, and the same key means "we already said so" rather than a new entry
// each hour. The suffix lets a condition that clears and returns be told again.
const DEFAULT_LIMIT = 50;

let tableReady = false;

function ensureTable(db) {
  if (tableReady) return;
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    severity TEXT,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    dedupeKey TEXT,
    createdAt TEXT NOT NULL,
    readAt TEXT,
    clearedAt TEXT
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(createdAt DESC)`);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedupe ON notifications(dedupeKey) WHERE dedupeKey IS NOT NULL`);
  tableReady = true;
}

/**
 * Record a notification, or refresh the existing one for the same condition.
 * `clearedSuffix` on the dedupe key makes a returning condition a new entry.
 */
export async function notify(input = {}) {
  const db = await getAdapter();
  ensureTable(db);
  const title = String(input.title || "").trim();
  if (!title) return null;
  const kind = String(input.kind || "info");
  const severity = String(input.severity || "info");
  const now = new Date().toISOString();
  const dedupeKey = input.dedupeKey ? `${kind}:${String(input.dedupeKey)}` : null;

  if (dedupeKey) {
    const existing = db.get(
      `SELECT id, title, body, link, severity, createdAt FROM notifications WHERE dedupeKey = ?`,
      [dedupeKey]
    );
    if (existing) {
      // Already announced. Refresh the wording (a quota figure moves) but keep
      // the original timestamp so the bell does not stay permanently unread.
      db.run(`UPDATE notifications SET title = ?, body = ?, link = ?, severity = ?, clearedAt = NULL WHERE id = ?`, [
        title,
        String(input.body || ""),
        input.link || null,
        severity,
        existing.id,
      ]);
      return existing.id;
    }
  }

  const id = input.id || `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  db.run(
    `INSERT INTO notifications(id, kind, severity, title, body, link, dedupeKey, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, kind, severity, title, String(input.body || ""), input.link || null, dedupeKey, now]
  );
  return id;
}

export async function listNotifications({ limit = DEFAULT_LIMIT } = {}) {
  const db = await getAdapter();
  ensureTable(db);
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 200);
  const rows = db.all(
    `SELECT id, kind, severity, title, body, link, createdAt, readAt, clearedAt
     FROM notifications ORDER BY createdAt DESC LIMIT ?`,
    [safeLimit]
  );
  const unread = db.get(
    `SELECT COUNT(*) AS n FROM notifications WHERE readAt IS NULL AND clearedAt IS NULL`
  );
  return {
    notifications: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      severity: r.severity,
      title: r.title,
      body: r.body,
      link: r.link,
      at: r.createdAt,
      read: Boolean(r.readAt),
      cleared: Boolean(r.clearedAt),
    })),
    unread: Number(unread?.n || 0),
  };
}

export async function markRead(id) {
  const db = await getAdapter();
  ensureTable(db);
  const now = new Date().toISOString();
  if (id && id !== "all") {
    db.run(`UPDATE notifications SET readAt = COALESCE(readAt, ?) WHERE id = ?`, [now, String(id)]);
    return { ok: true };
  }
  db.run(`UPDATE notifications SET readAt = COALESCE(readAt, ?) WHERE readAt IS NULL`, [now]);
  return { ok: true };
}

/** Clear a condition: the dedupe row is retired so it can be announced again. */
export async function clearNotification(dedupeKey) {
  if (!dedupeKey) return { ok: true };
  const db = await getAdapter();
  ensureTable(db);
  db.run(`UPDATE notifications SET clearedAt = ?, readAt = COALESCE(readAt, ?) WHERE dedupeKey = ?`, [
    new Date().toISOString(),
    new Date().toISOString(),
    `${String(dedupeKey)}`,
  ]);
  return { ok: true };
}

/** Match a dedupeKey written by notify() without importing its prefix rules. */
export async function clearNotificationByKind(kind, dedupeKey) {
  if (!dedupeKey) return { ok: true };
  const db = await getAdapter();
  ensureTable(db);
  const now = new Date().toISOString();
  db.run(`UPDATE notifications SET clearedAt = ?, readAt = COALESCE(readAt, ?) WHERE dedupeKey = ?`, [
    now,
    now,
    `${String(kind)}:${String(dedupeKey)}`,
  ]);
  return { ok: true };
}

export async function getUnreadCount() {
  const db = await getAdapter();
  ensureTable(db);
  const row = db.get(`SELECT COUNT(*) AS n FROM notifications WHERE readAt IS NULL AND clearedAt IS NULL`);
  return Number(row?.n || 0);
}