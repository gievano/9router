// Scaleway Generative APIs — serverless frontier models hosted in EU data
// centers (GDPR, Paris region); OpenAI-compatible.
export default {
  id: "scaleway",
  priority: 40,
  alias: "scaleway",
  aliases: ["scw"],
  uiAlias: "scw",
  display: {
    name: "Scaleway",
    icon: "cloud",
    color: "#4F0599",
    textIcon: "SCW",
    website: "https://www.scaleway.com/en/docs/ai-data/generative-apis/",
    notice: {
      apiKeyUrl: "https://console.scaleway.com/project/credentials",
      text: "EU/GDPR-compliant (Paris). 1M free tokens for new accounts.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.scaleway.ai/v1/chat/completions",
    validateUrl: "https://api.scaleway.ai/v1/models",
  },
  models: [
    // Current serverless catalog (scaleway.com/docs supported-models) — the
    // llama-3.1-* and deepseek-v3-0324 rows went EOL for serverless.
    { id: "qwen3-235b-a22b-instruct-2507", name: "Qwen3 235B A22B" },
    { id: "qwen3.5-397b-a17b", name: "Qwen3.5 397B A17B" },
    { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "mistral-small-3.2-24b-instruct-2506", name: "Mistral Small 3.2" },
    { id: "gpt-oss-120b", name: "GPT-OSS 120B" },
    { id: "glm-5.2", name: "GLM 5.2" },
  ],
  serviceKinds: ["llm"],
  hasFree: true,
  freeNote: "1M free tokens for new accounts — EU/GDPR compliant (Paris)",
};
