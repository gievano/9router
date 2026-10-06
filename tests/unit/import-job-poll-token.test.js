import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

describe("import job poll credential", () => {
  it("the job creation route returns the poll token to the client", () => {
    const route = read("src/app/api/settings/database/jobs/route.js");
    // The token must leave the server in the 202 response, otherwise the
    // client has nothing to poll with and falls back to the password header
    // against a settings row the import is replacing.
    expect(route).toContain("pollToken: job.pollToken");
    expect(route).toMatch(/\{\s*jobId: job\.jobId,\s*status: job\.status,\s*pollToken: job\.pollToken\s*\}/);
  });

  it("createImportJob actually issues a token", () => {
    const lib = read("src/lib/db/importJobs.js");
    expect(lib).toContain("issuePollToken()");
    expect(lib).toContain("pollTokenHash: hash");
    expect(lib).toContain("pollToken: token");
  });

  it("the poll route accepts the token before the password fallback", () => {
    const poll = read("src/app/api/settings/database/jobs/[jobId]/route.js");
    expect(poll).toContain("verifyPollToken(job, pollToken)");
    // token first, password only as fallback
    const tokenIdx = poll.indexOf("verifyPollToken(job, pollToken)");
    const passIdx = poll.indexOf("verifyDashboardPassword(");
    expect(tokenIdx).toBeGreaterThan(-1);
    expect(passIdx).toBeGreaterThan(tokenIdx);
  });

  it("the digest survives completion so the last poll still authenticates", () => {
    const lib = read("src/lib/db/importJobs.js");
    // Nulling the digest at done/error made the completion poll fall back to
    // the password header the token-based client never sends: 401 over a done
    // restore. The digest now dies with the job record via RESULT_TTL cleanup.
    expect(lib).not.toContain("pollTokenHash = null");
  });

  it("the client forwards the token from the POST response", () => {
    const page = read("src/app/(dashboard)/dashboard/profile/page.js");
    expect(page).toContain("jobData.pollToken");
    expect(page).toContain('"x-9r-poll-token"');
  });
});
