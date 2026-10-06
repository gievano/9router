import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const server = readFileSync(resolve(root, "custom-server.js"), "utf8");

// Reproduces the finding that made a viewUsage-only key capable of listing and
// deleting every key: a crafted Cookie header made decodeURIComponent throw in
// toGuardRequest, and runAuthGuard answered that throw by returning "not
// handled", so the wrapper handed the request to Next with no auth at all.
describe("custom-server auth guard fails closed", () => {
  it("never lets decodeURIComponent throw out of cookie parsing", () => {
    expect(server).toMatch(/decodeURIComponent\([\s\S]{0,200}catch\s*\{/);
    expect(server).not.toMatch(/return m \? \{ name, value: decodeURIComponent\(m\[1\]\) \} : undefined;/);
  });

  it("answers 503 instead of passing through when the guard cannot load", () => {
    const loadBlock = server.slice(
      server.indexOf("if (!guard) {"),
      server.indexOf("if (!guard) {") + 500
    );
    expect(loadBlock).toContain("denyUnresolved(req, res)");
    expect(loadBlock).not.toContain("return false;");
  });

  it("answers 503 instead of passing through when the guard throws", () => {
    const throwBlock = server.slice(
      server.indexOf("response = await guard.proxy"),
      server.indexOf("response = await guard.proxy") + 400
    );
    expect(throwBlock).toContain("denyUnresolved(req, res)");
  });

  it("answers 503 instead of forwarding when the wrapper promise rejects", () => {
    const wrapperCatch = server.slice(server.indexOf('".catch((error) => {'), -1);
    const tail = server.slice(server.indexOf(".catch((error) => {"));
    expect(tail).toContain("denyUnresolved(req, res)");
    expect(wrapperCatch).toBeDefined();
  });

  it("resolves 503 as HTML for pages and JSON for API", () => {
    expect(server).toContain("wantsHtml");
    expect(server).toContain("Authorization check unavailable");
  });
});