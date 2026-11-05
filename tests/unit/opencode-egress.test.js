import { describe, it, expect, beforeEach } from "vitest";
import {
  parseRetryAfterMs,
  markEgressCooling,
  getEgressCooldown,
  selectAlternateProxy,
  syntheticRateLimitResponse,
  resolveEgress,
  resetEgressState,
  DIRECT_EGRESS_ID,
} from "../../open-sse/utils/egress.js";

beforeEach(() => {
  resetEgressState();
});

describe("parseRetryAfterMs", () => {
  const now = 1_700_000_000_000;

  it("parses numeric seconds from Retry-After header", () => {
    const headers = new Headers({ "retry-after": "15" });
    expect(parseRetryAfterMs(headers, "", now)).toBe(15_000);
  });

  it("parses HTTP date from Retry-After header", () => {
    const targetDate = new Date(now + 45_000).toUTCString();
    const headers = new Headers({ "retry-after": targetDate });
    expect(parseRetryAfterMs(headers, "", now)).toBe(45_000);
  });

  it("parses x-ratelimit-reset-after header", () => {
    const headers = new Headers({ "x-ratelimit-reset-after": "30" });
    expect(parseRetryAfterMs(headers, "", now)).toBe(30_000);
  });

  it("parses retry_after from JSON body", () => {
    const body = JSON.stringify({
      error: {
        type: "FreeUsageLimitError",
        message: "rate limit exceeded",
        retry_after: 25,
      },
    });
    expect(parseRetryAfterMs(null, body, now)).toBe(25_000);
  });

  it("parses retry_after_ms from JSON body", () => {
    const body = JSON.stringify({
      error: {
        retry_after_ms: 12500,
      },
    });
    expect(parseRetryAfterMs(null, body, now)).toBe(12_500);
  });

  it("parses human duration from error message string", () => {
    const body = "FreeUsageLimitError: rate limit reached, please retry after 20s";
    expect(parseRetryAfterMs(null, body, now)).toBe(20_000);

    const bodyMs = "Please try again in 5000ms";
    expect(parseRetryAfterMs(null, bodyMs, now)).toBe(5000);
  });
});

describe("markEgressCooling and getEgressCooldown", () => {
  it("bounds cooldown between min (1s) and max (900s)", () => {
    const egress = { id: "proxy:test1", confirmed: true };
    // Less than min (1000ms)
    markEgressCooling(egress, 200);
    const cd1 = getEgressCooldown(egress);
    expect(cd1.retryAfterMs).toBeGreaterThanOrEqual(900);
    expect(cd1.retryAfterMs).toBeLessThanOrEqual(1000);

    resetEgressState();
    // Greater than max (24h)
    markEgressCooling(egress, 100_000_000);
    const cd2 = getEgressCooldown(egress);
    expect(cd2.retryAfterMs).toBeGreaterThanOrEqual(86_390_000);
    expect(cd2.retryAfterMs).toBeLessThanOrEqual(86_400_000);
  });

  it("expires cooldown correctly after elapsed time", () => {
    const egress = { id: "proxy:test2", confirmed: true };
    markEgressCooling(egress, 15_000);
    expect(getEgressCooldown(egress)).not.toBeNull();

    // In future beyond cooldown
    const future = Date.now() + 20_000;
    expect(getEgressCooldown(egress, future)).toBeNull();
  });
});

describe("selectAlternateProxy", () => {
  const targetUrl = "https://opencode.ai/inference/v1/chat/completions";

  it("selects non-cooling alternate proxy and excludes current egress", () => {
    const proxyOptions = {
      connectionProxyAlternates: [
        { connectionProxyEnabled: true, connectionProxyUrl: "http://10.0.0.1:8080" },
        { connectionProxyEnabled: true, connectionProxyUrl: "http://10.0.0.2:8080" },
      ],
    };

    const first = selectAlternateProxy(proxyOptions, targetUrl, new Set());
    expect(first.alternate).not.toBeNull();
    const firstEgressId = first.alternate.egress.id;

    // Exclude first
    const second = selectAlternateProxy(proxyOptions, targetUrl, new Set([firstEgressId]));
    expect(second.alternate).not.toBeNull();
    expect(second.alternate.egress.id).not.toBe(firstEgressId);
  });

  it("returns null alternate and earliestCooldownMs when all alternates are cooling", () => {
    const proxyOptions = {
      connectionProxyAlternates: [
        { connectionProxyEnabled: true, connectionProxyUrl: "http://10.0.0.1:8080" },
      ],
    };

    const sel = selectAlternateProxy(proxyOptions, targetUrl, new Set());
    expect(sel.alternate).not.toBeNull();
    markEgressCooling(sel.alternate.egress, 30_000);

    const coolingSel = selectAlternateProxy(proxyOptions, targetUrl, new Set());
    expect(coolingSel.alternate).toBeNull();
    expect(coolingSel.earliestCooldownMs).toBeGreaterThan(0);
  });
});

describe("syntheticRateLimitResponse", () => {
  it("produces 429 response with Retry-After header and FreeUsageLimitError payload", async () => {
    const res = syntheticRateLimitResponse(45_000);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("45");
    const json = await res.json();
    expect(json.type).toBe("error");
    expect(json.error.type).toBe("FreeUsageLimitError");
  });
});

describe("resolveEgress failure resilience", () => {
  it("fails open to unconfirmed direct egress when IP probe fails or is off", async () => {
    const egress = await resolveEgress({
      targetUrl: "https://opencode.ai/inference/v1/chat/completions",
      proxyOptions: null,
      forceProbe: false,
    });
    expect(egress.kind).toBe("direct");
    expect(egress.id).toBe(DIRECT_EGRESS_ID);
  });
});
