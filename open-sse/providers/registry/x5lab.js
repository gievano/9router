// X5Lab — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "x5lab",
  priority: 50,
  alias: "x5lab",
  display: {
    name: "X5Lab",
    icon: "router",
    color: "#7C3AED",
    textIcon: "X5",
    website: "https://x5lab.dev",
      notice: { text: "Use your X5Lab API key (x5-...) in Authorization: Bearer <key>. Fully OpenAI-compatible. API base URL: https://api.x5lab.dev/v1.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.x5lab.dev/v1/chat/completions",
    validateUrl: "https://api.x5lab.dev/v1/models",
  },
  passthroughModels: true,
};
