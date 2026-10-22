import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const page = readFileSync(
  resolve(root, "src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js"),
  "utf8"
);

// The option table is plain data, so it can be evaluated out of the source exactly as
// written; the picker component around it is JSX and is checked by assertion below.
const options = new Function(
  page.slice(page.indexOf("const LIMIT_KIND_OPTIONS"), page.indexOf("function LimitKindPicker")) +
    "\nreturn LIMIT_KIND_OPTIONS;"
)();

describe("key editor: limit type is a card picker, not a dropdown", () => {
  it("offers all three budgets with their own accent", () => {
    expect(options.map((o) => o.value)).toEqual(["tokens", "cost", "requests"]);
    for (const key of ["tone", "tint", "chip", "border", "glow", "icon", "blurb"]) {
      expect(new Set(options.map((o) => o[key])).size).toBe(3);
    }
  });

  it("names each row by what it measures instead of a bare unit", () => {
    // "Tokens" / "Cost" / "Requests" alone said nothing the icon did not; each name now
    // pairs the unit with the measure it stands for.
    expect(options.map((o) => o.label)).toEqual(["Token volume", "USD spend", "Request count"]);
    for (const opt of options) {
      expect(opt.label.trim()).toContain(" ");
    }
  });

  it("uses an icon per kind, so the choice is not read by text alone", () => {
    expect(options.map((o) => o.icon)).toEqual(["data_usage", "payments", "bolt"]);
  });

  it("carries a sentence per card, not just a name", () => {
    for (const opt of options) {
      expect(opt.blurb.length).toBeGreaterThan(40);
    }
    const openers = options.map((o) => o.blurb.split(" ").slice(0, 4).join(" "));
    expect(new Set(openers).size).toBe(3);
  });

  it("shows no sample value beside the name, only its own field does", () => {
    // The cards name the unit; the number belongs to the field the card reveals.
    for (const opt of options) {
      expect(opt).not.toHaveProperty("example");
    }
    expect(page).not.toMatch(/opt\.example/);
    expect(page).not.toMatch(/100,000 tokens|\$2\.50 per day|1,000 calls/);
  });

  it("stacks the options as full-width rows the 512px editor can hold", () => {
    expect(page).toMatch(/flex w-full items-center gap-3 rounded-\[14px\] border p-3 text-left/);
    expect(page).not.toMatch(/grid grid-cols-1 sm:grid-cols-3/);
  });

  it("renders as a radiogroup whose options carry their own selected state", () => {
    expect(page).toMatch(/role="radiogroup" aria-label="Limit Type"/);
    expect(page).toMatch(/role="radio"/);
    expect(page).toMatch(/aria-checked=\{selected\}/);
  });

  it("paints the selected card, glows it, and shows a filled radio mark", () => {
    expect(page).toMatch(/selected\s*\?\s*`\$\{opt\.tint\} \$\{opt\.border\} \$\{opt\.glow\}`/);
    expect(page).toMatch(/selected \? opt\.tone : "text-text-main"/);
    expect(page).toMatch(/h-2 w-2 rounded-full", selected \? "bg-current" : "bg-transparent"/);
  });

  it("marks the empty radios too, so unselected cards still read as options", () => {
    expect(page).toMatch(/: "border-text-muted\/50 text-transparent"/);
    expect(page).not.toMatch(/border-border text-transparent/);
  });

  it("keeps each card's icon chip coloured while it is unselected", () => {
    expect(page).toMatch(/opt\.chip,\s*opt\.tone,\s*selected \? "opacity-100" : "opacity-70"/);
  });

  it("replaces the dropdown in both modals", () => {
    expect(page).toMatch(/<LimitKindPicker value=\{newKeyLimitKind\} onChange=\{setNewKeyLimitKind\} \/>/);
    expect(page).toMatch(/<LimitKindPicker value=\{editLimitKind\} onChange=\{setEditLimitKind\} \/>/);
    expect(page).not.toMatch(/<Select\s+label="Limit Type"/);
  });
});
