// SumoPod — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "sumopod",
  priority: 50,
  alias: "sumopod",
  display: {
    name: "SumoPod",
    icon: "router",
    color: "#2563EB",
    textIcon: "SP",
    website: "https://ai.sumopod.com",
      notice: { text: "Use your SumoPod API key (sk-...) in Authorization: Bearer <key>. Fully OpenAI-compatible. API base URL: https://ai.sumopod.com/v1.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://ai.sumopod.com/v1/chat/completions",
    validateUrl: "https://ai.sumopod.com/v1/models",
  },
  passthroughModels: true,
};
