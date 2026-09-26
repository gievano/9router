// Openference API — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "openference-api",
  priority: 50,
  alias: "ofa",
  display: {
    name: "Openference API",
    icon: "openference",
    color: "#6366F1",
    textIcon: "OF",
    website: "https://openference.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.openference.com/v1/chat/completions",
    validateUrl: "https://api.openference.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan: 3-day trial with open-source models — no credit card required",
};
