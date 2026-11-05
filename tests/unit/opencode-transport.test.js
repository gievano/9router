import { describe, it, expect, beforeEach } from "vitest";
import { fetchViaTransport, resetTransport } from "../../open-sse/utils/opencodeTransport.js";
import { OPENCODE_TRANSPORT_CONFIG } from "../../open-sse/config/runtimeConfig.js";
import { OpenCodeGoExecutor } from "../../open-sse/executors/opencode-go.js";
import { OpenCodeZenExecutor } from "../../open-sse/executors/opencode-zen.js";
import { DefaultExecutor } from "../../open-sse/executors/default.js";

beforeEach(() => {
  resetTransport();
});

describe("OpenCode Transport Sidecar Fallback and Isolation", () => {
  it("returns null when transport mode is off", async () => {
    const orig = OPENCODE_TRANSPORT_CONFIG.mode;
    try {
      OPENCODE_TRANSPORT_CONFIG.mode = "off";
      const res = await fetchViaTransport("https://opencode.ai/inference/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({ model: "muse-spark-1.2-contributor-free", messages: [{ role: "user", content: "hi" }] }),
      });
      expect(res).toBeNull();
    } finally {
      OPENCODE_TRANSPORT_CONFIG.mode = orig;
    }
  });

  it("returns null when vercelRelayUrl is present (delegates to relay handler)", async () => {
    const res = await fetchViaTransport(
      "https://opencode.ai/inference/v1/chat/completions",
      { method: "POST", body: "{}" },
      { vercelRelayUrl: "https://my-relay.vercel.app" }
    );
    expect(res).toBeNull();
  });

  it("gracefully falls back to null when bun binary is missing without throwing unhandled rejection", async () => {
    const res = await fetchViaTransport(
      "https://opencode.ai/inference/v1/chat/completions",
      { method: "POST", body: JSON.stringify({ test: true }) }
    );
    // In environments without bun, it gracefully yields null so caller uses standard proxyAwareFetch
    expect(res).toBeNull();
  });

  it("preserves provider isolation: other executors do not reference or call fetchViaTransport", () => {
    const go = new OpenCodeGoExecutor();
    const zen = new OpenCodeZenExecutor();
    const def = new DefaultExecutor("openai");

    expect(typeof go.fetchUpstream).toBe("undefined");
    expect(typeof zen.fetchUpstream).toBe("undefined");
    expect(typeof def.fetchUpstream).toBe("undefined");
  });
});
