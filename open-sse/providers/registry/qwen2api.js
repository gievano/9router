// ExtremeRouter (Exclusive) — OpenAI-compatible proxy for Qwen models.
//
// Exclusive provider powered by qwen2api (github.com/smanx/qwen2api). Proxies
// Qwen's internal chat API into an OpenAI-compatible interface with dual
// endpoint fallback (Netlify → custom domain).
//
// No API key required. No custom executor needed — the proxy speaks native
// OpenAI Chat Completions with SSE streaming.

const PRIMARY_BASE = "https://effulgent-pika-7b150e.netlify.app";
const FALLBACK_BASE = "https://qwen2api-n.smanx.xx.kg";

export default {
  id: "qwen2api",
  priority: 60,
  alias: "extreme-exclusive",
  aliases: ["qwen2api", "qwen-proxy"],
  uiAlias: "extreme-exclusive",
  display: {
    name: "ExtremeRouter (Exclusive)",
    icon: "diamond",
    color: "#FF6B35",
    textIcon: "EX",
    website: "https://github.com/smanx/qwen2api",
    notice: {
      signupUrl: "https://github.com/smanx/qwen2api",
      text: "Exclusive ExtremeRouter provider — Qwen models (3.7/3.8) via OpenAI-compatible proxy. No API key required. Dual endpoint with automatic fallback.",
    },
  },
  category: "free",
  authType: "apikey",
  noAuth: true,
  transport: {
    baseUrl: `${PRIMARY_BASE}/v1/chat/completions`,
    format: "openai",
    validateUrl: `${PRIMARY_BASE}/v1/models`,
  },
  // Dual endpoint: engine falls back to alternate on primary failure.
  transports: [
    {
      format: "openai",
      baseUrl: `${PRIMARY_BASE}/v1/chat/completions`,
    },
    {
      format: "openai",
      baseUrl: `${FALLBACK_BASE}/v1/chat/completions`,
    },
  ],
  models: [
    { id: "qwen3.8-max-preview", name: "Qwen3.8 Max Preview", contextWindow: 1000000 },
    { id: "qwen3.7-max", name: "Qwen3.7 Max", contextWindow: 1000000 },
    { id: "qwen3.7-plus", name: "Qwen3.7 Plus", contextWindow: 1000000 },
    { id: "qwen3.6-plus", name: "Qwen3.6 Plus", contextWindow: 1000000 },
  ],
  passthroughModels: true,
  modelsFetcher: {
    url: `${PRIMARY_BASE}/v1/models`,
    type: "openai",
  },
};
