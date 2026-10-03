/**
 * One MiMo free channel, one registry entry.
 *
 * Xiaomi's free MiMo service has one anonymous endpoint, and 9router now
 * serves it as `mimocode`. Two entries pointing at it (`mimo-free`/mmf plus
 * `mimocode`) published the same mimo-auto model twice and put a near-duplicate
 * label ("MiMo Code Free" beside "MiMoCode Free") in the usage provider
 * dropdown, which reads ids straight out of AI_PROVIDERS.
 *
 * These tests pin the retirement: the retired id has no registry entry, its
 * model is published once, and the surviving entry still answers for the old
 * spellings so existing clients keep working.
 */

import { describe, it, expect } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDER_MODELS } from "../../open-sse/config/providerModels.js";
import { PROVIDER_MODELS as SHARED_MODELS } from "../../open-sse/providers/index.js";
import { AI_PROVIDERS } from "../../src/shared/constants/providers.js";
import { getExecutor } from "../../open-sse/executors/index.js";
import { MimoFreeExecutor } from "../../open-sse/executors/mimo-free.js";

describe("mimo free channel has a single registry entry", () => {
  it("mimocode is registered exactly once", () => {
    expect(REGISTRY.filter((r) => r.id === "mimocode")).toHaveLength(1);
  });

  it("the retired mimo-free entry is gone from the registry", () => {
    expect(REGISTRY.filter((r) => r.id === "mimo-free")).toHaveLength(0);
  });

  it("no registry entry publishes mimo-auto under the retired mmf alias", () => {
    expect(PROVIDER_MODELS.mmf).toBeUndefined();
    expect(SHARED_MODELS.mmf).toBeUndefined();
  });

  it("mimo-auto is published once, under mimocode", () => {
    const publishers = Object.entries(SHARED_MODELS)
      .filter(([, models]) => models.some((m) => m.id === "mimo-auto"))
      .map(([alias]) => alias);
    expect(publishers).toEqual(["mimocode"]);
  });

  it("only one MiMo free label reaches the usage provider list", () => {
    const labels = Object.values(AI_PROVIDERS)
      .map((p) => p.name)
      .filter((name) => typeof name === "string" && /MiMo.*Free/i.test(name));
    expect(labels).toEqual(["MiMoCode Free"]);
  });
});

describe("retired ids still route to the free channel", () => {
  for (const id of ["mimocode", "mimocode-free", "mmf", "mimo-free"]) {
    it(`${id} uses the MiMo free executor`, () => {
      expect(getExecutor(id)).toBeInstanceOf(MimoFreeExecutor);
    });
  }

  it("the executor points at the MiMo free chat endpoint", () => {
    expect(getExecutor("mimocode").buildUrl())
      .toBe("https://api.xiaomimimo.com/api/free-ai/openai/chat");
  });
});