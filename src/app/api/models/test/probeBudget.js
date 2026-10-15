/**
 * Probe budgets per provider, shared by the model ping route and its test.
 *
 * Kept in its own dependency-free module because src/app/api/models/test is
 * imported through @/ path aliases that the vitest environment cannot
 * resolve - importing ping.js directly from a unit test fails before the
 * first assertion runs.
 */

/**
 * Providers whose "API" is a browser web endpoint behind a sign-in cookie.
 * A warmed-up probe costs 13-50s on these (per-account queueing plus an 800KB
 * session-page fetch), so the snappy REST budget below would turn every one
 * of their models into "The operation was aborted due to timeout".
 */
export const WEB_COOKIE_PROVIDERS = new Set(["gemini-web", "kimi-web", "deepseek-web", "xiaomi-mimo"]);

/** Default per-probe budget for ordinary REST providers (fail fast). */
export const PROBE_TIMEOUT_MS = 15000;

/** Per-probe budget for cookie-based web providers. */
export const WEB_COOKIE_PROBE_TIMEOUT_MS = 90000;

/**
 * Probe budget for one model id of the form "<provider>/<model>".
 */
export function probeTimeoutMs(model) {
  const provider = String(model).split("/")[0];
  return WEB_COOKIE_PROVIDERS.has(provider) ? WEB_COOKIE_PROBE_TIMEOUT_MS : PROBE_TIMEOUT_MS;
}
