// b.ai — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "bai",
  priority: 50,
  alias: "bai",
  display: {
    name: "b.ai",
    icon: "hub",
    color: "#6366F1",
    textIcon: "BA",
    website: "https://b.ai",
      notice: { text: "Bearer API key for the b.ai OpenAI-compatible LLM gateway (distinct from TheB.AI). Create a key at https://docs.b.ai, then use https://api.b.ai/v1 OpenAI-compat", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.b.ai/v1/chat/completions",
    validateUrl: "https://api.b.ai/v1/models",
  },
  passthroughModels: true,
};
