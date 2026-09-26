// Reka — frontier research lab; fully OpenAI-compatible API.
export default {
  id: "reka",
  priority: 50,
  alias: "reka",
  display: {
    name: "Reka",
    icon: "auto_awesome",
    color: "#111827",
    textIcon: "RK",
    website: "https://docs.reka.ai/chat/overview",
    notice: {
      apiKeyUrl: "https://platform.reka.ai/keys",
      text: "Fully OpenAI-compatible. $10/month recurring free API credits.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.reka.ai/v1/chat/completions",
    validateUrl: "https://api.reka.ai/v1/models",
  },
  models: [
    { id: "reka-flash-3", name: "Reka Flash 3" },
    { id: "reka-flash", name: "Reka Flash" },
    { id: "reka-edge-2603", name: "Reka Edge 2603" },
  ],
  serviceKinds: ["llm", "imageToText"],
  hasFree: true,
  freeNote: "$10/month recurring free API credits",
};
