// NavyAI — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "navy",
  priority: 50,
  alias: "navy",
  display: {
    name: "NavyAI",
    icon: "hub",
    color: "#1E3A8A",
    textIcon: "NV",
    website: "https://api.navy",
      notice: { text: "Create a free API key from the NavyAI dashboard, then paste it here Bearer token.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.navy/v1/chat/completions",
    validateUrl: "https://api.navy/v1/models",
  },
  models: [
    { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
    { id: "gemma-4-31b-it", name: "Gemma 4 31B IT" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "deepseek-chat", name: "DeepSeek Chat" },
    { id: "mistral-small-latest", name: "Mistral Small" },
    { id: "llama-4-scout", name: "Llama 4 Scout" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan is one shared 150K tokens/day pool at 20 RPM. Each model carries a token multiplier, so heavier models drain the pool faster (grok-4 at 10x is ~15K real tokens/day).",
};
