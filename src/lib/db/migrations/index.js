// Migration registry - append new entries when schema changes.
// Each migration: { version: number, name: string, up(db): void }
// Versions MUST be unique and monotonically increasing.
import m001 from "./001-initial.js";
import m002 from "./002-drop-budget-groups.js";
import m003 from "./003-drop-prd-docs.js";
import m004 from "./004-drop-prd-builder.js";
import m005 from "./005-rename-oc1-alias.js";

export const MIGRATIONS = [m001, m002, m003, m004, m005].sort((a, b) => a.version - b.version);

export function latestVersion() {
  return MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;
}
