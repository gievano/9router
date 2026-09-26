// Nube.sh — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "nube",
  priority: 50,
  alias: "nube",
  display: {
    name: "Nube.sh",
    icon: "cloud",
    color: "#2563EB",
    textIcon: "NB",
    website: "https://nube.sh",
      notice: {
        text: "OpenAI-compatible gateway (LiteLLM). Bring your own API key — models are resolved live from the account (passthrough).",
        apiKeyUrl: "https://nube.sh/dashboard/api-keys",
      },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://ai.nube.sh/api/v1/chat/completions",
    validateUrl: "https://ai.nube.sh/api/v1/models",
  },
  passthroughModels: true,
};
