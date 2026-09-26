// g4f.space/api/pollinations — no-key reverse proxy to Pollinations
// (gpt4free project). Separate route from the direct pollinations.ai entry;
// OpenAI-compatible, ~5 req/min. Port of the OmniRoute batch.
export default {
  id: "g4f-pollinations",
  priority: 60,
  alias: "g4fpol",
  uiAlias: "g4fpol",
  display: {
    name: "g4f.space — Pollinations",
    icon: "local_florist",
    color: "#A855F7",
    textIcon: "G4",
    website: "https://g4f.space",
    notice: {
      text: "Free no-key reverse proxy to Pollinations (gpt4free project) — rate-limited to ~5 req/min. No API key required.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://g4f.space/api/pollinations/v1/chat/completions",
    format: "openai",
    noAuth: true,
  },
  models: [
    { id: "openai", name: "OpenAI (g4f/Pollinations)" },
    { id: "openai-fast", name: "OpenAI Fast (g4f/Pollinations)" },
  ],
  passthroughModels: true,
};
