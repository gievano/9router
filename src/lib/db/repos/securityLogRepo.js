import { getAdapter } from "../driver.js";

/**
 * Security event log: sign-ins, refusals and anything that looks like a probe.
 *
 * The login limiter counted failures in memory and threw them away on restart,
 * so a patient attacker (or a breached key) left no trace at all. These rows
 * persist, and `classify` turns the raw stream into the three states the
 * dashboard colours: normal / suspicious / breach.
 */

// Kept small on purpose: this is a review surface, not an archive.
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

// Anything a scanner or a stranger tries first, in rough order of likelihood.
const PROBE_SIGNATURES = [
  { pattern: /\b(select|insert|drop|union|or\s+1\s*=\s*1|sleep\(|benchmark\()/i, label: "SQL injection attempt" },
  { pattern: /<script|javascript:|onerror\s*=|onload\s*=/i, label: "Script injection attempt" },
  { pattern: /\.\.\/|%2e%2e|%252e|\/etc\/passwd|\/proc\/self|win\.ini/gi, label: "Path traversal attempt" },
  { pattern: /\.\.(?:git|env|aws|ssh)|id_rsa|\.npmrc/gi, label: "Secret file probe" },
  { pattern: /(?:^|\/)\.env\b/gi, label: "Secret file probe" },
  { pattern: /authorization|x-api-key|cookie|passwd|password/gi, label: "Auth material probe" },
];

function normalizeEvent(input = {}) {
  return {
    at: input.at || new Date().toISOString(),
    type: String(input.type || "unknown").slice(0, 40),
    severity: ["info", "warn", "critical"].includes(input.severity) ? input.severity : "info",
    ip: String(input.ip || "unknown").slice(0, 64),
    actor: String(input.actor || "").slice(0, 120),
    method: String(input.method || "").toUpperCase().slice(0, 8),
    path: String(input.path || "").slice(0, 300),
    status: Number(input.status) || 0,
    detail: String(input.detail || "").slice(0, 400),
    userAgent: String(input.userAgent || "").slice(0, 200),
  };
}

function ensureTable(db) {
  db.run(`CREATE TABLE IF NOT EXISTS securityEvents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    ip TEXT NOT NULL,
    actor TEXT,
    method TEXT,
    path TEXT,
    status INTEGER,
    detail TEXT,
    userAgent TEXT
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_security_events_at ON securityEvents(at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON securityEvents(severity)`);
}

export async function recordSecurityEvent(input) {
  const event = normalizeEvent(input);
  try {
    const db = await getAdapter();
    ensureTable(db);
    db.run(
      `INSERT INTO securityEvents(at, type, severity, ip, actor, method, path, status, detail, userAgent)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.at,
        event.type,
        event.severity,
        event.ip,
        event.actor,
        event.method,
        event.path,
        event.status,
        event.detail,
        event.userAgent,
      ]
    );
  } catch (error) {
    // Never let audit bookkeeping break the request it is describing.
    console.error("[security-log] write failed:", error && error.message);
  }
  return event;
}

/**
 * Scores one event. Red is reserved for a real breach signal, not for noise:
 * a failed login on its own is a warning, a successful sign-in is a review, and
 * a successful sign-in with the published default password is the breach.
 */
export function classify(event) {
  const path = String(event.path || "");
  const detail = String(event.detail || "");
  const haystack = `${path} ${detail}`;
  const type = String(event.type || "");
  const isAuthFlow = /^(login|apikey_login|apikey_logout|logout)/.test(type);

  // Probe signatures describe request traffic. An auth line is allowed to
  // mention a password - that is what sign-ins are about - so the signature
  // match runs against the path only there. Testing the detail as well turned
  // every default-password sign-in into a bogus "Auth material probe".
  const probeScope = isAuthFlow ? path : haystack;
  const probe = PROBE_SIGNATURES.find((sig) => {
    sig.pattern.lastIndex = 0;
    return sig.pattern.test(probeScope);
  });

  if (probe) {
    return { level: "critical", label: probe.label };
  }

  if (event.severity === "critical") {
    return { level: "critical", label: detail || "Security-critical action" };
  }

  if (event.type === "login_failed" || event.status === 401 || event.status === 403) {
    return { level: "warn", label: event.type === "login_failed" ? "Failed sign-in" : "Refused request" };
  }

  if (event.type === "login_default_password" || /default password|mustChangePassword/i.test(detail)) {
    return { level: "critical", label: "Signed in with the published default password" };
  }

  if (event.type === "login_success" || event.type === "apikey_login_success") {
    return { level: "info", label: event.type === "apikey_login_success" ? "Signed in with an API key" : "Password sign-in" };
  }

  if (event.type === "logout" || event.type === "apikey_logout") {
    return { level: "info", label: "Signed out" };
  }

  if (event.type === "permission_denied") {
    return { level: "warn", label: "Refused request" };
  }

  if (event.type === "key_created" || event.type === "key_deleted" || event.type === "settings_changed") {
    return { level: "info", label: event.detail || "Administrative change" };
  }

  return { level: "info", label: event.detail || event.type };
}

export async function getSecurityEvents({ limit = DEFAULT_LIMIT, severity = null } = {}) {
  const db = await getAdapter();
  ensureTable(db);
  const capped = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT));
  const list = severity
    ? db.all(`SELECT * FROM securityEvents WHERE severity = ? ORDER BY id DESC LIMIT ?`, [severity, capped])
    : db.all(`SELECT * FROM securityEvents ORDER BY id DESC LIMIT ?`, [capped]);
  return list.map((row) => {
    const event = normalizeEvent(row);
    const verdict = classify(event);
    return { ...event, level: verdict.level, label: verdict.label };
  });
}

/** Headline numbers for the page header. */
export async function getSecuritySummary() {
  const events = await getSecurityEvents({ limit: MAX_LIMIT });
  const counts = { critical: 0, warn: 0, info: 0 };
  const logins = { success: 0, failed: 0, viaApiKey: 0, uniqueIps: new Set() };
  for (const event of events) {
    counts[event.level] = (counts[event.level] || 0) + 1;
    if (event.type === "login_success") {
      logins.success += 1;
      logins.uniqueIps.add(event.ip);
    }
    if (event.type === "login_failed") logins.failed += 1;
    if (event.type === "apikey_login_success") logins.viaApiKey += 1;
  }
  return {
    counts,
    logins: { success: logins.success, failed: logins.failed, viaApiKey: logins.viaApiKey },
    uniqueLoginIps: logins.uniqueIps.size,
    total: events.length,
  };
}

export async function clearSecurityEvents() {
  const db = await getAdapter();
  ensureTable(db);
  db.run("DELETE FROM securityEvents");
  return { cleared: true };
}

// ---------------------------------------------------------------------------
// Access trail (dashboard/API requests minus the LLM streams).
// ---------------------------------------------------------------------------

// Kept small enough that the UI can read it whole: this is "what touched the
// door recently", not a flow to replay.
const ACCESS_KEEP = 1200;

function ensureAccessTable(db) {
  db.run(`CREATE TABLE IF NOT EXISTS accessEvents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    method TEXT,
    path TEXT,
    status INTEGER DEFAULT 0,
    ms INTEGER DEFAULT 0,
    ip TEXT,
    role TEXT
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ae_at ON accessEvents(at DESC)`);
}

export async function recordAccessEvent(input = {}) {
  try {
    const db = await getAdapter();
    ensureAccessTable(db);
    db.run(
      `INSERT INTO accessEvents(at, method, path, status, ms, ip, role) VALUES(?, ?, ?, ?, ?, ?, ?)`,
      [
        input.at || new Date().toISOString(),
        String(input.method || "").toUpperCase().slice(0, 8),
        String(input.path || "").slice(0, 300),
        Number(input.status) || 0,
        Number(input.ms) || 0,
        String(input.ip || "").slice(0, 64),
        String(input.role || "anonymous").slice(0, 24),
      ]
    );
    // Trim in place so a forgotten dashboard tab cannot grow this forever.
    db.run(
      `DELETE FROM accessEvents WHERE id <= (SELECT MAX(id) - ? FROM accessEvents)`,
      [ACCESS_KEEP]
    );
  } catch (error) {
    console.error("[security-log] access write failed:", error && error.message);
  }
}

export async function getAccessEvents({ limit = 200 } = {}) {
  const db = await getAdapter();
  ensureAccessTable(db);
  const capped = Math.max(1, Math.min(Number(limit) || 200, ACCESS_KEEP));
  const list = db.all(`SELECT * FROM accessEvents ORDER BY id DESC LIMIT ?`, [capped]);
  return (list || []).map((row) => ({
    at: row.at,
    method: row.method || "",
    path: row.path || "",
    status: Number(row.status) || 0,
    ms: Number(row.ms) || 0,
    ip: row.ip || "",
    role: row.role || "anonymous",
  }));
}
