// Empower — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "empower",
  priority: 50,
  alias: "empower",
  display: {
    name: "Empower",
    icon: "hub",
    color: "#14B8A6",
    textIcon: "EM",
    website: "https://docs.empower.dev",
      notice: { text: "Bearer API key for the Empower OpenAI-compatible endpoint.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://app.empower.dev/api/v1/chat/completions",
    validateUrl: "https://app.empower.dev/api/v1/models",
  },
  passthroughModels: true,
};
