// Void AI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "void-ai",
  priority: 50,
  alias: "void-ai",
  display: {
    name: "Void AI",
    icon: "science",
    color: "#111827",
    textIcon: "VA",
    website: "https://voidai.app",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.voidai.app/v1/chat/completions",
    validateUrl: "https://api.voidai.app/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "The public model catalog marks some models with a free plan requirement, but access is conditional and no numeric quota is confirmed.",
};
