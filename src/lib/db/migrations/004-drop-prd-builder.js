import { TABLES } from "../schema.js";

export default {
  version: 4,
  name: "drop prd builder leftovers",
  up(db) {
    // The builder never owned a dedicated table in schema.js, and #3 already
    // pruned its kv scope - but an install still below #3 never ran that, and a
    // restored database may carry the scope too. Re-running the prune is
    // idempotent, so it is safe on every path.
    try { db.exec("DELETE FROM kv WHERE scope IN ('prdDocs', 'prdBuilder')"); } catch {}

    // Drop leftover PRD tables discovered by name in sqlite_master, never by
    // guesswork: prd-prefixed tables the current schema does not declare.
    // Nothing in TABLES carries that prefix, so declared tables are excluded by
    // construction, and a database with no leftover (the usual case) no-ops.
    const declared = new Set(Object.keys(TABLES));
    const leftover = db
      .all(`SELECT name FROM sqlite_master WHERE type = 'table' AND lower(name) LIKE 'prd%'`)
      .map((row) => row.name)
      .filter((name) => !declared.has(name));
    for (const name of leftover) {
      try { db.exec(`DROP TABLE IF EXISTS "${name.replace(/"/g, '""')}"`); } catch {}
    }
  },
};