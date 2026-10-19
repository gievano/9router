/**
 * The dashboard helper (ESM) and the standalone CLI helper (CJS) are two copies
 * of the same rules — the CLI package cannot import from `src/`. This test
 * guards the drift the file comments warn about: `9router connect` and the
 * dashboard's "Apply" must write identical names into a client's config.
 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  modelDisplayName as esmModelDisplayName,
  resolveModelDisplayName as esmResolveModelDisplayName,
} from "../../src/shared/utils/modelDisplayName.js";

const require = createRequire(import.meta.url);
const cli = require("../../cli/src/cli/utils/modelDisplayName.js");

/** Ids shaped like the ones 9router routes: combo aliases, provider-prefixed slugs, custom models. */
const IDS = [
  // combo aliases (no provider prefix)
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
  "claude-fable-5-1",
  "gpt-6.1-sol",
  // provider-prefixed
  "cmc/deepseek/deepseek-v4.1-flash",
  "cmc/z-ai/glm-5.3-flash",
  "mmf/mimo-auto",
  "oc/space-bunny-free",
  "oc/muse-spark-1.3-contributor-free",
  "oc/mimo-v2.6-flash-free",
  "oc/glm-5.3-flash-free",
  "oc/deepseek-v4.1-flash-free",
  "oc/jev-1.13-free",
  "oc/big-pickle",
  "oc/beam-free",
  "openrouter/anthropic/claude-sonnet-4",
  "opencode/nemotron-3-ultra-free",
  "azure/gpt-4o-mini",
  "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0",
  // versions, date stamps, glue
  "claude-3-5-sonnet-20241022",
  "claude-sonnet-4-20250514",
  "claude-opus-4-5-20251101",
  "gpt-4-turbo",
  "gpt-4o",
  "gpt-oss-120b",
  "gpt-5.6-luna",
  "glm-5.2",
  "kimi-k2.7-code",
  "kimi-k2.8-preview",
  "qwen3.8-max",
  "qwen-max",
  "gemini-3-pro",
  "gemini-4-flash",
  "grok-4.1-code",
  "llama-3.3-70b-versatile",
  "phi-4-multimodal",
  "mistral-large-2411",
  "mixtral-8x22b-instruct",
  "deepseek-v3.2-chat",
  "nova-pro-v1",
  "minimax-m3.1",
  "hy3",
  "v4.1",
  "mimo-v2.5-pro",
  "hunyuan-t1",
  // odd but valid shapes
  "Claude-Opus-5-5",
  "claude_opus_5_5",
  "CLAUDE-OPUS-5-5",
  "gpt-6.1-sol-20260101",
  "zzz",
  "x",
  "1",
  "model-with-a-very-long-descriptive-suffix-v2.1-preview",
  "a/b/c/d/e/f",
  "",
  "   ",
  null,
  undefined,
];

/** Values a caller may pass as the "already known" name next to an id. */
const NAME_CASES = [
  ["claude-sonnet-4-20250514", "Claude Sonnet 4"],
  ["claude-opus-5-5", "My Daily Driver"],
  ["claude-opus-5-5", "claude-opus-5-5"],
  ["oc/space-bunny-free", ""],
  ["oc/space-bunny-free", null],
  ["gpt-6.1-sol", "GPT-6.1 Sol"],
  ["", "claude-opus-5-5"],
  ["", ""],
  [null, null],
  ["glm-5.2", "GLM 5.2"],
  ["glm-5.2", "glm-5.2"],
];

describe("modelDisplayName helper parity (ESM dashboard vs CJS CLI)", () => {
  it("derives the same name for every id", () => {
    const divergences = IDS.filter((id) => esmModelDisplayName(id) !== cli.modelDisplayName(id)).map((id) => ({
      id,
      esm: esmModelDisplayName(id),
      cli: cli.modelDisplayName(id),
    }));
    expect(divergences).toEqual([]);
  });

  it("resolves the same name for every (id, explicit name) pair", () => {
    const divergences = NAME_CASES.filter(
      ([id, name]) => esmResolveModelDisplayName(id, name) !== cli.resolveModelDisplayName(id, name)
    ).map(([id, name]) => ({ id, name, esm: esmResolveModelDisplayName(id, name), cli: cli.resolveModelDisplayName(id, name) }));
    expect(divergences).toEqual([]);
  });

  it("declares the same brand table in both copies", () => {
    const brandTable = (source) => {
      const start = source.indexOf("const BRAND_TOKENS = {");
      const end = source.indexOf("};", start);
      return start === -1 || end === -1 ? null : source.slice(start, end + 2);
    };
    const esmSource = brandTable(readHelperSource("src/shared/utils/modelDisplayName.js"));
    const cliSource = brandTable(readHelperSource("cli/src/cli/utils/modelDisplayName.js"));
    expect(esmSource).not.toBeNull();
    expect(cliSource).not.toBeNull();
    expect(esmSource).toEqual(cliSource);
  });
});

/** Read a repo-relative file as text (vitest runs with the repo root as cwd). */
function readHelperSource(relativePath) {
  const { readFileSync } = require("node:fs");
  const { fileURLToPath } = require("node:url");
  const { dirname, join } = require("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "..", "..", relativePath), "utf-8");
}
