// Chenzk API — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "chenzk",
  priority: 50,
  alias: "chenzk",
  display: {
    name: "Chenzk API",
    icon: "hub",
    color: "#10B981",
    textIcon: "CZ",
    website: "https://chenzk.top",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://chenzk.top/v1/chat/completions",
    validateUrl: "https://chenzk.top/v1/models",
  },
  passthroughModels: true,
};
