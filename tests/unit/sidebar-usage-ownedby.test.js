import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

describe("security log entry is visible to the administrator", () => {
  it("keeps password sessions and refuses key sessions", () => {
    const sidebar = read("src/shared/components/Sidebar.js");
    // The filter previously answered false for everyone before it ever looked
    // at the role, hiding the log from the one session allowed to read it.
    expect(sidebar).toContain('if (item.href === "/dashboard/security-log") return !isApiKeyUser;');
    expect(sidebar).not.toContain('if (item.href === "/dashboard/security-log") return false;');
  });
});

describe("usage empty state", () => {
  it("has no Get an API key call to action in Recent Requests", () => {
    const usage = read("src/shared/components/UsageStats.js");
    expect(usage).not.toContain("Get an API key");
    expect(usage).toContain("No requests yet.");
  });
});

describe("custom model owned_by", () => {
  it("the modal collects an optional owned by label", () => {
    const modal = read("src/app/(dashboard)/dashboard/providers/[id]/AddCustomModelModal.js");
    expect(modal).toContain("setOwnedBy");
    expect(modal).toContain("ownedBy.trim()");
    expect(modal).toContain("(optional)");
  });

  it("the label travels from the modal to the API", () => {
    const page = read("src/app/(dashboard)/dashboard/providers/[id]/page.js");
    expect(page).toContain("...(ownedBy ? { ownedBy } : {})");
    const route = read("src/app/api/models/custom/route.js");
    expect(route).toContain("ownedBy: typeof ownedBy === \"string\" ? ownedBy.trim() : \"\"");
    const repo = read("src/lib/db/repos/aliasRepo.js");
    expect(repo).toContain("ownedBy");
  });

  it("the model list publishes it, defaulting to the provider alias", () => {
    const v1 = read("src/app/api/v1/models/route.js");
    expect(v1).toContain("owned_by: customModel.ownedBy || providerAlias,");
    // The connected path merges custom ids and must publish the label there too.
    expect(v1).toContain("owned_by: customOwnedByById.get(modelId) || outputAlias,");
  });
});
