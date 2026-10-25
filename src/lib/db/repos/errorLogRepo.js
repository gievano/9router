import { getAdapter } from "../driver.js";

function ensureTable(db) {
  db.run(`CREATE TABLE IF NOT EXISTS errorLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    endpoint TEXT,
    statusCode INTEGER,
    errorMessage TEXT NOT NULL,
    errorType TEXT,
    stack TEXT
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_error_logs_ts ON errorLogs(timestamp DESC)`);
}

export async function recordErrorLog({
  provider = "",
  model = "",
  endpoint = "",
  statusCode = 500,
  errorMessage = "Unknown error",
  errorType = "error",
  stack = "",
}) {
  try {
    const db = await getAdapter();
    ensureTable(db);
    const ts = new Date().toISOString();
    db.run(
      `INSERT INTO errorLogs (timestamp, provider, model, endpoint, statusCode, errorMessage, errorType, stack)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ts,
        String(provider || ""),
        String(model || ""),
        String(endpoint || ""),
        Number(statusCode) || 500,
        String(errorMessage || ""),
        String(errorType || "error"),
        String(stack || ""),
      ]
    );

    // Keep at most 1000 newest error logs
    db.run(
      `DELETE FROM errorLogs WHERE id NOT IN (
        SELECT id FROM errorLogs ORDER BY id DESC LIMIT 1000
      )`
    );
  } catch (err) {
    console.error("Failed to record error log:", err);
  }
}

export async function getErrorLogs(limit = 200) {
  try {
    const db = await getAdapter();
    ensureTable(db);
    const rows = db.all(
      `SELECT * FROM errorLogs ORDER BY id DESC LIMIT ?`,
      [limit]
    );
    return rows || [];
  } catch (err) {
    console.error("Failed to fetch error logs:", err);
    return [];
  }
}

export async function clearErrorLogs() {
  try {
    const db = await getAdapter();
    ensureTable(db);
    db.run(`DELETE FROM errorLogs`);
    return true;
  } catch (err) {
    console.error("Failed to clear error logs:", err);
    return false;
  }
}
