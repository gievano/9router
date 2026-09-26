// Lemonade Server — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "lemonade",
  priority: 50,
  alias: "lemonade",
  display: {
    name: "Lemonade Server",
    icon: "bolt",
    color: "#F59E0B",
    textIcon: "LM",
    website: "https://lemonade-server.ai",
    notice: { text: "Lemonade Server — local LLM serving (cloud-models compatible). Base URL overridable per connection." },
  },
  category: "apikey",
  hasFree: true,
  freeNote: "Runs on your own hardware — no per-token cost.",
  transport: {
    baseUrl: "http://localhost:13305/api/v1/chat/completions",
    format: "openai",
  },
  passthroughModels: true,
  serviceKinds: ["llm"],
};
