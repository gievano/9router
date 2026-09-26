// Chat Oripe — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "chat-oripe",
  priority: 50,
  alias: "chat-oripe",
  display: {
    name: "Chat Oripe",
    icon: "router",
    color: "#64748B",
    textIcon: "CO",
    website: "https://api.oriper.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.oriper.com/v1/chat/completions",
    validateUrl: "https://api.oriper.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Official metadata advertises 2M tokens/month, but the public site and documentation were blocked during audit; treat the quota and brand mapping.",
};
