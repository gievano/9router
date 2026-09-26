// oobabooga — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "oobabooga",
  priority: 50,
  alias: "ooba",
  display: {
    name: "oobabooga",
    icon: "smart_toy",
    color: "#8B5CF6",
    textIcon: "OO",
    website: "https://github.com/oobabooga/text-generation-webui",
    notice: { text: "oobabooga Text Generation WebUI — OpenAI-compatible local endpoint (default port 5000). Base URL overridable per connection." },
  },
  category: "apikey",
  hasFree: true,
  freeNote: "Runs on your own hardware — no per-token cost.",
  transport: {
    baseUrl: "http://localhost:5000/v1/chat/completions",
    format: "openai",
  },
  passthroughModels: true,
  serviceKinds: ["llm"],
};
