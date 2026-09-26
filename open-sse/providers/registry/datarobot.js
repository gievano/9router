// DataRobot — LLM Gateway. The gateway URL is per-account/deployment, so the
// registry ships an empty baseUrl (custom openai-compatible node flow).
export default {
  id: "datarobot",
  priority: 40,
  alias: "datarobot",
  display: {
    name: "DataRobot",
    icon: "precision_manufacturing",
    color: "#6D28D9",
    textIcon: "DR",
    website: "https://docs.datarobot.com",
    notice: {
      apiKeyUrl: "https://app.datarobot.com/account/api-token",
      text: "LLM Gateway catalogs active models from /genai/llmgw/catalog/. The gateway endpoint is per-account — add it via a custom baseUrl connection (OpenAI-compatible).",
    },
  },
  category: "apikey",
  authType: "apikey",
  hasProviderSpecificData: true,
  transport: {
    baseUrl: "",
    validateUrl: "",
  },
  passthroughModels: true,
};
