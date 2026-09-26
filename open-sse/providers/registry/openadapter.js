// OpenAdapter — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "openadapter",
  priority: 50,
  alias: "oad",
  display: {
    name: "OpenAdapter",
    icon: "hub",
    color: "#10B981",
    textIcon: "OD",
    website: "https://openadapter.dev",
      notice: { text: "Use your OpenAdapter API key in Authorization: Bearer sk-cv-<key>. Fully OpenAI-compatible. API base URL: https://api.openadapter.in/v1.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.openadapter.in/v1/chat/completions",
    validateUrl: "https://api.openadapter.in/v1/models",
  },
  models: [
    { id: "glm-4.7", name: "GLM 4.7 (OpenAdapter)" },
  ],
  hasFree: true,
  freeNote: "Free tier with a generous quota and no credit card — 15+ open-source models with daily quota. Get your API key at https://dashboard.openadapter.in.",
};
