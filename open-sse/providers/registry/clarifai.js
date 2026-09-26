// Clarifai — AI platform exposing OpenAI-compatible endpoints at
// /v2/ext/openai/v1. Auth uses `Authorization: Key <PAT>`.
export default {
  id: "clarifai",
  priority: 40,
  alias: "clarifai",
  display: {
    name: "Clarifai",
    icon: "hub",
    color: "#7C3AED",
    textIcon: "CF",
    website: "https://docs.clarifai.com",
    notice: {
      apiKeyUrl: "https://clarifai.com/settings/security",
      text: "OpenAI-compatible at /v2/ext/openai/v1. Use a Personal Access Token (PAT); sends the key as Authorization: Key <token>. App-scoped keys only work for resources inside that app.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.clarifai.com/v2/ext/openai/v1/chat/completions",
    validateUrl: "https://api.clarifai.com/v2/ext/openai/v1/models",
    auth: { combined: true, header: "Authorization", scheme: "key" },
  },
  models: [
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct" },
  ],
  serviceKinds: ["llm"],
  passthroughModels: true,
};
