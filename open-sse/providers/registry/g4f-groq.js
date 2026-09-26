// g4f.space/api/groq — no-key reverse proxy to Groq (gpt4free project).
// OpenAI-compatible; rate-limited to ~5 req/min. Port of the OmniRoute
// no-key gateway batch.
export default {
  id: "g4f-groq",
  priority: 60,
  alias: "g4fgroq",
  uiAlias: "g4fgroq",
  display: {
    name: "g4f.space — Groq",
    icon: "rocket_launch",
    color: "#F97316",
    textIcon: "G4",
    website: "https://g4f.space",
    notice: {
      text: "Free no-key reverse proxy to Groq (gpt4free project) — rate-limited to ~5 req/min. No API key required.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://g4f.space/api/groq/v1/chat/completions",
    format: "openai",
    noAuth: true,
  },
  models: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (g4f/Groq)" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (g4f/Groq)" },
  ],
  passthroughModels: true,
};
