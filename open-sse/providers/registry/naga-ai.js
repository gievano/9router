// Naga AI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "naga-ai",
  priority: 50,
  alias: "naga-ai",
  display: {
    name: "Naga AI",
    icon: "router",
    color: "#059669",
    textIcon: "NA",
    website: "https://naga.ac",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.naga.ac/v1/chat/completions",
    validateUrl: "https://api.naga.ac/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Models marked :free are publicly listed, but no numeric quota is confirmed. Naga's policy warns that free-tier prompts and outputs may be collected or used for training.",
};
