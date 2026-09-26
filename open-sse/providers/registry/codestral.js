// Codestral — Mistral's dedicated code generation model (codestral.mistral.ai).
//
// OpenAI-compatible endpoint for code completion / generation.
// Free for non-commercial use (Codestral license).

export default {
  id: "codestral",
  priority: 50,
  alias: "codestral",
  display: {
    name: "Codestral",
    icon: "terminal",
    color: "#FF7000",
    textIcon: "CS",
    website: "https://mistral.ai",
    notice: {
      apiKeyUrl: "https://console.mistral.ai/api-keys/",
      text: "Codestral is Mistral's code-specialist model. Get an API key from console.mistral.ai — free tier available for non-commercial use.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://codestral.mistral.ai/v1/chat/completions",
    validateUrl: "https://codestral.mistral.ai/v1/models",
  },
  models: [
    { id: "codestral-2508", name: "Codestral 2508" },
    { id: "codestral-latest", name: "Codestral Latest" },
  ],
  passthroughModels: true,
};
