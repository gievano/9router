// AnyAPI AI — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "anyapi",
  priority: 50,
  alias: "anyapi",
  display: {
    name: "AnyAPI AI",
    icon: "hub",
    color: "#0EA5E9",
    textIcon: "AA",
    website: "https://anyapi.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.anyapi.ai/v1/chat/completions",
    validateUrl: "https://api.anyapi.ai/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan: 100,000 ANY Tokens/day and 100 RPM for eligible Free/Basic models; no credit card required.",
};
