import { describe, it, expect, beforeEach } from "vitest";
import { recordErrorLog, getErrorLogs, clearErrorLogs } from "../../src/lib/db/repos/errorLogRepo.js";
import { buildErrorBody, errorResponse, unavailableResponse } from "../../open-sse/utils/error.js";
import { buildStreamErrorBytes } from "../../open-sse/utils/streamHelpers.js";

describe("Error Log & Hide Error System", () => {
  beforeEach(async () => {
    await clearErrorLogs();
  });

  it("records error logs with timestamp and metadata", async () => {
    await recordErrorLog({
      provider: "opencode",
      model: "oc/beam-free",
      endpoint: "chat",
      statusCode: 502,
      errorMessage: "Provider rate limit 429",
      errorType: "upstream_error",
      stack: "Error: Provider rate limit 429\n  at test (test.js:1)",
    });

    const logs = await getErrorLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].provider).toBe("opencode");
    expect(logs[0].model).toBe("oc/beam-free");
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

  it("unavailableResponse with hideError masks message but keeps retry-after header", async () => {
    const retryAfter = new Date(Date.now() + 120000).toISOString();
    const retryAfterHuman = "reset after 2m";

    // Default (visible): message has suffix, retry-after header present
    const visible = unavailableResponse(503, "Secret upstream detail", retryAfter, retryAfterHuman);
    const vJson = await visible.json();
    expect(vJson.error.message).toBe("Secret upstream detail (reset after 2m)");
    expect(visible.headers.get("retry-after")).toBe("120");

    // Hidden: message is generic, retry-after header still present
    const hidden = unavailableResponse(503, "Secret upstream detail", retryAfter, retryAfterHuman, null, true);
    const hJson = await hidden.json();
    expect(hJson.error.message).toBe("There is an error but this error is hidden, try checking your error log.");
    expect(hidden.headers.get("retry-after")).toBe("120");
  });

  it("buildStreamErrorBytes with hideError masks message for SSE error frame", async () => {
    const bytes = buildStreamErrorBytes(504, "Internal upstream detail", "openai", true);
    const text = new TextDecoder().decode(bytes);
    // SSE data line should contain the hidden message
    expect(text).toContain("There is an error but this error is hidden");
    // Should NOT contain the original detail
    expect(text).not.toContain("Internal upstream detail");
  });
});
