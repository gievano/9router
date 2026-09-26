// Helyx AI — unified OpenAI-compatible gateway for 50+ models (free tier included).
//
// Unified endpoint: https://helyxai.space/v1
//   Chat:   POST /v1/chat/completions    (OpenAI SDK drop-in, SSE streaming)
//   Image:  POST /v1/images/generations  (e.g. flux-1)
//   Video:  POST /v1/videos/generations  (e.g. kling-video)
// Auth:     Authorization: Bearer <hx_...>
// Sign up:  https://helyxai.space
//
// Free plan: 100K tokens/day (docs) / 2M+ daily (homepage), resets every 24h.
// Errors: 401 invalid_api_key · 403 insufficient_quota · 429 rate_limit_exceeded · 500 server_error.
//
// There is no public GET /v1/models (404) — API-key validation falls back to a
// chat probe (generic default in src/app/api/providers/validate/route.js) and the
// model catalog below is a curated seed; the rest of the 50+ roster is accepted
// at runtime via passthroughModels.

export default {
  id: "helyxai",
  priority: 140,
  alias: "helyxai",
  aliases: ["hx"],
  uiAlias: "hx",
  display: {
    name: "Helyx AI",
    icon: "hub",
    color: "#7C3AED",
    textIcon: "HX",
    website: "https://helyxai.space",
    notice: {
      signupUrl: "https://helyxai.space",
      apiKeyUrl: "https://helyxai.space/dashboard",
      text: "Helyx AI — one OpenAI-compatible API for 50+ models (GPT, Claude, Gemini, Kimi, DeepSeek, Grok) plus image/video generation. Free tier: 100K tokens/day, resets every 24h.",
    },
  },
  category: "apikey",
  authType: "apikey",
  hasFree: true,
  freeNote: "Free plan: 100K tokens daily, resets every 24 hours.",
  transport: {
    baseUrl: "https://helyxai.space/v1/chat/completions",
    format: "openai",
  },
  pricing: "helyxai",
  // Curated seed catalog from helyxai.space/models-list (exact API strings).
  passthroughModels: true,
  models: [
    { id: "DeepSeek-V4-Flash", name: "DeepSeek V4 Flash" },
    { id: "gpt-5.6-luna", name: "GPT 5.6 Luna" },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite" },
    { id: "GLM-5.2", name: "GLM 5.2" },
    { id: "Qwen3-32B", name: "Qwen3 32B" },
    { id: "MiniMax-M3", name: "MiniMax M3" },
    { id: "DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
    { id: "Mistral-4", name: "Mistral 4" },
    { id: "gemma-4-31B-it", name: "Gemma 4 31B" },
    { id: "gpt-oss-120b", name: "GPT OSS 120B" },
    { id: "Kimi-K3", name: "Kimi K3" },
    { id: "llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
    { id: "flux-1", name: "FLUX 1", params: ["n", "size"], kind: "image" },
    { id: "kling-video", name: "Kling Video", params: ["duration"], kind: "video" },
  ],
  serviceKinds: ["llm", "image", "video"],
  imageConfig: {
    baseUrl: "https://helyxai.space/v1/images/generations",
    bodyFields: ["model", "prompt", "n", "size", "response_format"],
  },
  videoConfig: {
    baseUrl: "https://helyxai.space/v1/videos/generations",
    bodyFields: ["model", "prompt", "duration"],
  },
};
