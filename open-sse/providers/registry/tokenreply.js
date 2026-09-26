// TokenReply — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "tokenreply",
  priority: 50,
  alias: "tokenreply",
  display: {
    name: "TokenReply",
    icon: "router",
    color: "#3B82F6",
    textIcon: "TR",
    website: "https://www.tokenreply.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.tokenreply.com/v1/chat/completions",
    validateUrl: "https://api.tokenreply.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free-tagged models have model- and campaign-specific daily limits; no fixed global free quota is published.",
};
