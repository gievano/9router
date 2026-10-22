import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// process.cwd() in a test run is tests/, so anchor on the file instead.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

describe("free-provider catalogue flow", () => {
  const page = read("src/app/(dashboard)/dashboard/providers/[id]/page.js");
  const modelRow = read("src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js");
  const picker = read("src/shared/components/ModelSelectModal.js");
  const registry = read("open-sse/providers/registry/opencode.js");

  it("suggests models to add instead of importing the whole catalogue", () => {
    // He picks what to add from the suggested chip rows: a list that silently
    // imported every published id took that decision away from him.
    expect(page).toContain("Suggested free models (");
    expect(page).toContain("Other models (");
    expect(page).not.toContain("buildUnifiedModelRows");
    expect(existsSync(path.join(ROOT, "src/shared/utils/freeModelRows.js"))).toBe(false);
    // The suggestions and the disabled list are for every provider, so OpenCode
    // Free goes through the same add-me flow as a gated provider.
    expect(page).not.toMatch(/\{\s*!isFreeNoAuth && (suggestedModels|disabledDisplayModels)/);
  });

  it("the provider page lists systemone models too, like the picker does", () => {
    // jev-1.13-free is a System One registry model: the picker always offered it,
    // but the provider page's llm-only filter dropped it, so the two screens
    // showed a different number of free models for the same provider.
    expect(page).toMatch(/return !k \|\| k === "llm" \|\| k === "systemone"/);
  });

  it("adding a chip is an explicit action, not a display row", () => {
    expect(page).toMatch(/onClick=\{async \(\) => \{\s*\n\s*await handleAddCustomModel\(m\.id/);
  });

  it("ModelRow keeps the FREE badge but has no dead disabled/restore props", () => {
    expect(modelRow).toMatch(/isFree && \(/);
    expect(modelRow).not.toContain("isDisabled");
    expect(modelRow).not.toContain("onRestore");
  });

  it("the registry pins the tier flag on its free ids", () => {
    for (const id of ["muse-spark-1.2-contributor-free", "muse-spark-1.3-contributor-free", "union-alpha", "deepseek-v4.1-flash-free", "jev-1.13-free"]) {
      expect(registry).toMatch(new RegExp(`id: "${id}".*isFree: true`));
    }
  });

  it("the picker says how many models it is hiding", () => {
    expect(picker).toMatch(/disabledCountFor/);
    // Declared at component scope: a helper defined inside the groupedModels
    // memo and printed in JSX threw a ReferenceError that blanked the page.
    const helperAt = picker.indexOf("const disabledCountFor");
    const memoAt = picker.indexOf("const groupedModels = useMemo");
    expect(helperAt).toBeGreaterThan(-1);
    expect(memoAt).toBeGreaterThan(-1);
    expect(helperAt).toBeLessThan(memoAt);
  });
});
