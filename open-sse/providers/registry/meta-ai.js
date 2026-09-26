// Meta AI (meta-ai) — api.meta.ai gateway (Muse Spark family).
//
// One sk- API key fronts both OpenAI- and Anthropic-compatible endpoints:
//   OpenAI    https://api.meta.ai/v1        → /v1/chat/completions
//   Anthropic https://api.meta.ai           → /v1/messages
// Cross-format handled by the multi-transport `transports` array: the engine
// picks the endpoint matching the client sourceFormat (no lossy translation),
// and falls back to the alternate format on timeout/5xx.
//
// Reasoning via OpenAI-style reasoning_effort at request top level. Native
// levels: minimal / low / medium / high / xhigh. "none" is NOT supported
// (HTTP 400) → thinkingCanDisable is false so the engine clamps disable
// requests to minimal instead of sending an invalid "none".
//
// DefaultExecutor only — no custom executor needed.

import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "meta-ai",
  priority: 300,
  alias: "ma",
  uiAlias: "ma",
  display: {
    name: "Meta AI",
    icon: "smart_toy",
    textIcon: "MA",
    website: "https://api.meta.ai",
    notice: {
      signupUrl: "https://www.meta.ai",
      apiKeyUrl: "https://api.meta.ai",
      text: "Meta AI — Muse Spark via one API key. Two tiers: Standard (private data, $1.25/$4.25 per 1M input/output) and Contributor (data-sharing, $0.10/$0.20; ~60 req/min, ~250K tokens/day cap). Cached input $0.15/1M. Muse Spark is a reasoning model — reasoning_effort minimal/low/medium/high/xhigh at request top level; \"none\" is not supported (HTTP 400).",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.meta.ai/v1/chat/completions",
    format: "openai",
    thinkingFormat: "openai",
    validateUrl: "https://api.meta.ai/v1/models",
  },
  // OpenAI clients hit /v1; Anthropic clients hit /v1/messages. The engine
  // picks per client source format and falls back across formats on failure.
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.meta.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.meta.ai/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "muse-spark-1.2", name: "Muse Spark 1.2" },
    { id: "muse-spark-1.2-contributor", name: "Muse Spark 1.2 (Contributor)" },
    { id: "muse-spark-1.1", name: "Muse Spark 1.1" },
  ],
  passthroughModels: true,
  pricing: "meta-ai",
  thinkingConfig: {
    options: ["auto", "minimal", "low", "medium", "high", "xhigh"],
    defaultMode: "auto",
  },
};