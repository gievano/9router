// PublicAI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "publicai",
  priority: 50,
  alias: "publicai",
  display: {
    name: "PublicAI",
    icon: "public",
    color: "#059669",
    textIcon: "PA",
    website: "https://publicai.co",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.publicai.co/v1/chat/completions",
    validateUrl: "https://api.publicai.co/v1/models",
  },
  passthroughModels: true,
  freeNote: "Requires an API key — one-time signup credit, then paid",
};
