// TokenHarbor — AI model gateway (tokenharbor.ai).
//
// One sk- API key fronts both OpenAI- and Anthropic-compatible endpoints:
//   OpenAI    https://tokenharbor.ai/v1        → /v1/chat/completions
//   Anthropic https://tokenharbor.ai           → /v1/messages
// Cross-format handled by the multi-transport `transports` array: the engine
// picks the endpoint matching the client sourceFormat (no lossy translation),
// and falls back to the alternate format on timeout/5xx.
//
// Per-request cache control is passed through via headers (documented in the
// notice; the client sets them, the gateway obeys):
//   X-TH-Cache-Control        bypass | force-refresh
//   X-TH-Cache-Layer          exact | semantic   (response header)
//
// DefaultExecutor only — no custom executor needed.

import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "tokenharbor",
  priority: 300,
  alias: "th",
  uiAlias: "th",
  display: {
    name: "TokenHarbor",
    icon: "anchor",
    color: "#0EA5E9",
    textIcon: "TH",
    website: "https://tokenharbor.ai",
    notice: {
      signupUrl: "https://tokenharbor.ai/login?invite=TH-ATB2-9CP7",
      apiKeyUrl: "https://tokenharbor.ai/login?invite=TH-ATB2-9CP7",
      text: "TokenHarbor — AI model gateway with a shared cache. One API key fronts OpenAI- and Anthropic-compatible endpoints (Claude Opus 5, GPT-5.6, Kimi K3, GLM 5.2, Gemini 3.6 Flash…). Create a key at tokenharbor.ai. Per-request cache control: set X-TH-Cache-Control: bypass (skip lookup, still write) or force-refresh (pure passthrough, no write) on the request to override caching.",
    },
  },
  category: "apikey",
  authType: "apikey",
  features: { usage: true, usageApikey: true },
  transport: {
    baseUrl: "https://tokenharbor.ai/v1/chat/completions",
    format: "openai",
    thinkingFormat: "openai",
    validateUrl: "https://tokenharbor.ai/v1/models",
  },
  // Claude-family models hit the Anthropic/1m messages endpoint natively; the
  // OpenAI-style models hit /v1. Engine picks per client source format.
  transports: [
    {
      format: "openai",
      baseUrl: "https://tokenharbor.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://tokenharbor.ai/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "claude-opus-5", name: "Claude Opus 5", targetFormat: "claude" },
    { id: "claude-fable-5", name: "Claude Fable 5", targetFormat: "claude" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", targetFormat: "claude" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },
    { id: "kimi-k3", name: "Kimi K3" },
    { id: "qwen3.8-max", name: "Qwen3.8 Max" },
    { id: "grok-4.5", name: "Grok 4.5" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash" },
  ],
  passthroughModels: true,
  pricing: "tokenharbor",
  thinkingConfig: {
    options: ["auto", "none", "low", "medium", "high", "xhigh", "max"],
    defaultMode: "auto",
  },
};