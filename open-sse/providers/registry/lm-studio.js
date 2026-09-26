// LM Studio — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "lm-studio",
  priority: 50,
  alias: "lmstudio",
  display: {
    name: "LM Studio",
    icon: "server",
    color: "#4A148C",
    textIcon: "LM",
    website: "https://lmstudio.ai",
    notice: { text: "LM Studio desktop app — OpenAI-compatible local server. Start the Local Server (port 1234) in the app, then use this connection. Base URL overridable per connection." },
  },
  category: "apikey",
  hasFree: true,
  freeNote: "Runs on your own hardware — no per-token cost.",
  transport: {
    baseUrl: "http://localhost:1234/v1/chat/completions",
    format: "openai",
  },
  passthroughModels: true,
  serviceKinds: ["llm"],
};
