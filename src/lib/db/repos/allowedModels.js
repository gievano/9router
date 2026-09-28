// Allowed-model pattern language, in one place.
//
// Three consumers must agree on what a key's allowedModels list admits: the
// request gate, the /v1/models listing, and the usage dashboards. Kept free of
// imports so every one of them — and the self-check — can use it without
// dragging in the database driver.

/**
 * Allowed-model patterns of a key, or null when the key may use every model.
 * One definition for both the request gate and the /v1/models listing, so a key
 * can never see a model it would be refused at request time.
 */
export function parseAllowedModels(allowedModels) {
  const raw = String(allowedModels ?? "").trim();
  if (!raw || raw === "*") return null;
  const patterns = raw.split(",").map((model) => model.trim().toLowerCase()).filter(Boolean);
  return patterns.length ? patterns : null;
}

/** Exact, `prefix*` and `*suffix` patterns, matched case-insensitively. */
export function matchesAllowedModels(patterns, requestedModel) {
  if (!patterns) return true;
  const req = String(requestedModel || "").trim().toLowerCase();
  if (!req) return false;
  return patterns.some((allowed) => {
    if (allowed === "*" || allowed === req) return true;
    if (allowed.endsWith("*")) return req.startsWith(allowed.slice(0, -1));
    if (allowed.startsWith("*")) return req.endsWith(allowed.slice(1));
    return false;
  });
}

/**
 * Same pattern language as matchesAllowedModels, expressed as a SQL condition so
 * row counts stay correct under pagination. Returns null when every model is
 * allowed, which lets the caller skip the WHERE clause entirely.
 */
export function buildAllowedModelsSql(patterns, column = "model") {
  if (!patterns) return null;
  const clauses = [];
  const params = [];
  for (const allowed of patterns) {
    if (allowed === "*") return null;
    if (allowed.endsWith("*")) {
      clauses.push(`${column} LIKE ?`);
      params.push(`${allowed.slice(0, -1)}%`);
    } else if (allowed.startsWith("*")) {
      clauses.push(`${column} LIKE ?`);
      params.push(`%${allowed.slice(1)}`);
    } else {
      clauses.push(`${column} = ?`);
      params.push(allowed);
    }
  }
  if (clauses.length === 0) return { sql: "1 = 0", params };
  return { sql: `(${clauses.join(" OR ")})`, params };
}
