// nScale — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "nscale",
  priority: 50,
  alias: "nscale",
  display: {
    name: "nScale",
    icon: "token",
    color: "#0891B2",
    textIcon: "NS",
    website: "https://nscale.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://inference.api.nscale.com/v1/chat/completions",
    validateUrl: "https://inference.api.nscale.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "$5 free credits on signup for inference testing",
};
