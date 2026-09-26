// Predibase — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "predibase",
  priority: 50,
  alias: "predibase",
  display: {
    name: "Predibase",
    icon: "deployed_code_history",
    color: "#0F766E",
    textIcon: "PB",
    website: "https://predibase.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://serving.app.predibase.com/v1/chat/completions",
    validateUrl: "https://serving.app.predibase.com/v1/models",
  },
  passthroughModels: true,
  freeNote: "$25 free trial credits (30-day validity)",
};
