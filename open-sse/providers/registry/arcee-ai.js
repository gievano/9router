// Arcee AI — Trinity family (sparse MoE reasoning models); OpenAI-compatible.
// Free Trinity Large Thinking model (262K context), no credit card required.
export default {
  id: "arcee-ai",
  priority: 50,
  alias: "arcee-ai",
  aliases: ["arcee"],
  uiAlias: "arcee",
  display: {
    name: "Arcee AI",
    icon: "auto_awesome",
    color: "#8B5CF6",
    textIcon: "AR",
    website: "https://arcee.ai",
    notice: {
      apiKeyUrl: "https://docs.arcee.ai/api-reference/authentication",
      text: "OpenAI-compatible. Free Trinity Large Thinking model (262K context), no credit card required.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.arcee.ai/api/v1/chat/completions",
    validateUrl: "https://api.arcee.ai/api/v1/models",
  },
  models: [
    { id: "trinity-mini", name: "Trinity Mini" },
    { id: "trinity-large-thinking", name: "Trinity Large Thinking" },
    { id: "trinity-large-preview", name: "Trinity Large Preview" },
  ],
  serviceKinds: ["llm"],
  hasFree: true,
  freeNote: "Free Trinity Large Thinking model (262K context). No credit card required.",
};
