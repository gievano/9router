import { describe, expect, it } from "vitest";

import { aggregateComboCapabilities, getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";

// Resolving a combo's members needs the synced model catalog, which is server-only (it
// reads a file), so the browser bundle falls back to the generic patterns. The dashboard
// computed its badges there and under-reported: /v1/models and pi-settings (both
// server-side) said 1M while the badge said 200k.
//
// resolveCaps lets a caller hand in the server's answer. It must only override what it
// carries - the local tables still own tools/pdf/audio/video/thinking*.
//
// Window rule in this fork: a combo fails over between models instead of splitting one
// conversation across them, so it reports the WIDEST window its members offer. Taking the
// minimum made a client compact a 1M model down to 256k for no reason. The upstream tests
// this file started from asserted the conservative minimum; the assertions below follow
// the fork instead, and say so where the two disagree.
const GLM53_FED = { vision: true, search: false, reasoning: true, contextWindow: 1_000_000, maxOutput: 131_072 };

describe("aggregateComboCapabilities: resolveCaps override", () => {
  const models = ["glm-cn/glm-5.3", "deepseek-v4.1-flash"];

  it("uses the widest pattern window without a resolver", () => {
    const caps = aggregateComboCapabilities(models);
    const windows = models.map((id) => {
      const slash = id.indexOf("/");
      return getCapabilitiesForModel(slash === -1 ? null : id.slice(0, slash), id.slice(slash + 1)).contextWindow;
    });
    expect(caps.contextWindow).toBe(Math.max(...windows));
  });

  it("uses the fed limits when a resolver supplies them", () => {
    const resolver = (fullId) => (fullId === "glm-cn/glm-5.3" ? GLM53_FED : null);
    const caps = aggregateComboCapabilities(models, null, resolver);
    expect(caps.contextWindow).toBe(1_000_000);
  });

  it("keeps the fields the override does not carry", () => {
    const plain = aggregateComboCapabilities(models);
    const fed = aggregateComboCapabilities(models, null, (id) => (id === "glm-cn/glm-5.3" ? GLM53_FED : null));
    // The override carries no tools/pdf/thinking fields, so those must be unchanged.
    for (const field of ["tools", "pdf", "audioInput", "videoInput", "imageOutput", "audioOutput", "thinkingFormat"]) {
      expect(fed[field]).toEqual(plain[field]);
    }
  });

  it("lets a smaller fed window for one member pull the aggregate down only when it is the widest left", () => {
    // glm-5.3 is fed 64k, but deepseek-v4.1-flash still resolves to 1M, and the combo may
    // use whichever member is widest. Feeding a smaller value must not be ignored, though:
    // apply it to every member and the aggregate follows.
    const oneSmaller = aggregateComboCapabilities(
      models,
      null,
      (id) => (id === "glm-cn/glm-5.3" ? { ...GLM53_FED, contextWindow: 64_000 } : null)
    );
    expect(oneSmaller.contextWindow).toBe(1_000_000);

    const bothSmaller = aggregateComboCapabilities(
      models,
      null,
      (id) => ({ contextWindow: id === "glm-cn/glm-5.3" ? 64_000 : 96_000 })
    );
    expect(bothSmaller.contextWindow).toBe(96_000);
    expect(oneSmaller.maxOutput).toBe(384_000); // max across members, from deepseek
  });

  it("passes the resolver into nested combos", () => {
    const lookup = {
      zap: ["deepseek-v4.1-flash", "glm-cn/glm-5.3-flash"],
      "deepseek-v4.1-flash": ["cmc/deepseek/deepseek-v4.1-flash", "ocg/deepseek-v4.1-flash"],
    };
    const seen = [];
    const resolver = (fullId) => { seen.push(fullId); return fullId === "glm-cn/glm-5.3-flash" ? { contextWindow: 1_000_000 } : null; };
    aggregateComboCapabilities(lookup.zap, lookup, resolver);
    // The nested combo's own members were resolved with the same resolver.
    expect(seen).toContain("cmc/deepseek/deepseek-v4.1-flash");
    expect(seen).toContain("ocg/deepseek-v4.1-flash");
  });

  it("leaves the plain two-argument call unchanged", () => {
    const caps = aggregateComboCapabilities(["kimi/kimi-k3"], null);
    expect(caps).toEqual(aggregateComboCapabilities(["kimi/kimi-k3"]));
    expect(caps.contextWindow).toBe(getCapabilitiesForModel("kimi", "kimi-k3").contextWindow);
  });

  it("claude-haiku-5-5 combo: the alias resolver can only widen the window", () => {
    // ocg/claude-haiku-5-5 falls to the global *claude*haiku* pattern (200k) while
    // cmc/claude-haiku-5-5 has a 1M table entry, so the combo already reports 1M under the
    // widest-member rule. The server's alias resolver keeps it at 1M; it must never report
    // less than the widest seat.
    const seats = ["ocg/claude-haiku-5-5", "cmc/claude-haiku-5-5"];
    const seatCaps = (fullId) => {
      const slash = fullId.indexOf("/");
      if (slash <= 0) return null;
      const providerId = { ocg: "opencode-go", cmc: "commandcode" }[fullId.slice(0, slash)] || fullId.slice(0, slash);
      return getCapabilitiesForModel(providerId, fullId.slice(slash + 1));
    };
    expect(aggregateComboCapabilities(seats).contextWindow).toBe(1_000_000);
    expect(aggregateComboCapabilities(seats, null, seatCaps).contextWindow).toBe(1_000_000);
  });
});
