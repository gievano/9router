// AI21 Labs — Jamba series; OpenAI-compatible studio API.
export default {
  id: "ai21",
  priority: 50,
  alias: "ai21",
  display: {
    name: "AI21 Labs",
    icon: "psychology_alt",
    color: "#0284C7",
    textIcon: "A21",
    website: "https://www.ai21.com",
    notice: {
      apiKeyUrl: "https://studio.ai21.com/account/api-keys",
      text: "$10 trial credits on signup (valid 3 months), no credit card required.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.ai21.com/studio/v1/chat/completions",
    validateUrl: "https://api.ai21.com/studio/v1/models",
  },
  models: [
    { id: "jamba-large-1.7", name: "Jamba Large 1.7" },
    { id: "jamba-mini-2", name: "Jamba Mini 2" },
  ],
  serviceKinds: ["llm"],
  hasFree: true,
  freeNote: "$10 trial credits on signup (valid 3 months), no credit card required",
};
