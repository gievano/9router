// g4f.space/api/gemini — no-key reverse proxy to Gemini (gpt4free project).
// Distinct from gemini-web (browser cookie): this is a plain no-key HTTP
// proxy. OpenAI-compatible; ~5 req/min. Port of the OmniRoute batch.
export default {
  id: "g4f-gemini",
  priority: 60,
  alias: "g4fgem",
  uiAlias: "g4fgem",
  display: {
    name: "g4f.space — Gemini",
    icon: "auto_awesome",
    color: "#4285F4",
    textIcon: "G4",
    website: "https://g4f.space",
    notice: {
      text: "Free no-key reverse proxy to Gemini (gpt4free project) — rate-limited to ~5 req/min. No API key required.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://g4f.space/api/gemini/v1/chat/completions",
    format: "openai",
    noAuth: true,
  },
  models: [
    { id: "models/gemini-2.5-flash", name: "Gemini 2.5 Flash (g4f)" },
    { id: "models/gemini-2.5-pro", name: "Gemini 2.5 Pro (g4f)" },
  ],
  passthroughModels: true,
};
