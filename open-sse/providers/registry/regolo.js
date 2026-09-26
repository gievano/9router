// Regolo AI — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "regolo",
  priority: 50,
  alias: "regolo",
  display: {
    name: "Regolo AI",
    icon: "hub",
    color: "#6366F1",
    textIcon: "RG",
    website: "https://regolo.ai",
      notice: { text: "Get your Regolo API key from regolo.ai, then paste it here Bearer token.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.regolo.ai",
    validateUrl: "https://api.regolo.ai/v1/models",
  },
  models: [
    { id: "regolo-chat", name: "Regolo Chat" },
    { id: "regolo-fast", name: "Regolo Fast" },
  ],
  passthroughModels: true,
};
