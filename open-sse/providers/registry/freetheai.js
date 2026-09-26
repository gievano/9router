// FreeTheAi — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "freetheai",
  priority: 50,
  alias: "fta",
  display: {
    name: "FreeTheAi",
    icon: "hub",
    color: "#22C55E",
    textIcon: "FTA",
    website: "https://freetheai.xyz",
      notice: { text: "Join the FreeTheAi Discord to get your free API key.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.freetheai.xyz/v1/chat/completions",
    validateUrl: "https://api.freetheai.xyz/v1/models",
  },
  models: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "deepseek-chat", name: "DeepSeek Chat" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free OpenAI-compatible gateway — sign up via Discord for an API key.",
};
