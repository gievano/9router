// DIT.ai — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "dit",
  priority: 50,
  alias: "dai",
  display: {
    name: "DIT.ai",
    icon: "hub",
    color: "#0EA5E9",
    textIcon: "DT",
    website: "https://dit.ai",
      notice: { text: "Use your dit.ai API key in Authorization: Bearer <key>. Fully OpenAI-compatible — a drop-in replacement, just change the base URL to https://api.dit.ai/v1.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.dit.ai/v1/chat/completions",
    validateUrl: "https://api.dit.ai/v1/models",
  },
  models: [
    { id: "gpt-5.4", name: "GPT-5.4 (DIT.ai)" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (DIT.ai)" },
  ],
};
