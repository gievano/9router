// MNN AI — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "mnn-ai",
  priority: 50,
  alias: "mnn-ai",
  display: {
    name: "MNN AI",
    icon: "hub",
    color: "#0F766E",
    textIcon: "MNN",
    website: "https://mnnai.ru",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.mnnai.ru/v1/chat/completions",
    validateUrl: "https://api.mnnai.ru/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan: $1 monthly credits, 10 RPM and access only to models marked Free.",
};
