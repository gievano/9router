// FreeInference — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "freeinference",
  priority: 50,
  alias: "freeinference",
  display: {
    name: "FreeInference",
    icon: "science",
    color: "#8B5CF6",
    textIcon: "FI",
    website: "https://freeinference.org",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://freeinference.org/v1/chat/completions",
    validateUrl: "https://freeinference.org/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free research access without a card; non-Harvard applicants require manual approval and no numeric quota is publicly guaranteed.",
};
