// Maritaca AI (MariTalk) — Brazilian LLM lab (Sabiá family).
// OpenAI-compatible at chat.maritaca.ai/api; auth uses `Authorization: Key <token>`.
export default {
  id: "maritalk",
  priority: 50,
  alias: "maritalk",
  display: {
    name: "Maritalk",
    icon: "translate",
    color: "#1D4ED8",
    textIcon: "MT",
    website: "https://www.maritaca.ai",
    notice: {
      apiKeyUrl: "https://chat.maritaca.ai/api-keys",
      text: "MariTalk by Maritaca AI — Sabiá models, strong in Portuguese. OpenAI-compatible; sends the key as Authorization: Key <token>.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://chat.maritaca.ai/api/chat/completions",
    validateUrl: "https://chat.maritaca.ai/api/models",
    auth: { combined: true, header: "Authorization", scheme: "key" },
  },
  models: [
    { id: "sabia-4", name: "Sabiá 4" },
    { id: "sabia-4-thinking", name: "Sabiá 4 Thinking" },
    { id: "sabiazinho-4", name: "Sabiazinho 4" },
  ],
  serviceKinds: ["llm"],
};
