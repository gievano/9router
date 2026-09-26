// vLLM — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "vllm",
  priority: 50,
  alias: "vllm",
  display: {
    name: "vLLM",
    icon: "memory",
    color: "#0F766E",
    textIcon: "VL",
    website: "https://github.com/vllm-project/vllm",
    notice: { text: "vLLM inference server — OpenAI-compatible endpoint. Base URL overridable per connection." },
  },
  category: "apikey",
  hasFree: true,
  freeNote: "Runs on your own hardware — no per-token cost.",
  transport: {
    baseUrl: "http://localhost:8000/v1/chat/completions",
    format: "openai",
  },
  passthroughModels: true,
  serviceKinds: ["llm"],
};
