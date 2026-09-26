// Speka AI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "speka",
  priority: 50,
  alias: "speka",
  display: {
    name: "Speka AI",
    icon: "router",
    color: "#DB2777",
    textIcon: "SP",
    website: "https://speka.me",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://speka.me/v1/chat/completions",
    validateUrl: "https://speka.me/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan: $1 monthly usage, 10 RPM, one API key and access to open models and the playground; no card required.",
};
