// Huancheng Public API (hcnsec) — Xinjiang Huancheng Cybersecurity public LLM
// API platform. Supports both OpenAI and Anthropic API formats behind a single
// API key. Cross-transport fallback: if OpenAI endpoint times out, the engine
// retries the Anthropic endpoint automatically.
//
// Free credits available with daily check-ins. Models discovered live via
// /v1/models at runtime (passthroughModels + empty seed catalog).
//
// Port of OmniRoute commit 437ca488 (PR #6410).
import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "hcnsec",
  priority: 330,
  alias: "hcnsec",
  aliases: ["hc"],
  uiAlias: "hc",
  display: {
    name: "Huancheng Public API",
    icon: "security",
    color: "#0EA5E9",
    textIcon: "HC",
    website: "https://api.hcnsec.cn",
    notice: {
      signupUrl: "https://api.hcnsec.cn/sign-up?aff=ZKgv",
      apiKeyUrl: "https://api.hcnsec.cn/sign-up?aff=ZKgv",
      text: "Xinjiang Huancheng Cybersecurity public LLM API platform. Free credits with daily check-ins. Create an API key at api.hcnsec.cn, then paste it here. Supports both OpenAI and Anthropic API formats — works with any client.",
    },
  },
  category: "freeTier",
  hasFree: true,
  authType: "apikey",
  transport: {
    baseUrl: "https://api.hcnsec.cn/v1/chat/completions",
    format: "openai",
    // Free-tier public gateway: soft 429s recover with short in-place retry
    // (DEFAULT_RETRY_CONFIG has attempts:0 for 429). Hard quota exhaust still
    // fails after 2 attempts and enters backoff cooldown via ERROR_RULES.
    retry: { "429": 2 },
    // Same multi-model OpenAI gateway shape as bynara — don't emit native
    // DeepSeek thinking blocks on DeepSeek-V4-Pro routed through this host.
    thinkingFormat: "openai",
    validateUrl: "https://api.hcnsec.cn/v1/models",
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  // Multi-endpoint: both OpenAI and Anthropic formats supported. The engine
  // picks the endpoint matching the client sourceFormat (skip translation),
  // and falls back to the alternate on timeout/5xx (cross-transport fallback).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.hcnsec.cn/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.hcnsec.cn/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  // Seed catalog — offline fallback when live /v1/models discovery fails or
  // the user hasn't connected a key yet. These are the most commonly available
  // models on the hcnsec public gateway (a new-api/one-api fork that exposes
  // popular open-weight models via OpenAI-compatible endpoints). The live
  // /v1/models fetch (via modelsFetcher + authenticated suggested-models proxy)
  // supersedes this list at runtime.
  models: [
    { id: "deepseek-v3", name: "DeepSeek V3" },
    { id: "deepseek-r1", name: "DeepSeek R1" },
    { id: "qwq-32b", name: "QwQ 32B" },
  ],
  passthroughModels: true,
  modelsFetcher: {
    url: "https://api.hcnsec.cn/v1/models",
    // hcnsec-type parser (suggested-models/filters.js) reads the gateway's
    // context_window/context_length + vision/reasoning fields via the shared
    // config-driven mapper.
    type: "hcnsec",
  },
};
