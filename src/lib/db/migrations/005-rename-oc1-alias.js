// Legacy alias rename: OpenCode Free used to be addressed as `oc1`; the
// registry now publishes `oc` as its primary alias. Models and aliases the
// user had already added under the old alias keep pointing at `oc1`, so they
// stop matching the provider group and surface as an orphan "Custom Models"
// bucket in the model picker. Rewrite the stored alias in place so the rows
// land under the OpenCode Free group again.
//
// Idempotent: a database already on `oc` has nothing to match and no-ops.
const LEGACY_ALIAS = "oc1";
const CURRENT_ALIAS = "oc";

export default {
  version: 5,
  name: "rename opencode oc1 alias to oc",
  up(db) {
    // customModels: key = `${providerAlias}|${id}|${type}`, value = JSON with providerAlias
    try {
      const rows = db
        .all(`SELECT rowid, key, value FROM kv WHERE scope = 'customModels'`)
        .filter((row) => String(row.key || "").startsWith(`${LEGACY_ALIAS}|`));
      for (const row of rows) {
        const nextKey = `${CURRENT_ALIAS}${String(row.key).slice(LEGACY_ALIAS.length)}`;
        let nextValue = row.value;
        try {
          const parsed = JSON.parse(row.value);
          if (parsed && parsed.providerAlias === LEGACY_ALIAS) {
            parsed.providerAlias = CURRENT_ALIAS;
            nextValue = JSON.stringify(parsed);
          }
        } catch {}
        db.run(`DELETE FROM kv WHERE rowid = ?`, [row.rowid]);
        db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [nextKey, nextValue]);
      }
    } catch {}

    // modelAliases: key = alias name, value = `${providerAlias}/${modelId}`
    try {
      const rows = db
        .all(`SELECT rowid, key, value FROM kv WHERE scope = 'modelAliases'`)
        .filter((row) => String(row.value || "").startsWith(`${LEGACY_ALIAS}/`));
      for (const row of rows) {
        const nextValue = `${CURRENT_ALIAS}${String(row.value).slice(LEGACY_ALIAS.length)}`;
        db.run(`UPDATE kv SET value = ? WHERE rowid = ?`, [nextValue, row.rowid]);
      }
    } catch {}
  },
};
