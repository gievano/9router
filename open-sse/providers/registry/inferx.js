// InferX — Serverless GPU Inference Platform for OpenCode, Dify, OpenWebUI & agent-native workloads.
//
// OpenAI-compatible endpoint. API key auth (tenant-scoped API key from model.inferx.net).
// Endpoint: POST https://model.inferx.net/endpoints/v1/chat/completions
// Validate: GET  https://model.inferx.net/endpoints/v1/models
// Sign up:   https://model.inferx.net/login
//
// Includes 100% discount / free models by default + popular open models.

export default {
  id: "inferx",
  priority: 50,
  alias: "inferx",
  aliases: ["ix"],
  uiAlias: "inferx",
  display: {
    name: "InferX",
    icon: "bolt",
    color: "#6366F1",
    textIcon: "IX",
    website: "https://model.inferx.net",
    notice: {
      signupUrl: "https://model.inferx.net/login",
      apiKeyUrl: "https://model.inferx.net/login",
      text: "InferX provides serverless OpenAI-compatible inference endpoints for open models. Sign up at model.inferx.net/login to get your tenant-scoped API key. Free / 100% discount models available.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://model.inferx.net/endpoints/v1/chat/completions",
    format: "openai",
    validateUrl: "https://model.inferx.net/endpoints/v1/models",
  },
  modelsFetcher: {
    url: "https://model.inferx.net/endpoints/v1/models",
    type: "openai",
  },
  // Published endpoints catalog (free / 100% discount models prioritized first)
  models: [
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-flash-0731", name: "DeepSeek V4 Flash (0731)" },
    { id: "Qwen3.6-35B-A3B-FP8", name: "Qwen 3.6 35B A3B" },
    { id: "Qwen3.6-35B-A3B-fp8-no-thinking", name: "Qwen 3.6 35B A3B (No Thinking)" },
    { id: "Qwen3-Coder-Next-FP8", name: "Qwen 3 Coder Next" },
    { id: "gemma-4-31B-it-fp8", name: "Gemma 4 31B IT" },
    { id: "glm-52", name: "GLM 52" },
    { id: "Agents-A1", name: "Agents A1" },
    { id: "Devstral-2-123B-Instruct-2512-int4-AutoRound", name: "Devstral 2 123B Instruct" },
    { id: "Ornith-1.0-35B-FP8", name: "Ornith 1.0 35B" },
    { id: "Qwen3.6-27B-FP8", name: "Qwen 3.6 27B" },
    { id: "Qwen3-Embedding-8B", name: "Qwen 3 Embedding 8B" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "100% discount free-tier models available upon login at model.inferx.net",
};
