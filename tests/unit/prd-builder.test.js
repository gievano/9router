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

import { STORAGE_KEY, buildPrompt, loadDraft, saveDraft } from "../../src/app/(dashboard)/dashboard/prd-builder/prd_model.js";

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

describe("buildPrompt", () => {
  it("asks for a complete PRD in one pass", () => {
    const prompt = buildPrompt("build a usage alerting service");
    expect(prompt).toContain("complete PRD");
    expect(prompt).toContain("in one pass");
    expect(prompt).toContain("build a usage alerting service");
  });

  it("prescribes every section, in order", () => {
    const prompt = buildPrompt("x");
    const sections = [
      "1. Overview",
      "2. Problem & background",
      "3. Goals",
      "4. Users",
      "5. Features",
      "6. Non-goals",
      "7. Technical constraints",
      "8. Success criteria",
      "9. Risks & open questions",
    ];
    let cursor = -1;
    for (const heading of sections) {
      const at = prompt.indexOf(heading);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("follows the user's language instead of pinning a locale", () => {
    expect(buildPrompt("x")).toContain("same language as the user's request");
    // The dashboard copy itself must stay English: the rest of the app is.
    expect(modelSrc).not.toMatch(/[a-zA-Z]nya\b/);
  });

  it("sends gaps to open questions rather than inventing requirements", () => {
    const prompt = buildPrompt("x");
    expect(prompt).toContain("instead of guessing");
    expect(prompt).toContain("open question in section 9");
    expect(prompt).toContain("Do not invent requirements");
  });

  it("never emits an empty request", () => {
    expect(buildPrompt("   ")).toContain("(no request given)");
  });
});

describe("loadDraft / saveDraft", () => {
  it("returns null when nothing is stored", () => {
    expect(loadDraft(fakeStorage())).toBeNull();
  });

  it("round-trips model, prompt, and document", () => {
    const storage = fakeStorage();
    expect(
      saveDraft(storage, {
        model: "opencode/spark",
        prompt: "an alerting bot",
        document: "# PRD",
      }),
    ).toBe(true);
    const got = loadDraft(storage);
    expect(got.model).toBe("opencode/spark");
    expect(got.prompt).toBe("an alerting bot");
    expect(got.document).toBe("# PRD");
    expect(typeof got.updatedAt).toBe("string");
  });

  it("normalises a corrupt payload instead of throwing", () => {
    expect(loadDraft(fakeStorage({ [STORAGE_KEY]: '{"oops:' }))).toBeNull();
    const bad = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ model: 7, prompt: ["a"], document: null }) });
    expect(loadDraft(bad)).toEqual({ model: "", prompt: "", document: "", updatedAt: null });
  });

  it("drops the old section-by-section draft shape", () => {
    // v1 stored { answers, sections }; nothing there is still usable.
    const old = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ model: "m", answers: { feature: "x" }, sections: { background: "y" } }),
    });
    expect(loadDraft(old)).toEqual({ model: "m", prompt: "", document: "", updatedAt: null });
  });

  it("reports failure instead of throwing when storage is unusable", () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error("denied"); } };
    expect(saveDraft(broken, { model: "m" })).toBe(false);
    expect(saveDraft(null, {})).toBe(false);
    expect(loadDraft(null)).toBeNull();
  });
});

describe("model names are accepted verbatim", () => {
  it("does not require a provider/ prefix, so combos stay selectable", () => {
    // The gateway resolves bare names ("mine", a combo; "mimo-auto") itself.
    // An earlier gate split on "/" and rejected every combo.
    expect(component).not.toContain("splitModel");
    expect(component).toContain('if (!String(model || "").trim())');
  });
});

describe("component contracts", () => {
  it("calls the gateway like any other client, through the shared streamer", () => {
    expect(component).toContain("streamChatCompletion");
    expect(component).toContain('from "@/shared/utils/chatStream"');
    expect(component).not.toContain("/api/prd-builder/generate");
  });

  it("goes through ModelSelectModal for the writer model", () => {
    expect(component).toContain("ModelSelectModal");
    expect(component).toContain("activeProviders={activeProviders}");
  });

  it("is one prompt in, one document out — no wizard left", () => {
    // The six-question wizard asked the user to structure the PRD by hand.
    expect(component).not.toContain("QUESTIONS");
    expect(component).not.toContain("SECTIONS");
    expect(component.match(/await streamChatCompletion\(/g)).toHaveLength(1);
  });

  it("streams into a single editable document and can be stopped", () => {
    expect(component).toContain("onDelta");
    expect(component).toContain("AbortController");
    expect(component).toContain("Stop");
  });

  it("keeps its copy in English like the rest of the dashboard", () => {
    for (const label of ["Select model", "Generate PRD", "Copy Markdown", "Download .md", "Clear draft"]) {
      expect(component).toContain(label);
    }
    // eslint-disable-next-line no-control-regex
    expect(component).not.toMatch(/[一-鿿ﭐ-﷿]/);
    expect(component).not.toContain("Buat PRD");
    expect(component).not.toContain("Hapus draft");
  });

  it("persists only in the browser, never to the server", () => {
    expect(component).toContain("localStorage");
    expect(component).not.toContain('fetch("/api/prd-builder');
  });
});