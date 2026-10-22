import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const modal = readFileSync(resolve(root, "src/shared/components/Modal.js"), "utf8");

describe("Modal: the panel owns the height budget", () => {
  it("caps the panel and lays it out as a column", () => {
    expect(modal).toMatch(/flex max-h-\[85vh\] flex-col/);
  });

  it("lets the body shrink and scroll instead of sizing it with a calc", () => {
    expect(modal).toMatch(/min-h-0 flex-1 overflow-y-auto custom-scrollbar/);
    expect(modal).not.toMatch(/max-h-\[calc\(85vh-100px\)\]/);
  });

  it("keeps the footer from being squeezed out", () => {
    expect(modal).toMatch(/flex shrink-0 items-center justify-end gap-3/);
  });
});
