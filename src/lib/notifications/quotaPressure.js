/**
 * Quota pressure for the notification feed.
 *
 * A key enforces exactly one budget (`limitKind`), so the feed has to read that same
 * budget. It used to look at `tokenLimit` alone, which meant a key switched to a USD or
 * request budget went silent: it refused traffic with 429 while the bell kept saying
 * nothing, and the operator only found out when something downstream broke.
 *
 * Pure on purpose — no db, no fetch — so the thresholds and the wording can be tested
 * without a server.
 */

/** Fire a warning once nine tenths of the budget is gone. */
export const QUOTA_WARN_RATIO = 0.9;

/** UTC calendar day (`YYYY-MM-DD`) — the bucket the cost counter rolls over on. */
function utcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function intervalMs(resetInterval) {
  const text = String(resetInterval || "never");
  const value = parseInt(text, 10);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (text.endsWith("m")) return value * 60 * 1000;
  if (text.endsWith("h")) return value * 60 * 60 * 1000;
  if (text.endsWith("d")) return value * 24 * 60 * 60 * 1000;
  return 0;
}

function nextUtcMidnight(now) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** Everything the feed needs, or null when this key has no budget or is not near it. */
export function quotaPressure(key, now = new Date()) {
  if (!key || key.isActive === false) return null;
  const kind = key.limitKind === "cost" || key.limitKind === "requests" ? key.limitKind : "tokens";

  let used = 0;
  let cap = 0;
  if (kind === "tokens") {
    cap = Number(key.tokenLimit) || 0;
    used = Number(key.usedTokens) || 0;
  } else if (kind === "requests") {
    cap = Number(key.requestLimit) || 0;
    used = Number(key.usedRequests) || 0;
  } else {
    cap = Number(key.dailyCostLimit) || 0;
    // Yesterday's dollars are not today's: a stale stamp means the counter starts at 0.
    used = key.costDay === utcDayKey(now) ? Number(key.costSpent) || 0 : 0;
  }
  if (cap <= 0) return null;

  const pct = used / cap;
  const level = pct >= 1 ? "critical" : pct >= QUOTA_WARN_RATIO ? "warning" : null;
  if (!level) return null;

  // Cost resets at 00:00 UTC no matter what interval the key carries; the other two
  // follow the interval, and "never" means there is no reset to announce.
  const span = intervalMs(key.resetInterval);
  const resetAt =
    kind === "cost"
      ? nextUtcMidnight(now)
      : span > 0 && key.lastResetAt
        ? new Date(new Date(key.lastResetAt).getTime() + span)
        : null;

  return { kind, level, pct, used, cap, resetAt };
}

export function formatQuotaValue(kind, value) {
  const n = Number(value) || 0;
  return kind === "cost" ? `$${n.toFixed(2)}` : n.toLocaleString("en-US");
}

/** "in 3h 12m", "in 4d 6h", "in 12m" — coarse on purpose, it is a hint not a clock. */
export function formatResetIn(resetAt, now = new Date()) {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

const KIND_COPY = {
  tokens: { noun: "token budget", amount: (used, cap) => `${used} of ${cap} tokens used.` },
  // "spent used" is not English: dollars are spent, not used.
  cost: { noun: "daily budget", amount: (used, cap) => `${used} of ${cap} spent.` },
  requests: { noun: "request budget", amount: (used, cap) => `${used} of ${cap} calls used.` },
};

export function quotaTitle(key, state) {
  const name = key?.name || "API key";
  const { noun } = KIND_COPY[state.kind];
  if (state.level === "critical") return `Key "${name}" is out of its ${noun}`;
  return `Key "${name}" is at ${Math.round(state.pct * 100)}% of its ${noun}`;
}

export function quotaBody(state, now = new Date()) {
  const { kind } = state;
  const said = KIND_COPY[kind].amount(
    formatQuotaValue(kind, state.used),
    formatQuotaValue(kind, state.cap)
  );
  const tail =
    kind === "cost"
      ? state.resetAt
        ? "Resets at 00:00 UTC"
        : null
      : (() => {
          const left = formatResetIn(state.resetAt, now);
          return left ? `Resets in ${left}` : "No automatic reset";
        })();
  return tail ? `${said} ${tail}.` : said;
}
