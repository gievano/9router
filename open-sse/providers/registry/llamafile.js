// Llamafile — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "llamafile",
  priority: 50,
  alias: "llamafile",
  display: {
    name: "Llamafile",
    icon: "description",
    color: "#EA580C",
    textIcon: "LF",
    website: "https://github.com/Mozilla-Ocho/llamafile",
    notice: { text: "Llamafile — single-file local LLM runner with OpenAI-compatible API (default port 8080). Base URL overridable per connection." },
  },
  category: "apikey",
  hasFree: true,
  freeNote: "Runs on your own hardware — no per-token cost.",
  transport: {
    baseUrl: "http://127.0.0.1:8080/v1/chat/completions",
    format: "openai",
  },
  passthroughModels: true,
  serviceKinds: ["llm"],
};
