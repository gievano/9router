/**
 * Unit tests for the MiMoCode free provider entry.
 *
 * MiMoCode reuses the MiMo free channel (`api.xiaomimimo.com/api/free-ai/*`), so
 * the executor is shared with mimo-free — these tests pin the registry wiring
 * (aliases, noAuth visibility, model table, executor selection) that would
 * otherwise fail silently in the model picker or at request time.
 */

import { describe, it, expect } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { resolveProviderAlias, parseModel } from "../../open-sse/services/model.js";
import { getExecutor } from "../../open-sse/executors/index.js";
import { PROVIDERS } from "../../open-sse/config/providers.js";
import { PROVIDER_MODELS, PROVIDER_ID_TO_ALIAS } from "../../open-sse/config/providerModels.js";
import { FREE_PROVIDERS } from "../../src/shared/constants/providers.js";
import { MimoFreeExecutor } from "../../open-sse/executors/mimo-free.js";

const entry = REGISTRY.find((r) => r.id === "mimocode");

describe("mimocode registry entry", () => {
  it("is registered exactly once", () => {
    expect(entry).toBeDefined();
    expect(REGISTRY.filter((r) => r.id === "mimocode")).toHaveLength(1);
  });

  it("is a visible no-auth free provider", () => {
    expect(entry.category).toBe("free");
    expect(entry.noAuth).toBe(true);
    expect(entry.hasFree).toBe(true);
    expect(entry.hidden).toBeUndefined();
    // noAuth + not hidden is exactly what the model picker keys on.
    expect(FREE_PROVIDERS["mimocode"]?.noAuth).toBe(true);
    expect(FREE_PROVIDERS["mimocode"]?.hidden).toBeUndefined();
  });

  it("points at the MiMo free chat endpoint", () => {
    expect(entry.transport.noAuth).toBe(true);
    expect(PROVIDERS["mimocode"].baseUrl).toBe("https://api.xiaomimimo.com/api/free-ai/openai/chat");
    expect(PROVIDERS["mimocode"].headers["X-Mimo-Source"]).toBe("mimocode-cli-free");
  });

  it("exposes mimo-auto as the only model", () => {
    const models = PROVIDER_MODELS["mimocode"] || [];
    expect(models.map((m) => m.id)).toEqual(["mimo-auto"]);
    expect(models[0].contextLength).toBe(1000000);
  });
});

describe("mimocode alias resolution", () => {
  it("resolves both prefixes from the reference table to the provider", () => {
    expect(resolveProviderAlias("mimocode")).toBe("mimocode");
    expect(resolveProviderAlias("mimocode-free")).toBe("mimocode");
    expect(resolveProviderAlias("mimo-auto")).toBe("mimocode");
  });

  it("parses mimocode/mimo-auto without translation ambiguity", () => {
    expect(parseModel("mimocode/mimo-auto")).toMatchObject({
      provider: "mimocode",
      model: "mimo-auto",
      isAlias: false,
    });
  });

  it("maps provider id to its own alias", () => {
    expect(PROVIDER_ID_TO_ALIAS["mimocode"]).toBe("mimocode");
  });
});

describe("mimocode executor selection", () => {
  it("routes both prefixes through the shared MiMo free executor", () => {
    expect(getExecutor("mimocode")).toBeInstanceOf(MimoFreeExecutor);
    expect(getExecutor("mimocode-free")).toBeInstanceOf(MimoFreeExecutor);
  });

  it("sends the MiMo source header and forces streaming Accept", () => {
    const headers = getExecutor("mimocode").buildHeaders({}, true);
    expect(headers["X-Mimo-Source"]).toBe("mimocode-cli-free");
    expect(headers.Accept).toBe("text/event-stream");
  });

  it("hits the free chat endpoint", () => {
    expect(getExecutor("mimocode").buildUrl()).toBe(
      "https://api.xiaomimimo.com/api/free-ai/openai/chat"
    );
  });
});