import { describe, it, expect, beforeEach } from "vitest";
import { recordErrorLog, getErrorLogs, clearErrorLogs } from "../../src/lib/db/repos/errorLogRepo.js";
import { buildErrorBody, errorResponse } from "../../open-sse/utils/error.js";

describe("Error Log & Hide Error System", () => {
  beforeEach(async () => {
    await clearErrorLogs();
  });

  it("records error logs with timestamp and metadata", async () => {
    await recordErrorLog({
      provider: "opencode-v2",
      model: "oc2/beam-free",
      endpoint: "chat",
      statusCode: 502,
      errorMessage: "Provider rate limit 429",
      errorType: "upstream_error",
      stack: "Error: Provider rate limit 429\n  at test (test.js:1)",
    });

    const logs = await getErrorLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].provider).toBe("opencode-v2");
    expect(logs[0].model).toBe("oc2/beam-free");
    expect(logs[0].statusCode).toBe(502);
    expect(logs[0].errorMessage).toBe("Provider rate limit 429");
    expect(logs[0].stack).toContain("test.js:1");
  });

  it("clears error logs completely", async () => {
    await recordErrorLog({
      errorMessage: "Test error 1",
    });
    await recordErrorLog({
      errorMessage: "Test error 2",
    });

    let logs = await getErrorLogs();
    expect(logs.length).toBe(2);

    await clearErrorLogs();
    logs = await getErrorLogs();
    expect(logs.length).toBe(0);
  });

  it("hides error message when hideError is enabled in buildErrorBody and errorResponse", async () => {
    // Normal / visible error
    const normalBody = buildErrorBody(502, "Upstream FreeUsageLimitError: rate limit reached", false);
    expect(normalBody.error.message).toBe("Upstream FreeUsageLimitError: rate limit reached");

    // Hidden error
    const hiddenBody = buildErrorBody(502, "Upstream FreeUsageLimitError: rate limit reached", true);
    expect(hiddenBody.error.message).toBe("There is an error but this error is hidden, try checking your error log.");

    // errorResponse with hideError: true
    const resp = errorResponse(502, "Detailed secret upstream breakdown", null, true);
    const json = await resp.json();
    expect(json.error.message).toBe("There is an error but this error is hidden, try checking your error log.");
  });
});
