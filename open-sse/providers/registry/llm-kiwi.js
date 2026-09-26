// LLM.Kiwi — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "llm-kiwi",
  priority: 50,
  alias: "llmkiwi",
  display: {
    name: "LLM.Kiwi",
    icon: "hub",
    color: "#84CC16",
    textIcon: "LK",
    website: "https://llm.kiwi",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.llm.kiwi/v1/chat/completions",
    validateUrl: "https://api.llm.kiwi/v1/models",
  },
  models: [
    { id: "auto", name: "Auto" },
    { id: "hrLLM", name: "hrLLM" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free plan exposes auto and hrLLM; the published 40 requests/hour limit applies to hrLLM.",
};
