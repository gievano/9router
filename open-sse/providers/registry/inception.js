// Inception Labs — Mercury, the first diffusion LLM (dLLM); OpenAI-compatible.
// 5-10x faster generation than comparable autoregressive models, with tool
// calling, json_mode, and structured outputs.
export default {
  id: "inception",
  priority: 50,
  alias: "inception",
  display: {
    name: "Inception",
    icon: "bolt",
    color: "#F97316",
    textIcon: "IN",
    website: "https://docs.inceptionlabs.ai",
    notice: {
      apiKeyUrl: "https://app.inceptionlabs.ai/keys",
      text: "Mercury is the first diffusion LLM (dLLM) — 5-10x faster generation with tool calling, json_mode, and structured outputs. 10M free tokens on signup.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.inceptionlabs.ai/v1/chat/completions",
    validateUrl: "https://api.inceptionlabs.ai/v1/models",
  },
  models: [
    { id: "mercury-2", name: "Mercury 2" },
  ],
  serviceKinds: ["llm"],
  hasFree: true,
  freeNote: "10M free tokens on signup, no credit card required",
};
