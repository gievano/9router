/**
 * PRD Builder contracts.
 *
 * Pure logic lives in prd_model.js precisely so this suite can pin it without
 * a JSX runtime — vitest here has no JSX transform. The component contracts
 * are enforced structurally, like the usage charts suite does.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SECTIONS,
  QUESTIONS,
  STORAGE_KEY,
  loadDraft,
  saveDraft,
  buildMarkdown,
  countDone,
  splitModel,
} from "../../src/app/(dashboard)/dashboard/prd-builder/prd_model.js";

const here = dirname(fileURLToPath(import.meta.url));
const builderDir = resolve(here, "../../src/app/(dashboard)/dashboard/prd-builder");
const component = readFileSync(resolve(builderDir, "PrdBuilderClient.js"), "utf-8");
const modelSrc = readFileSync(resolve(builderDir, "prd_model.js"), "utf-8");

function fakeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
}

describe("schema", () => {
  it("defines six sections, each with a distinct prompt", () => {
    expect(SECTIONS).toHaveLength(6);
    expect(SECTIONS.map((s) => s.id)).toEqual(["background", "goals", "users", "features", "nonGoals", "criteria"]);
    expect(new Set(SECTIONS.map((s) => s.prompt)).size).toBe(6);
  });

  it("asks every question the PRD flow needs", () => {
    const ids = QUESTIONS.map((q) => q.id);
    for (const id of ["feature", "problem", "mustHave", "nonGoals", "constraints", "done"]) {
      expect(ids).toContain(id);
    }
  });

  it("keeps the storage key stable across sessions", () => {
    expect(STORAGE_KEY).toBe("prd-builder-draft-v1");
  });

  it("carries no non-Latin script in copy", () => {
    // The build once shipped Chinese/Japanese glyphs into labels. Copy is
    // Indonesian plus code — anything else is a paste accident.
    // eslint-disable-next-line no-control-regex
    expect(modelSrc).not.toMatch(/[一-鿿ﭐ-﷿]/);
  });
});

describe("loadDraft / saveDraft", () => {
  it("returns null when nothing is stored", () => {
    expect(loadDraft(fakeStorage())).toBeNull();
  });

  it("round-trips model, answers, and sections", () => {
    const storage = fakeStorage();
    expect(
      saveDraft(storage, {
        model: "opencode/spark",
        answers: { feature: "x" },
        sections: { background: "y" },
      }),
    ).toBe(true);
    const got = loadDraft(storage);
    expect(got.model).toBe("opencode/spark");
    expect(got.answers).toEqual({ feature: "x" });
    expect(got.sections).toEqual({ background: "y" });
    expect(typeof got.updatedAt).toBe("string");
  });

  it("normalizes a corrupt payload instead of throwing", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{"oops":' });
    expect(loadDraft(storage)).toBeNull();
    const storage2 = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ model: 7, answers: ["x"], sections: null }) });
    expect(loadDraft(storage2)).toEqual({ model: "", answers: {}, sections: {}, updatedAt: null });
  });

  it("reports failure instead of throwing when storage is unusable", () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error("denied"); } };
    expect(saveDraft(broken, { model: "m", answers: {}, sections: {} })).toBe(false);
  });

  it("ignores a missing storage object", () => {
    expect(loadDraft(null)).toBeNull();
    expect(saveDraft(null, {})).toBe(false);
  });
});

describe("buildMarkdown", () => {
  it("assembles all six sections with the chosen model stamped", () => {
    const md = buildMarkdown("opencode/spark", { feature: "Notif Telegram" }, { goals: "- cepat" });
    expect(md).toContain("# Notif Telegram");
    expect(md).toContain("`opencode/spark`");
    for (const s of SECTIONS) expect(md).toContain(`## ${s.prompt}`);
    expect(md).toContain("- cepat");
  });

  it("marks skipped sections explicitly instead of dropping them", () => {
    const md = buildMarkdown("m", { feature: "F" }, {});
    expect(md.match(/_Bagian ini dilewati\._/g)).toHaveLength(6);
  });

  it("falls back to a title and model placeholder for an empty draft", () => {
    const md = buildMarkdown("", {}, {});
    expect(md).toContain("# PRD");
    expect(md).toContain("tidak ditentukan");
  });

  it("appends the raw answers once, without empty ones", () => {
    const md = buildMarkdown("m", { feature: "F", constraints: "  ", done: "besok" }, {});
    expect(md).toContain("## Jawaban Mentah");
    expect(md).toContain("besok");
    expect(md).not.toContain("constraints");
  });

  it("ends with a draft status line", () => {
    expect(buildMarkdown("m", {}, {}).trimEnd().endsWith("Status: Draft")).toBe(true);
  });
});

describe("countDone / splitModel", () => {
  it("counts only sections with real text", () => {
    expect(countDone({})).toBe(0);
    expect(countDone({ background: "  ", goals: "ok" })).toBe(1);
    expect(countDone({ background: "a", goals: "b", users: "c", features: "d", nonGoals: "e", criteria: "f" })).toBe(6);
  });

  it("splits provider/model and refuses to guess without a slash", () => {
    expect(splitModel("opencode/glm-4.7-free")).toEqual({ provider: "opencode", model: "glm-4.7-free" });
    expect(splitModel("mimo-auto")).toEqual({ provider: null, model: "mimo-auto" });
    expect(splitModel("")).toEqual({ provider: null, model: "" });
  });
});

describe("component contracts", () => {
  it("calls the gateway like any other client, through the shared streamer", () => {
    expect(component).toContain("streamChatCompletion");
    expect(component).toContain("from \"@/shared/utils/chatStream\"");
    expect(component).not.toContain("/api/prd-builder/generate");
  });

  it("goes through ModelSelectModal for the writer model", () => {
    expect(component).toContain("ModelSelectModal");
    expect(component).toContain("activeProviders={activeProviders}");
  });

  it("generates sequentially and streams deltas into the card", () => {
    expect(component).toContain("no-await-in-loop");
    expect(component).toContain("onDelta");
    expect(component).toContain("AbortController");
  });

  it("advertises regenerate per section and a global stop", () => {
    expect(component).toContain("Regenerate");
    expect(component).toContain("stopAll");
  });

  it("persists only in the browser, never to the server", () => {
    expect(component).toContain("localStorage");
    expect(component).not.toContain("fetch(\"/api/prd-builder");
  });

  it("carries no non-Latin script in its own copy", () => {
    // eslint-disable-next-line no-control-regex
    expect(component).not.toMatch(/[一-鿿ﭐ-﷿]/);
  });
});