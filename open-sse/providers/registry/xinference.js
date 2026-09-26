// XInference — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "xinference",
  priority: 50,
  alias: "xinference",
  display: {
    name: "XInference",
    icon: "hub",
    color: "#DC2626",
    textIcon: "XI",
    website: "https://inference.readthedocs.io",
    notice: { text: "XInference — local model serving platform, OpenAI-compatible endpoint (default port 9997). Base URL overridable per connection." },
  },
  category: "apikey",
  hasFree: true,
  freeNote: "Runs on your own hardware — no per-token cost.",
  transport: {
    baseUrl: "http://localhost:9997/v1/chat/completions",
    format: "openai",
  },
  passthroughModels: true,
  serviceKinds: ["llm"],
};
