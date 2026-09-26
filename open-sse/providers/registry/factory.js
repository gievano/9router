// Factory — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "factory",
  priority: 50,
  alias: "factory",
  display: {
    name: "Factory",
    icon: "smart_toy",
    color: "#0F172A",
    textIcon: "FA",
    website: "https://factory.ai",
      notice: { text: "Bearer API key for the Factory OpenAI-compatible gateway.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.factory.ai/v1/chat/completions",
    validateUrl: "https://api.factory.ai/v1/models",
  },
  passthroughModels: true,
};
