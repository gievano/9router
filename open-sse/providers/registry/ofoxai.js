// OfoxAI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "ofoxai",
  priority: 50,
  alias: "ofoxai",
  display: {
    name: "OfoxAI",
    icon: "router",
    color: "#0F766E",
    textIcon: "OF",
    website: "https://ofox.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.ofox.ai/v1/chat/completions",
    validateUrl: "https://api.ofox.ai/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "The current catalog advertises 10+ free models without a public numeric quota; review upstream provenance, retention and training terms before production use.",
};
