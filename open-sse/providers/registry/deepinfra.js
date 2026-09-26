// DeepInfra — serverless inference platform hosting 200+ open models
// (Llama, Qwen, DeepSeek, GLM, Kimi, MiniMax, Claude-on-API, ...).
//
// OpenAI-compatible endpoint. Free signup credits for testing.
// Model list is large and changes frequently → passthroughModels fetches live.

export default {
  id: "deepinfra",
  priority: 50,
  alias: "deepinfra",
  display: {
    name: "DeepInfra",
    icon: "hub",
    color: "#2563EB",
    textIcon: "DI",
    website: "https://deepinfra.com",
    notice: {
      apiKeyUrl: "https://deepinfra.com/dash/api_keys",
      text: "DeepInfra hosts hundreds of open models (Llama, Qwen, DeepSeek, GLM, Kimi, MiniMax). Get an API key from deepinfra.com/dash/api_keys — free signup credits included.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.deepinfra.com/v1/openai/chat/completions",
    validateUrl: "https://api.deepinfra.com/v1/openai/models",
  },
  models: [
    { id: "anthropic/claude-4-opus", name: "Claude 4 Opus" },
    { id: "anthropic/claude-4-sonnet", name: "Claude 4 Sonnet" },
    { id: "openai/gpt-oss-120b", name: "GPT OSS 120B" },
    { id: "openai/gpt-oss-20b", name: "GPT OSS 20B" },
    { id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", name: "Llama 4 Maverick" },
    { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", name: "Llama 4 Scout" },
    { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash" },
    { id: "zai-org/GLM-5.1", name: "GLM 5.1" },
    { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "Qwen/Qwen3.5-397B-A17B", name: "Qwen3.5 397B" },
    { id: "Qwen/Qwen3.6-35B-A3B", name: "Qwen3.6 35B" },
    { id: "google/gemma-4-31B-it", name: "Gemma 4 31B" },
    { id: "XiaomiMiMo/MiMo-V2.5-Pro", name: "MiMo V2.5 Pro" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free signup credits for API testing and model exploration",
};
