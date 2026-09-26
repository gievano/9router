// Poixe AI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "poixe-ai",
  priority: 50,
  alias: "poixe-ai",
  display: {
    name: "Poixe AI",
    icon: "router",
    color: "#EA580C",
    textIcon: "PX",
    website: "https://poixe.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.poixe.com/v1/chat/completions",
    validateUrl: "https://api.poixe.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Current public free limits are small and model-group specific: 2 RPM/5 RPD for large-cup models and 20 RPM/50 RPD for small-cup models.",
};
