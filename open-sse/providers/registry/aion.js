// Aion Labs — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "aion",
  priority: 50,
  alias: "aion",
  display: {
    name: "Aion Labs",
    icon: "hub",
    color: "#0EA5E9",
    textIcon: "AI",
    website: "https://www.aionlabs.ai",
      notice: { text: "Create a free API key at aionlabs.ai (no card), then paste it here Bearer token.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.aionlabs.ai/v1/chat/completions",
    validateUrl: "https://api.aionlabs.ai/v1/models",
  },
  models: [
    { id: "aion-labs/aion-3.0", name: "Aion 3.0" },
    { id: "aion-labs/aion-3.0-mini", name: "Aion 3.0 Mini" },
    { id: "aion-labs/aion-2.5", name: "Aion 2.5" },
    { id: "aion-labs/aion-2.0", name: "Aion 2.0" },
    { id: "aion-labs/aion-rp-llama-3.1-8b", name: "Aion RP Llama 3.1 8B" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free tier ~20k tokens/day across the Aion reasoning models.",
};
