// Cheaper Inference — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "cheaperinference",
  priority: 50,
  alias: "cinf",
  display: {
    name: "Cheaper Inference",
    icon: "savings",
    color: "#31f889",
    textIcon: "CI",
    website: "https://cheaperinference.com/?utm_source=omniroute",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.cheaperinference.com/v1/chat/completions",
    validateUrl: "https://api.cheaperinference.com/v1/models",
  },
  passthroughModels: true,
};
