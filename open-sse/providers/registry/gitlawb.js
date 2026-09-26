// Gitlawb Opengateway (MiMo) — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "gitlawb",
  priority: 50,
  alias: "glb",
  display: {
    name: "Gitlawb Opengateway (MiMo)",
    icon: "hub",
    color: "#10B981",
    textIcon: "GLB",
    website: "https://opengateway.gitlawb.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://opengateway.gitlawb.com/v1/xiaomi-mimo",
    validateUrl: "https://opengateway.gitlawb.com/v1/xiaomi-mimo",
  },
  passthroughModels: true,
  freeNote: "Free MiMo (xiaomi/mimo-v2.5) revoked 2026-05 — Opengateway is now a pay-as-you-go credit gateway; no recurring free model.",
};
