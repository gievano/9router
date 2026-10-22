import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");

// The route reads settings from SQLite and redirects based on request cookies, so
// there is nothing static to render. Without this export `next build` prerenders
// it, which turns the build into a database writer racing the other prerender
// workers - "SqliteError: database is locked" surfaced as a failed export and
// killed the build intermittently, including in CI.
describe("SAML start route: never prerendered at build time", () => {
  const route = readFileSync(resolve(root, "src/app/api/auth/saml/start/route.js"), "utf8");

  it("declares force-dynamic", () => {
    expect(route).toContain('export const dynamic = "force-dynamic";');
  });

  it("keeps the cookie-driven redirect behaviour", () => {
    expect(route).toContain("cookieStore.set(\"saml_state\", requestId");
    expect(route).toContain("NextResponse.redirect(authorizeUrl)");
  });
});
