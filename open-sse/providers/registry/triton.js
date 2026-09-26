// NVIDIA Triton — local OpenAI-compatible inference server.
// Imported from OmniRoute catalog (2026-08). Default base URL is the localhost
// default; override per connection via providerSpecificData.baseUrl when the
// server runs on a different host/port.
export default {
  id: "triton",
  priority: 50,
  alias: "triton",
  display: {
    name: "NVIDIA Triton",
    icon: "memory",
    color: "#76B900",
    textIcon: "TR",
    website: "https://developer.nvidia.com/triton-inference-server",
    notice: { text: "NVIDIA Triton Inference Server — OpenAI-compatible endpoint. Base URL overridable per connection." },
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
