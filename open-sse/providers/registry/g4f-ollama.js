// g4f.space/api/ollama — no-key hosted Ollama gateway (gpt4free project).
// Fills the hosted-Ollama niche none of our local/cloud entries cover.
// OpenAI-compatible, ~5 req/min. Port of the OmniRoute batch.
export default {
  id: "g4f-ollama",
  priority: 60,
  alias: "g4foll",
  uiAlias: "g4foll",
  display: {
    name: "g4f.space — Ollama",
    icon: "smart_toy",
    color: "#6366F1",
    textIcon: "G4",
    website: "https://g4f.space",
    notice: {
      text: "Free no-key hosted Ollama gateway (gpt4free project) — rate-limited to ~5 req/min. No API key required.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://g4f.space/api/ollama/v1/chat/completions",
    format: "openai",
    noAuth: true,
  },
  models: [{ id: "gemma3:4b", name: "Gemma 3 4B (g4f/Ollama)" }],
  passthroughModels: true,
};
