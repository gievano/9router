// A long run reports through the bell: the task store carries it, the bell renders it, and
// the row survives the page that started it. Rendering a second progress card inside the
// dialog duplicated the same run as a wide bar pinned over the form - it pushed the fields
// it covered, it read as a floating box that belonged to no page in particular, and it told
// the operator nothing the bell did not already say. Every one of these modals already
// pushes its progress into the store, so the inline copy was pure duplication.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// vitest runs with the tests/ package as cwd, so anchor on this file instead.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const MODALS = [
  "src/shared/components/DownloadBackupModal.js",
  "src/app/(dashboard)/dashboard/providers/[id]/BulkImportGrokCliModal.js",
  "src/app/(dashboard)/dashboard/providers/[id]/BulkImportCodexModal.js",
  "src/app/(dashboard)/dashboard/providers/[id]/AddApiKeyModal.js",
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("long runs live in the bell, not in the dialog", () => {
  it("no modal renders an inline progress card", () => {
    for (const rel of MODALS) {
      const src = read(rel);
      expect(src, `${rel} should not render ProgressCard`).not.toMatch(/<ProgressCard\b/);
      expect(src, `${rel} should not import ProgressCard`).not.toMatch(/import[^\n]*ProgressCard/);
    }
  });

  it("every modal still reports its run to the task store", () => {
    // The backup dialog delegates to the profile page, which mirrors its `busy` state into
    // the store; the import/add dialogs own their loops and report directly.
    const DRIVERS = {
      "src/shared/components/DownloadBackupModal.js": "src/app/(dashboard)/dashboard/profile/page.js",
    };
    for (const rel of MODALS) {
      const src = read(DRIVERS[rel] || rel);
      expect(src, `${rel} drives the bell`).toMatch(/useTaskStore\s*\.\s*getState\(\)\s*\.\s*(start|update)/);
    }
    expect(read("src/app/(dashboard)/dashboard/profile/page.js")).toMatch(/onDownload=\{[^}]*handleExportDatabase/);
  });

  it("the floating banner and its wrappers are gone, not merely unused", () => {
    // A zero-call-site component is a trap: the next feature imports it and the floating box
    // comes back. The files and the exports must not exist either.
    expect(fs.existsSync(path.join(ROOT, "src/shared/components/LongTaskBanner.js"))).toBe(false);
    const loading = read("src/shared/components/Loading.js");
    expect(loading).not.toMatch(/LongTaskBanner/);
    expect(loading).not.toMatch(/export (function|const) (ProgressCard|CenterLoading|BusyOverlay)/);
    const index = read("src/shared/components/index.js");
    expect(index).not.toMatch(/LongTaskBanner|ProgressCard|CenterLoading|BusyOverlay/);
  });

  it("no empty conditional wrappers were left behind by the removal", () => {
    for (const rel of MODALS) {
      const src = read(rel);
      expect(src, `${rel} has a dangling && ( ) wrapper`).not.toMatch(/\{\s*\w+\s*&&\s*\(\s*\)\s*\}/);
      expect(src, `${rel} has an empty JSX expression`).not.toMatch(/\(\s*\n\s*\)\}/);
    }
  });
});
