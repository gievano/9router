// Gitlawb Opengateway (GMI Cloud) — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "gitlawb-gmi",
  priority: 50,
  alias: "glb-gmi",
  display: {
    name: "Gitlawb Opengateway (GMI Cloud)",
    icon: "hub",
    color: "#10B981",
    textIcon: "GMI",
    website: "https://opengateway.gitlawb.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://opengateway.gitlawb.com/v1/chat/completions",
    validateUrl: "https://opengateway.gitlawb.com/v1/models",
  },
  passthroughModels: true,
  freeNote: "Free Nemotron promo ended 2026-06 — the GMI Cloud route is now pay-as-you-go credit only.",
};
