// Kenari — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "kenari",
  priority: 50,
  alias: "kenari",
  display: {
    name: "Kenari",
    icon: "hub",
    color: "#B5362A",
    textIcon: "KN",
    website: "https://kenari.id",
      notice: { text: "Use your Kenari API key (kn-...) in Authorization: Bearer <key>. Fully OpenAI-compatible. API base URL: https://kenari.id/v1.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://kenari.id/v1/chat/completions",
    validateUrl: "https://kenari.id/v1/models",
  },
  models: [
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B A12B (Free)" },
    { id: "glm-4-7-flash:free", name: "GLM-4.7-Flash (Free)" },
    { id: "nemotron-3-nano-30b-a3b", name: "Nemotron 3 Nano 30B A3B" },
    { id: "kimi-k3", name: "Kimi K3" },
    { id: "gpt-5-6-luna", name: "GPT-5.6 Luna" },
  ],
  passthroughModels: true,
};
