// Writer — Palmyra family; OpenAI-compatible API. Palmyra X5 has a 1M-token
// context window.
export default {
  id: "writer",
  priority: 50,
  alias: "writer",
  display: {
    name: "Writer",
    icon: "edit",
    color: "#111827",
    textIcon: "WR",
    website: "https://dev.writer.com",
    notice: {
      apiKeyUrl: "https://app.writer.com/settings/api-keys",
      text: "Palmyra X5 offers a 1M-token context window. OpenAI-compatible.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.writer.com/v1/chat/completions",
    validateUrl: "https://api.writer.com/v1/models",
  },
  models: [
    { id: "palmyra-x5", name: "Palmyra X5" },
    { id: "palmyra-x4", name: "Palmyra X4" },
  ],
  serviceKinds: ["llm"],
};
