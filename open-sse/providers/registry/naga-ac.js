// Naga.ac — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "naga-ac",
  priority: 50,
  alias: "naga",
  display: {
    name: "Naga.ac",
    icon: "bolt",
    color: "#7C3AED",
    textIcon: "NA",
    website: "https://naga.ac",
      notice: { text: "Get API key at naga.ac — Google/GitHub/Discord signup available.", },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.naga.ac/v1/chat/completions",
    validateUrl: "https://api.naga.ac/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free models include Nemotron 3 Ultra (free) and Llama 3.3 70B Instruct (Free). Paid models require credits. Google/GitHub/Discord signup.",
};
