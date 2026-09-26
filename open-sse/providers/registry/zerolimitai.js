// ZeroLimitAI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "zerolimitai",
  priority: 50,
  alias: "zerolimitai",
  display: {
    name: "ZeroLimitAI",
    icon: "router",
    color: "#475569",
    textIcon: "ZL",
    website: "https://www.zerolimitai.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://www.zerolimitai.com/api/v1/chat/completions",
    validateUrl: "https://www.zerolimitai.com/api/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Temporary free trial is advertised, but official pages conflict between 3 and 7 days; a 100-calls/day claim is not treated.",
};
