// Requesty — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "requesty",
  priority: 50,
  alias: "requesty",
  display: {
    name: "Requesty",
    icon: "router",
    color: "#6366F1",
    textIcon: "RQ",
    website: "https://requesty.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://router.requesty.ai/v1/chat/completions",
    validateUrl: "https://router.requesty.ai/v1/models",
  },
  models: [
    { id: "claude-sonnet-4-5@eu", name: "Claude Sonnet 4.5 (latest) (EU)" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "gpt-5.1@eu", name: "GPT-5.1 (EU)" },
    { id: "gpt-4.1-nano@eu", name: "GPT-4.1 nano (EU)" },
    { id: "gemini-2.5-flash@eu", name: "Gemini 2.5 Flash (EU)" },
    { id: "kimi-k3", name: "Kimi K3" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free tier ~200 requests/day - multi-model routing gateway (300+ models)",
};
