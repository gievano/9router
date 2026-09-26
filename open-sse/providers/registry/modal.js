// Modal — serverless AI platform; hosts OpenAI-compatible apps.
export default {
  id: "modal",
  priority: 40,
  alias: "modal",
  display: {
    name: "Modal",
    icon: "cloud_queue",
    color: "#7C3AED",
    textIcon: "MDL",
    website: "https://modal.com/docs",
    notice: {
      apiKeyUrl: "https://modal.com/settings/tokens",
      text: "OpenAI-compatible. $30/month free credits for new accounts.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.modal.ai/v1/chat/completions",
    validateUrl: "https://api.modal.ai/v1/models",
  },
  models: [
    { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  ],
  serviceKinds: ["llm"],
  hasFree: true,
  freeNote: "$30/month free credits for new accounts",
};
