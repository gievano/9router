// Qwen Cloud (Alibaba DashScope International) — official API-key gateway.
//
// DashScope international serves Qwen, GLM, DeepSeek, and Kimi models behind a
// single API key, with THREE compatible API formats:
//   - OpenAI Chat Completions:  /compatible-mode/v1/chat/completions
//   - OpenAI Responses API:     /compatible-mode/v1/responses
//   - Anthropic Messages:       /apps/anthropic/v1/messages
//
// All three accept `Authorization: Bearer <key>` (the Anthropic-format endpoint
// also wants the Anthropic-Version header). The multi-transport `transports`
// array lets the engine pick the right endpoint per client sourceFormat and
// fall back across transports on failure (cross-transport fallback).
//
// Historical note: v0.7.7 merged the former `qwen-cloud-token-plan` provider
// (regional ap-southeast-1 host) into this catalog and migration 002 renamed
// connections. That collapsed two hosts onto dashscope-intl, which rejects
// Token Plan keys. Token Plan traffic now lives on dedicated `alitp-intl`
// (token-plan.ap-southeast-1.maas.aliyuncs.com). The legacy alias
// `qwen-cloud-token-plan` resolves there, not here.
//
// Reasoning: `reasoningInject` injects a placeholder reasoning_content into
// assistant messages so DeepSeek/Kimi thinking-mode validation passes on the
// OpenAI endpoint. The UI thinking-level picker (`thinkingConfig`) exposes
// reasoning_effort levels (low/medium/high) for reasoning-capable models.
import { CLAUDE_API_HEADERS } from "../shared.js";

const COMPAT_BASE = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const ANTHROPIC_BASE = "https://dashscope-intl.aliyuncs.com/apps/anthropic/v1/messages";

export default {
  id: "qwen-cloud",
  priority: 164,
  alias: "qwc",
  aliases: ["qwen-cloud"],
  uiAlias: "qwc",
  display: {
    name: "Qwen Cloud",
    icon: "cloud",
    color: "#7A5EF4",
    textIcon: "QC",
    website: "https://dashscope.console.aliyun.com",
    notice: {
      signupUrl: "https://dashscope.console.aliyun.com",
      apiKeyUrl: "https://dashscope.console.aliyun.com/apiKey",
      text: "Alibaba DashScope international API. Create an API key at dashscope.console.aliyun.com, then paste it here. Supports OpenAI, Anthropic, and Responses API formats — works with any client (Claude Code, Cline, OpenAI, etc.). Hosts Qwen, GLM, DeepSeek, and Kimi models.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    // Default = OpenAI Chat Completions (most clients use this).
    baseUrl: `${COMPAT_BASE}/chat/completions`,
    format: "openai",
    responsesUrl: `${COMPAT_BASE}/responses`,
    validateUrl: `${COMPAT_BASE}/models`,
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
    // DashScope rejects stream_options: it errors "'stream_options' only set
    // this when you set stream: true" (when stream is false) and
    // "'stream' and 'stream_options' must be set together as explicitly
    // required" (when stream is true without the exact shape it expects).
    // The DefaultExecutor normally injects stream_options for all OpenAI-
    // compatible providers (for Cline/GLM compat); this quirk opts out.
    quirks: { dropStreamOptions: true },
  },
  // Multi-endpoint: the engine picks the transport matching the client
  // sourceFormat (skip translation), and falls back to an alternate transport
  // on timeout/5xx (cross-transport fallback).
  transports: [
    {
      format: "openai",
      baseUrl: `${COMPAT_BASE}/chat/completions`,
      responsesUrl: `${COMPAT_BASE}/responses`,
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "openai-responses",
      baseUrl: `${COMPAT_BASE}/responses`,
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      // DashScope's Anthropic-format endpoint uses Bearer auth (not x-api-key).
      format: "claude",
      baseUrl: ANTHROPIC_BASE,
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  // Seed catalog (includes models also served on Token Plan — live discovery
  // via /compatible-mode/v1/models). Token Plan keys still need `alitp-intl`.
  models: [
    // Qwen (flagship + coding)
    { id: "qwen3.8-max-preview", name: "Qwen3.8 Max Preview", contextWindow: 1000000, maxOutput: 65536 },
    { id: "qwen3.7-max", name: "Qwen3.7 Max", contextWindow: 1000000, maxOutput: 65536 },
    { id: "qwen3.7-max-2026-06-08", name: "Qwen3.7 Max (2026-06-08)", contextWindow: 1000000, maxOutput: 65536 },
    { id: "qwen3.7-plus", name: "Qwen3.7 Plus", contextWindow: 1000000, maxOutput: 65536 },
    { id: "qwen3.6-plus", name: "Qwen3.6 Plus", contextWindow: 1000000, maxOutput: 65536 },
    { id: "qwen3.6-flash", name: "Qwen3.6 Flash", contextWindow: 1000000, maxOutput: 32768 },
    { id: "qwen3.6-27b", name: "Qwen3.6 27B", contextWindow: 1000000, maxOutput: 32768 },
    { id: "qwen3.6-35b-a3b", name: "Qwen3.6 35B A3B", contextWindow: 1000000, maxOutput: 32768 },
    { id: "qwen3.5-plus-2026-04-20", name: "Qwen3.5 Plus (2026-04-20)", contextWindow: 1000000, maxOutput: 32768 },
    { id: "qwen3.5-122b-a10b", name: "Qwen3.5 122B A10B", contextWindow: 1000000, maxOutput: 32768 },
    { id: "qwen3.5-397b-a17b", name: "Qwen3.5 397B A17B", contextWindow: 1000000, maxOutput: 32768 },
    // GLM
    { id: "glm-5.2", name: "GLM 5.2", contextWindow: 1000000, maxOutput: 16384 },
    { id: "glm-5.2-fast-preview", name: "GLM 5.2 Fast Preview", contextWindow: 1000000, maxOutput: 16384 },
    // DeepSeek (reasoning-capable)
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", contextWindow: 163840, maxOutput: 32768 },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", contextWindow: 163840, maxOutput: 32768 },
    // Kimi
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", contextWindow: 1000000, maxOutput: 65536 },
  ],
  passthroughModels: true,
  modelsFetcher: {
    url: `${COMPAT_BASE}/models`,
    type: "openai",
  },
  // Reasoning: inject placeholder reasoning_content so DeepSeek/Kimi thinking-
  // mode validation passes on the OpenAI endpoint.
  reasoningInject: { scope: "all" },
  // UI thinking-level picker (reasoning_effort) for reasoning-capable models.
  thinkingConfig: {
    options: ["auto", "none", "low", "medium", "high"],
    defaultMode: "auto",
  },
};
