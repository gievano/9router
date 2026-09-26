// Auriko — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "auriko",
  priority: 50,
  alias: "auriko",
  display: {
    name: "Auriko",
    icon: "hub",
    color: "#0891B2",
    textIcon: "AU",
    website: "https://www.auriko.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.auriko.ai/v1/chat/completions",
    validateUrl: "https://api.auriko.ai/v1/models",
  },
  models: [
    { id: "minimax-m2-7", name: "MiniMax-M2.7" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan publishes 1,000 Platform RPM and 10,000 BYOK RPM. Platform inference still passes through provider cost; this is not a free-token pool or unlimited free inference.",
};
