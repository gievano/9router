// Nous Research — Hermes family via the official inference API.
export default {
  id: "nous-research",
  priority: 50,
  alias: "nous-research",
  aliases: ["nous"],
  uiAlias: "nous",
  display: {
    name: "Nous Research",
    icon: "hub",
    color: "#2563EB",
    textIcon: "NO",
    website: "https://portal.nousresearch.com/help",
    notice: {
      apiKeyUrl: "https://portal.nousresearch.com/keys",
      text: "Official OpenAI-compatible inference endpoint. Free tier: 50 RPM / 500,000 TPM — no credit card.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://inference-api.nousresearch.com/v1/chat/completions",
    validateUrl: "https://inference-api.nousresearch.com/v1/models",
  },
  models: [
    { id: "Hermes-4-405B", name: "Hermes 4 405B" },
    { id: "Hermes-4-70B", name: "Hermes 4 70B" },
  ],
  serviceKinds: ["llm"],
  hasFree: true,
  freeNote: "Free tier: 50 RPM, 500,000 TPM — no credit card",
};
