// Fail-open shim for the proxy-pool fitness API (0.91 feature, absent in this
// line). The real implementation persists unfit pools to SQLite via `@/models`
// + a DB migration that does not exist here. This no-op keeps the freebuff
// executor's limited_ip cooldown path working: the local in-memory cooldown
// still applies, only the cross-request pool marking is skipped.
export async function markPoolUnfit() {
  return false;
}

export async function clearPoolUnfit() {
  return false;
}

export async function loadPoolFitness() {
  return;
}

export const POOL_UNFIT_MS = 5 * 60 * 1000;
