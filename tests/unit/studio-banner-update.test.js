import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const v1models = readFileSync(resolve(root, "src/app/api/v1/models/route.js"), "utf8");
const repo = readFileSync(resolve(root, "src/lib/db/repos/modelEditorRepo.js"), "utf8");
const editorRoute = readFileSync(resolve(root, "src/app/api/model-editor/route.js"), "utf8");
const editorPage = readFileSync(
  resolve(root, "src/app/(dashboard)/dashboard/model-editor/page.js"),
  "utf8"
);
const registry = readFileSync(
  resolve(root, "open-sse/providers/registry/antigravity.js"),
  "utf8"
);

describe("studio catalogue: no trace of the upstream model", () => {
  it("stops publishing resolved_model", () => {
    expect(v1models).not.toContain("resolved_model:");
    // the only remaining mention of the target is a code comment explaining why
    // the catalogue must NOT name it — no entry, key, or rendered field may
    expect(v1models).toContain("but the catalogue must not name that target");
    const codeLines = v1models
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"));
    expect(codeLines.join("\n")).not.toContain("studio.targetModel");
  });

  it("stops publishing the fixed model-studio tell", () => {
    expect(v1models).not.toMatch(/owned_by:\s*"model-studio"/);
    expect(v1models).toContain("owned_by: studio.ownedBy || studio.callName");
  });

  it("still routes to the real target, which is never rendered into the listing", () => {
    expect(v1models).toContain("getCapabilitiesForModel(studio.provider, studio.model)");
  });
});

describe("studio owned_by: free-form label, defaulting to the callable name", () => {
  it("survives the record shape and the create/update path", () => {
    expect(repo).toContain('ownedBy: (typeof value.ownedBy === "string"');
    expect(repo).toMatch(/ownedBy: \(ownedBy \|\| ""\)\.trim\(\)/);
    const ownedByInRoute = (editorRoute.match(/ownedBy: body\.ownedBy/g) || []).length;
    expect(ownedByInRoute).toBeGreaterThanOrEqual(2);
  });

  it("the editor exposes ownedBy as a text field, not derived text", () => {
    expect(editorPage).toContain("const [ownedBy");
    expect(editorPage).toContain("ownedBy: ownedBy.trim()");
    expect(editorPage).toMatch(/Owned by/);
    expect(editorPage).toMatch(/Defaults to "/);
    expect(editorPage).not.toMatch(/ownedBy.*=.*targetModel/);
  });
});

describe("banner: cancel, background, and shared look", () => {
  const banner = readFileSync(
    resolve(root, "src/shared/components/LongTaskBanner.js"),
    "utf8"
  );
  const loading = readFileSync(resolve(root, "src/shared/components/Loading.js"), "utf8");
  const layout = readFileSync(
    resolve(root, "src/shared/components/layouts/DashboardLayout.js"),
    "utf8"
  );
  const store = readFileSync(resolve(root, "src/store/taskStore.js"), "utf8");
  const dock = readFileSync(resolve(root, "src/shared/components/TaskDock.js"), "utf8");
  const pools = readFileSync(
    resolve(root, "src/app/(dashboard)/dashboard/proxy-pools/page.js"),
    "utf8"
  );

  it("LongTaskBanner offers cancel (with Escape) and run-in-background", () => {
    expect(banner).toContain("onCancel");
    expect(banner).toContain("onBackground");
    expect(banner).toMatch(/e\.key === "Escape"/);
    expect(banner).toMatch(/chipOnly/);
    // panel styling is framed and theme-aware, not a plain spinner
    expect(banner).toContain("rounded-2xl");
    expect(banner).toContain("bg-surface");
  });

  it("ProgressCard and CenterLoading delegate and accept onCancel", () => {
    expect(loading).toContain("LongTaskBanner");
    expect(loading).toContain("onCancel");
  });

  it("the dock is mounted once in the dashboard layout and reads the store", () => {
    expect(layout).toContain("<TaskDock />");
    expect(dock).toContain("useTaskStore");
    expect(store).toMatch(/start\(task\)/);
    expect(store).toMatch(/cancel\(id\)/);
  });

  it("the proxy import runs store-driven under an abort controller", () => {
    expect(pools).toContain("PROXY_IMPORT_TASK");
    expect(pools).toContain("AbortController");
    expect(pools).toContain("signal: abort.signal");
    expect(pools).toContain('"AbortError"');
    expect(pools).not.toContain("importProgress");
  });
});

describe("update check: the remote release honours the lookup TTL", () => {
  const check = readFileSync(resolve(root, "src/lib/updateCheck.js"), "utf8");

  it("expires the cached release instead of keeping it for the process lifetime", () => {
    expect(check).toContain("remoteReleaseAt");
    expect(check).toContain("CHECK_TTL_MS");
    // a failed fetch no longer pins the previous answer either
    expect(check).toContain("cache.remoteReleaseAt = 0");
  });
});