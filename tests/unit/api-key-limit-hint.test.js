import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const page = readFileSync(
  resolve(root, "src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js"),
  "utf8"
);

// Sliced rather than imported: the page is a JSX client component, so the helper is
// pulled out of the source the same way the changelog tests reach into the modal.
const slice = page.slice(
  page.indexOf("function limitHint"),
  page.indexOf("function limitPlaceholder")
);
const limitHint = new Function(slice + "\nreturn limitHint;")();

describe("key editor: each limit kind explains itself, not the shared boilerplate", () => {
  it("says tokens add up and a long conversation costs more", () => {
    expect(limitHint("tokens")).toMatch(/prompt and completion tokens/);
    expect(limitHint("tokens")).toMatch(/long conversation costs more/);
  });

  it("says requests count calls, not size", () => {
    expect(limitHint("requests")).toMatch(/Counts calls, not size/);
    expect(limitHint("requests")).toMatch(/one call is one request/);
    expect(limitHint("requests")).toMatch(/huge prompt counts the same as a tiny one/);
  });

  it("says cost is money priced per model, not volume", () => {
    expect(limitHint("cost")).toMatch(/in USD/);
    expect(limitHint("cost")).toMatch(/expensive model/);
    expect(limitHint("cost")).toMatch(/00:00 UTC/);
  });

  it("does not read like the same paragraph three times", () => {
    const hints = ["tokens", "cost", "requests"].map((k) => limitHint(k));
    expect(new Set(hints).size).toBe(3);

    // The opening sentence is what a reader actually compares, so it must differ.
    const openings = hints.map((h) => h.split(". ")[0]);
    expect(new Set(openings).size).toBe(3);
    expect(openings.some((o) => o.startsWith("Counted"))).toBe(false);
  });

  it("keeps one sentence in common: zero means unlimited", () => {
    for (const kind of ["tokens", "cost", "requests"]) {
      expect(limitHint(kind)).toMatch(/0 = unlimited/);
    }
  });

  it("names the creator's ceiling on the token kind only", () => {
    expect(limitHint("tokens", 88000000)).toContain("88,000,000 tokens");
    expect(limitHint("cost", 88000000)).not.toMatch(/maximum is/);
    expect(limitHint("requests", 88000000)).not.toMatch(/maximum is/);
  });

  it("is what both modals render, and the generic line is gone", () => {
    expect(page).toMatch(/hint=\{limitHint\(newKeyLimitKind, creatorTokenLimit\)\}/);
    expect(page).toMatch(/hint=\{limitHint\(editLimitKind, creatorTokenLimit\)\}/);
    expect(page).not.toContain("0 or leave empty for unlimited");
    expect(page).not.toContain("(0: unlimited)");
  });
});
