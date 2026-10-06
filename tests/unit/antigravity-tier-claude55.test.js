import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const card = readFileSync(
  resolve(root, "src/app/(dashboard)/dashboard/cli-tools/components/AntigravityToolCard.js"),
  "utf8"
);
const registry = readFileSync(
  resolve(root, "open-sse/providers/registry/antigravity.js"),
  "utf8"
);
const cliTools = readFileSync(resolve(root, "src/shared/constants/cliTools.js"), "utf8");
const helper = readFileSync(resolve(root, "src/lib/usage/antigravityTier.js"), "utf8");
const route = readFileSync(resolve(root, "src/app/api/usage/antigravity-tier/route.js"), "utf8");

describe("antigravity catalogue: Claude 5.5 is not offered", () => {
  it("lists no Claude 5.5 model for antigravity", () => {
    expect(registry).not.toContain('id: "claude-opus-5.5');
    expect(registry).not.toContain('id: "claude-sonnet-5-5');
    expect(cliTools).not.toContain("claude-sonnet-5-5");
    expect(cliTools).not.toContain("claude-opus-5.5");
  });

  it("keeps the 4.6 models so existing traffic keeps working", () => {
    expect(registry).toContain('id: "claude-sonnet-4-6"');
    expect(registry).toContain('id: "claude-opus-4-6-thinking"');
  });
});

describe("antigravity tier probe: still answers whether the account can reach 5.5", () => {
  it("recognises every 5.5 spelling", () => {
    expect(card).toContain("const isClaude55");
    for (const id of ["claude-opus-5.5", "claude-sonnet-5-5"]) {
      expect(id).toMatch(/5[-_.]5|5\.5/);
    }
  });

  it("does not flag the 4.6 models", () => {
    const re = /opus[-_.]?5[-_.]?5|sonnet[-_.]?5[-_.]?5/;
    expect(re.test("claude-opus-4-6-thinking")).toBe(false);
    expect(re.test("claude-sonnet-4-6")).toBe(false);
    expect(re.test("claude-opus-5.5")).toBe(true);
  });

  it("paints a row red only when the live probe says the tier is blocked", () => {
    expect(card).toContain("claude55Blocked");
    expect(card).toContain("text-red-500");
    expect(card).toContain("/api/usage/antigravity-tier");
    expect(card).toContain("t.canUseClaude55 === false");
  });

  it("treats a failed probe as blocked rather than claiming access", () => {
    expect(helper).toContain("canUseClaude55: false");
    expect(route).toContain("canUseClaude55: false");
  });

  it("derives access from the live catalog, not the tier id alone", () => {
    expect(helper).toContain("fetchAvailableModels");
    expect(helper).toContain("catalogHasClaude55");
    expect(helper).toMatch(/canUseClaude55\s*=\s*catalogHasClaude55\s*\|\|/);
  });

  it("caches the probe so the card does not hit Google on every render", () => {
    expect(helper).toContain("CACHE_TTL_MS");
    expect(route).toContain('"Cache-Control": "no-store"');
  });
});