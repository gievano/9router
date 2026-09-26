// Inference.net — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "inference-net",
  priority: 50,
  alias: "inet",
  display: {
    name: "Inference.net",
    icon: "dns",
    color: "#2563EB",
    textIcon: "IN",
    website: "https://inference.net",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.inference.net/v1/chat/completions",
    validateUrl: "https://api.inference.net/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "$25 free credits on signup plus research grants available",
};
