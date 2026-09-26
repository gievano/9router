// LiteRouter — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "literouter",
  priority: 50,
  alias: "literouter",
  display: {
    name: "LiteRouter",
    icon: "router",
    color: "#2563EB",
    textIcon: "LR",
    website: "https://literouter.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.literouter.com/v1/chat/completions",
    validateUrl: "https://api.literouter.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free model variants use the :free suffix; daily credit limits vary by model and free input is capped at 5,000 tokens.",
};
