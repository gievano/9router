export default {
  id: "featherless",
  priority: 65,
  alias: "featherless",
  aliases: [
    "fl",
  ],
  uiAlias: "fl",
  display: {
    name: "Featherless",
    icon: "flutter_dash",
    color: "#111827",
    textIcon: "FL",
    website: "https://featherless.ai",
    notice: {
      apiKeyUrl: "https://featherless.ai/account/api-keys",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.featherless.ai/v1/chat/completions",
    validateUrl: "https://api.featherless.ai/v1/models",
  },
  models: [
    { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash" },
    { id: "zai-org/GLM-5.2", name: "GLM 5.2" },
    { id: "zai-org/GLM-5.1", name: "GLM 5.1" },
    { id: "moonshotai/Kimi-K2.7-Code", name: "Kimi K2.7 Code" },
    { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
    { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5" },
  
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B" },
    { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B" },
    { id: "Qwen/Qwen2.5-7B-Instruct", name: "Qwen 2.5 7B" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B" },
    { id: "google/gemma-2-9b-it", name: "Gemma 2 9B" },
    { id: "mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral 7B v0.3" },
    { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B" },
    { id: "deepseek-ai/deepseek-llm-7b-chat", name: "DeepSeek LLM 7B Chat" },
    { id: "microsoft/Phi-3.5-mini-instruct", name: "Phi 3.5 Mini" },
  ],
};
