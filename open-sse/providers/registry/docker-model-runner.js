// Docker Model Runner — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "docker-model-runner",
  priority: 50,
  alias: "dmr",
  display: {
    name: "Docker Model Runner",
    icon: "dns",
    color: "#2496ED",
    textIcon: "DM",
    website: "https://docs.docker.com/ai/model-runner/",
    notice: { text: "Docker Model Runner — local AI model runner with OpenAI-compatible API (default port 12434). Base URL overridable per connection." },
  },
  category: "apikey",
  hasFree: true,
  freeNote: "Runs on your own hardware — no per-token cost.",
  transport: {
    baseUrl: "http://localhost:12434/v1/chat/completions",
    format: "openai",
  },
  passthroughModels: true,
  serviceKinds: ["llm"],
};
