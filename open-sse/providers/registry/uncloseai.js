// UncloseAI — free-forever OpenAI-compatible gateway (hermes.ai.unturf.com).
// No signup required; API key is optional. Port of OmniRoute #6650-era batch.
export default {
  id: "uncloseai",
  priority: 60,
  alias: "unc",
  uiAlias: "unc",
  display: {
    name: "UncloseAI",
    icon: "lock_open",
    color: "#22C55E",
    textIcon: "UC",
    website: "https://hermes.ai.unturf.com",
    notice: {
      text: "Free forever OpenAI-compatible gateway — no signup, no credit card. Model ids are served verbatim (e.g. `adamo1139/Hermes-3-Llama-3.1-8B-FP8-Dynamic`, `qwen3.6:27b`, `gemma4:31b`). API key is optional.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://hermes.ai.unturf.com/v1/chat/completions",
    format: "openai",
    noAuth: true,
  },
  models: [
    { id: "adamo1139/Hermes-3-Llama-3.1-8B-FP8-Dynamic", name: "Hermes 3 Llama 3.1 8B (Free)" },
    { id: "qwen3.6:27b", name: "Qwen3 Coder 27B (Free)" },
    { id: "gemma4:31b", name: "Gemma 4 31B (Free)" },
  ],
  passthroughModels: true,
};
