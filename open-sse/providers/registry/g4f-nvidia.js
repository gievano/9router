// g4f.space/api/nvidia — no-key reverse proxy to NVIDIA NIM (gpt4free
// project). The existing `nvidia` entry requires signup; this is the genuine
// no-key gap. Free tier ~5 req/min. Port of the OmniRoute batch.
export default {
  id: "g4f-nvidia",
  priority: 60,
  alias: "g4fnv",
  uiAlias: "g4fnv",
  display: {
    name: "g4f.space — NVIDIA",
    icon: "memory",
    color: "#76B900",
    textIcon: "G4",
    website: "https://g4f.space",
    notice: {
      text: "Free no-key reverse proxy to NVIDIA NIM (gpt4free project) — rate-limited to ~5 req/min. No API key required.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://g4f.space/api/nvidia/v1/chat/completions",
    format: "openai",
    noAuth: true,
  },
  models: [
    { id: "nvidia/nemotron-3-nano-30b-a3b", name: "Nemotron 3 Nano 30B (g4f/NVIDIA)" },
    { id: "z-ai/glm-5.2", name: "GLM 5.2 (g4f/NVIDIA)" },
    { id: "minimaxai/minimax-m2.7", name: "MiniMax M2.7 (g4f/NVIDIA)" },
  ],
  passthroughModels: true,
};
