// Bytez — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "bytez",
  priority: 50,
  alias: "bytez",
  display: {
    name: "Bytez",
    icon: "api",
    color: "#6366F1",
    textIcon: "BZ",
    website: "https://bytez.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.bytez.com/v1/chat/completions",
    validateUrl: "https://api.bytez.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "$1 free credits, refreshes every 4 weeks",
};
