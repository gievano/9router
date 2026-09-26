// LLM Gateway — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "llmgateway",
  priority: 50,
  alias: "llmgateway",
  display: {
    name: "LLM Gateway",
    icon: "router",
    color: "#6366F1",
    textIcon: "LG",
    website: "https://llmgateway.io",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.llmgateway.io/v1/chat/completions",
    validateUrl: "https://api.llmgateway.io/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Hosted Free plan: free-priced models are limited to 5 requests per 10 minutes when the account has no credits.",
};
