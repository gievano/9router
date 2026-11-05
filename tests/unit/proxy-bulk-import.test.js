// Bulk proxy import must keep every line that is a DIFFERENT proxy. The bug this
// covers: entries were skipped by NAME, and the client names every line after its
// host, so a pasted list pointing at one host:port with rotating credentials lost
// all but the first row. These tests drive the real job store and the real SQLite
// adapter, because the skip decision lives in that loop.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-proxy-import-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  delete globalThis._proxyImportJobs;
  delete globalThis._proxyImportJobsTimers;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch { /* already closed */ }
  delete global._dbAdapter;
  delete globalThis._proxyImportJobs;
  delete globalThis._proxyImportJobsTimers;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

async function runImport(entries) {
  const { createProxyImportJob, getProxyImportJob } = await import("@/lib/db/proxyImportJobs.js");
  const { jobId } = createProxyImportJob(entries);
  for (let i = 0; i < 400; i += 1) {
    const job = getProxyImportJob(jobId);
    if (job && ["done", "error", "cancelled"].includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("import did not reach a terminal state");
}

async function pools() {
  const { getProxyPools } = await import("@/lib/db/repos/proxyPoolsRepo.js");
  return getProxyPools();
}

const NAME = "Imported proxy.example.com:8080";

describe("bulk proxy import", () => {
  it("keeps every line when one host:port repeats with different credentials", async () => {
    const job = await runImport([
      { name: NAME, proxyUrl: "http://user1:pass1@proxy.example.com:8080" },
      { name: NAME, proxyUrl: "http://user2:pass2@proxy.example.com:8080" },
      { name: NAME, proxyUrl: "http://user3:pass3@proxy.example.com:8080" },
    ]);

    expect(job.status).toBe("done");
    expect(job.counts.created).toBe(3);
    expect(job.counts.skipped).toBe(0);
    expect(job.counts.failed).toBe(0);
  });

  it("gives the repeated rows distinct names so they can be told apart", async () => {
    await runImport([
      { name: NAME, proxyUrl: "http://user1:pass1@proxy.example.com:8080" },
      { name: NAME, proxyUrl: "http://user2:pass2@proxy.example.com:8080" },
    ]);

    const list = await pools();
    expect(list).toHaveLength(2);
    expect(new Set(list.map((p) => p.name)).size).toBe(2);
    expect(list.map((p) => p.name).sort()).toEqual([NAME, `${NAME} #2`].sort());
  });

  it("still skips a genuine duplicate URL", async () => {
    const duplicate = "http://user1:pass1@proxy.example.com:8080";
    const job = await runImport([
      { name: NAME, proxyUrl: duplicate },
      { name: NAME, proxyUrl: "http://user2:pass2@proxy.example.com:8080" },
      { name: "Imported second.example.com:9090", proxyUrl: duplicate },
    ]);

    expect(job.counts.created).toBe(2);
    expect(job.counts.skipped).toBe(1);
    expect(await pools()).toHaveLength(2);
  });

  it("treats the same proxy spelled differently as one entry", async () => {
    const job = await runImport([
      { name: NAME, proxyUrl: "http://proxy.example.com:8080" },
      { name: NAME, proxyUrl: "HTTP://Proxy.Example.com:8080/" },
    ]);

    expect(job.counts.created).toBe(1);
    expect(job.counts.skipped).toBe(1);
  });

  it("skips a URL that a previous import already stored", async () => {
    await runImport([{ name: NAME, proxyUrl: "http://proxy.example.com:8080" }]);

    const second = await runImport([
      { name: NAME, proxyUrl: "http://proxy.example.com:8080" },
      { name: NAME, proxyUrl: "http://proxy.example.com:8081" },
    ]);

    expect(second.counts.created).toBe(1);
    expect(second.counts.skipped).toBe(1);
    expect(await pools()).toHaveLength(2);
  });
});
