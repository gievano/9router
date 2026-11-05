// Bulk edit for virtual (studio) models: one field written to every selected
// model in one call, with the untouched fields preserved. Driven against the real
// SQLite adapter, because the write path is the point of the test.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-model-bulk-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch { /* already closed */ }
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

async function patch(body) {
  const { PATCH } = await import("@/app/api/model-editor/bulk/route.js");
  const res = await PATCH(
    new Request("http://localhost/api/model-editor/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return { status: res.status, data: await res.json() };
}

async function seed() {
  const { setStudioModel } = await import("@/lib/db/repos/modelEditorRepo.js");
  await setStudioModel({
    callName: "m1",
    targetModel: "openai/gpt-4o",
    contextWindow: 1000,
    inputMultiplier: 2,
  });
  await setStudioModel({ callName: "m2", targetModel: "openai/gpt-4o", contextWindow: 2000 });
}

describe("model-editor bulk edit", () => {
  it("writes the field to every selected model and leaves the rest alone", async () => {
    await seed();
    const { status, data } = await patch({ names: ["m1", "m2"], patch: { outputMultiplier: 3 } });

    expect(status).toBe(200);
    expect(data.updated.sort()).toEqual(["m1", "m2"]);

    const { getStudioModel } = await import("@/lib/db/repos/modelEditorRepo.js");
    const m1 = await getStudioModel("m1");
    expect(m1.outputMultiplier).toBe(3);
    expect(m1.inputMultiplier).toBe(2);
    expect(m1.contextWindow).toBe(1000);
    expect(m1.targetModel).toBe("openai/gpt-4o");

    const m2 = await getStudioModel("m2");
    expect(m2.outputMultiplier).toBe(3);
    expect(m2.contextWindow).toBe(2000);
  });

  it("clears a multiplier when the value is 0", async () => {
    await seed();
    const { data } = await patch({ names: ["m1"], patch: { inputMultiplier: 0 } });

    expect(data.updated).toEqual(["m1"]);
    const { getStudioModel } = await import("@/lib/db/repos/modelEditorRepo.js");
    expect((await getStudioModel("m1")).inputMultiplier).toBeUndefined();
  });

  it("refuses a field that is not bulk editable", async () => {
    await seed();
    const { status, data } = await patch({ names: ["m1"], patch: { targetModel: "anthropic/claude" } });

    expect(status).toBe(400);
    expect(data.error).toMatch(/cannot be changed in bulk/);
    const { getStudioModel } = await import("@/lib/db/repos/modelEditorRepo.js");
    expect((await getStudioModel("m1")).targetModel).toBe("openai/gpt-4o");
  });

  it("refuses a call with nothing to change", async () => {
    await seed();
    const empty = await patch({ names: ["m1"], patch: {} });
    expect(empty.status).toBe(400);

    const noNames = await patch({ names: [], patch: { outputMultiplier: 2 } });
    expect(noNames.status).toBe(400);
  });

  it("reports models that no longer exist instead of failing the whole call", async () => {
    await seed();
    const { status, data } = await patch({ names: ["m1", "ghost"], patch: { contextWindow: 5000 } });

    expect(status).toBe(200);
    expect(data.updated).toEqual(["m1"]);
    expect(data.missing).toEqual(["ghost"]);
  });
});
