// Electron Hub — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "electronhub",
  priority: 50,
  alias: "electronhub",
  display: {
    name: "Electron Hub",
    icon: "hub",
    color: "#22C55E",
    textIcon: "EH",
    website: "https://www.electronhub.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.electronhub.ai/v1/chat/completions",
    validateUrl: "https://api.electronhub.ai/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan: 5 RPM, $0.25 weekly credits and 10 Neutrinos/day for :free models; family budgets also apply.",
};
