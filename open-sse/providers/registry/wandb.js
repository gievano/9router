// Weights & Biases Inference — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "wandb",
  priority: 50,
  alias: "wandb",
  display: {
    name: "Weights & Biases Inference",
    icon: "monitoring",
    color: "#FFBE0B",
    textIcon: "WB",
    website: "https://wandb.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.inference.wandb.ai/v1/chat/completions",
    validateUrl: "https://api.inference.wandb.ai/v1/models",
  },
  models: [
    { id: "MiniMaxAI/MiniMax-M3", name: "MiniMax M3" },
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B", name: "Nemotron 3 Ultra" },
    { id: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8", name: "Nemotron 3 Super" },
    { id: "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B", name: "Nemotron 3.5 Lightning" },
    { id: "google/gemma-4-31B-it", name: "Gemma 4 31B" },
  ],
};
