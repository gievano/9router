// TheB.AI — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "thebai",
  priority: 50,
  alias: "thebai",
  display: {
    name: "TheB.AI",
    icon: "hub",
    color: "#3B82F6",
    textIcon: "TB",
    website: "https://theb.ai",
      notice: { text: "Bearer API key for the TheB.AI OpenAI-compatible gateway.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.theb.ai/v1/chat/completions",
    validateUrl: "https://api.theb.ai/v1/models",
  },
  passthroughModels: true,
};
