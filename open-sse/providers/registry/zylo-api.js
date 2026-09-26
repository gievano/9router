// Zylo API — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "zylo-api",
  priority: 50,
  alias: "zylo",
  display: {
    name: "Zylo API",
    icon: "hub",
    color: "#2563EB",
    textIcon: "ZY",
    website: "https://zyloai.net",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.zyloai.net/v1/chat/completions",
    validateUrl: "https://api.zyloai.net/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Basic plan: 10 RPM, 7,200 requests/day and 200,000 tokens/day; limited to Basic text models.",
};
