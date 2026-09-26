// OVHcloud AI Endpoints — EU-hosted OpenAI-compatible endpoints.
// The key is optional: the anonymous tier answers /chat/completions without an
// Authorization header (rate-limited), while an OVHcloud key raises the limit.
export default {
  id: "ovhcloud",
  priority: 40,
  alias: "ovhcloud",
  aliases: ["ovh"],
  uiAlias: "ovh",
  display: {
    name: "OVHcloud",
    icon: "cloud",
    color: "#2563EB",
    textIcon: "OVH",
    website: "https://www.ovhcloud.com",
    notice: {
      apiKeyUrl: "https://endpoints.ai.cloud.ovh.net/keys",
      text: "EU-hosted AI Endpoints. Anonymous tier works without a key (rate-limited); an OVHcloud key raises the rate limit.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions",
    validateUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/models",
  },
  models: [
    { id: "Meta-Llama-3_3-70B-Instruct", name: "Llama 3.3 70B Instruct" },
    { id: "Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5 Coder 32B Instruct" },
    { id: "Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small 3.2 24B" },
  ],
  serviceKinds: ["llm"],
};
