// Hack Club AI — free AI gateway for Hack Club members (ai.hackclub.com).
// 30+ models, no credit card. API key optional for members; the endpoint also
// serves a small anonymous tier. Port of the OmniRoute free-gateway batch.
export default {
  id: "hackclub",
  priority: 60,
  alias: "hcb",
  uiAlias: "hcb",
  display: {
    name: "Hack Club AI",
    icon: "construction",
    color: "#E8374C",
    textIcon: "HC",
    website: "https://hackclub.com",
    notice: {
      apiKeyUrl: "https://hackclub.com",
      text: "Free AI for Hack Club members — 30+ models (Llama, Mistral, DeepSeek, Qwen…), no credit card. Model ids are the Hugging Face ids (e.g. `meta-llama/llama-3.3-70b-instruct`). API key is optional.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://ai.hackclub.com/proxy/v1/chat/completions",
    format: "openai",
    noAuth: true,
  },
  models: [
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B" },
    { id: "deepseek-ai/deepseek-coder-33b", name: "DeepSeek Coder 33B" },
  ],
  passthroughModels: true,
};
