// Meta Llama API — official OpenAI-compatible endpoint for Llama models
// (api.llama.com compat surface; Meta also documents api.meta.ai/v1).
export default {
  id: "meta-llama",
  priority: 50,
  alias: "meta-llama",
  display: {
    name: "Meta Llama API",
    icon: "smart_toy",
    color: "#0F766E",
    textIcon: "ML",
    website: "https://ai.developer.meta.com/docs/overview/",
    notice: {
      apiKeyUrl: "https://ai.developer.meta.com/get-started/",
      text: "Meta's official Llama Model API. OpenAI-compatible chat completions endpoint.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.llama.com/compat/v1/chat/completions",
    validateUrl: "https://api.llama.com/compat/v1/models",
  },
  models: [
    { id: "Llama-4-Maverick-17B-128E-Instruct-FP8", name: "Llama 4 Maverick" },
    { id: "Llama-4-Scout-17B-16E-Instruct-FP8", name: "Llama 4 Scout" },
    { id: "Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct" },
    { id: "Llama-3.3-8B-Instruct", name: "Llama 3.3 8B Instruct" },
  ],
  serviceKinds: ["llm"],
};
