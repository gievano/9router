// CloudCode.ONE — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "cloudcode-one",
  priority: 50,
  alias: "cloudcode-one",
  display: {
    name: "CloudCode.ONE",
    icon: "router",
    color: "#6366F1",
    textIcon: "CC",
    website: "https://cloudcode.one",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.cloudcode.one/v1/chat/completions",
    validateUrl: "https://api.cloudcode.one/v1/models",
  },
  models: [
    { id: "glm-4.7-flash", name: "GLM 4.7 Flash" },
    { id: "glm-4.6v-flash", name: "GLM 4.6V Flash" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Published free models include glm-4.7-flash and glm-4.6v-flash; no numeric quota is published, and key creation may require credit or a coupon.",
};
