import { describe, it, expect, vi } from "vitest";
import { testApiKeyConnection } from "../../src/app/api/providers/[id]/test/testUtils.js";

describe("OpenCode Free connection test probe audit", () => {
  it("validates OpenCode connection locally without calling upstream network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await testApiKeyConnection(
      { id: "conn-oc", provider: "opencode" },
      null
    );

    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    // Must NOT have called fetch to upstream
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
