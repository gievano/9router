// Charm Hyper — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "charm-hyper",
  priority: 50,
  alias: "charm-hyper",
  display: {
    name: "Charm Hyper",
    icon: "router",
    color: "#7C3AED",
    textIcon: "CH",
    website: "https://hyper.charm.land",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://hyper.charm.land/v1/chat/completions",
    validateUrl: "https://hyper.charm.land/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "100 free monthly Hypercredits on signup",
};
