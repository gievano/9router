// Free.ai — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "free-ai",
  priority: 50,
  alias: "free-ai",
  display: {
    name: "Free.ai",
    icon: "hub",
    color: "#16A34A",
    textIcon: "FA",
    website: "https://free.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.free.ai/v1/chat/",
    validateUrl: "https://api.free.ai/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "30,000 tokens/day cover self-hosted models after email verification. Usage beyond the pool can bill at raw cost, and premium external models are paid.",
};
