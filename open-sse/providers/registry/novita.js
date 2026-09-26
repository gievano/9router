// Novita AI — Low-cost Serverless GPU & Open LLM Inference Platform.
//
// OpenAI-compatible endpoint. API key auth (Bearer token from novita.ai).
// Endpoint: POST https://api.novita.ai/v3/openai/chat/completions
// Validate: GET  https://api.novita.ai/v3/openai/models
// Sign up:   https://novita.ai

export default {
  id: "novita",
  priority: 50,
  alias: "novita",
  aliases: ["nv"],
  uiAlias: "novita",
  display: {
    name: "Novita AI",
    icon: "hub",
    color: "#8B5CF6",
    textIcon: "NV",
    website: "https://novita.ai",
    notice: {
      signupUrl: "https://novita.ai",
      apiKeyUrl: "https://novita.ai/dashboard/key-management",
      text: "Novita AI offers fast, low-cost API inference for open LLMs (DeepSeek R1/V3, Llama, Qwen, GLM) with OpenAI SDK compatibility. Sign up at novita.ai to get your API key.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.novita.ai/v3/openai/chat/completions",
    format: "openai",
    validateUrl: "https://api.novita.ai/v3/openai/models",
  },
  modelsFetcher: {
    url: "https://api.novita.ai/v3/openai/models",
    type: "openai",
  },
  // Default/fallback models catalog
  models: [
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
    { id: "deepseek/deepseek-v3", name: "DeepSeek V3" },
    { id: "deepseek/deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill Llama 70B" },
    { id: "deepseek/deepseek-r1-distill-qwen-32b", name: "DeepSeek R1 Distill Qwen 32B" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
    { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B Instruct" },
    { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B Instruct" },
    { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B" },
    { id: "mistralai/mistral-nemo", name: "Mistral Nemo" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free trial credits upon signup at novita.ai",
};
