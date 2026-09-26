// MegaNova AI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "meganova-ai",
  priority: 50,
  alias: "meganova-ai",
  display: {
    name: "MegaNova AI",
    icon: "router",
    color: "#7C3AED",
    textIcon: "MN",
    website: "https://meganova.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.meganova.ai/v1/chat/completions",
    validateUrl: "https://api.meganova.ai/v1/models",
  },
  models: [
    { id: "XiaomiMiMo/MiMo-V2-Flash", name: "MiMo V2 Flash" },
    { id: "MiniMaxAI/MiniMax-M2.1", name: "MiniMax M2.1" },
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5" },
    { id: "moonshotai/Kimi-K2-Thinking", name: "Kimi K2 Thinking" },
    { id: "deepseek-ai/DeepSeek-V3.2", name: "DeepSeek V3.2" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free signup without a card. Published Tier 1 per-model quotas total 550 requests/day; they are not a shared global pool, and paid overage can apply if enabled.",
};
