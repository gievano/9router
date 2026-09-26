// UnoRouter — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "unorouter",
  priority: 50,
  alias: "unorouter",
  display: {
    name: "UnoRouter",
    icon: "unorouter",
    color: "#8B5CF6",
    textIcon: "UR",
    website: "https://unorouter.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.unorouter.com/v1/chat/completions",
    validateUrl: "https://api.unorouter.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Models with the :free suffix do not debit balance; limit is 1 request/minute per free model per user.",
};
