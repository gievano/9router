// HelixMind — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "helixmind",
  priority: 50,
  alias: "helixmind",
  display: {
    name: "HelixMind",
    icon: "hub",
    color: "#4F46E5",
    textIcon: "HM",
    website: "https://helixmind.online",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://helixmind.online/v1/chat/completions",
    validateUrl: "https://helixmind.online/v1/models",
    auth: { combined: true, header: "X-API-Key", scheme: "raw" },
  },
  passthroughModels: true,
  freeNote: "Previously circulated 3 RPM/50 RPD and no-card claims were not confirmed during the 2026-08-02 audit; current quota and billing require account verification.",
};
