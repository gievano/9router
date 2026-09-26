// Baseten — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "baseten",
  priority: 50,
  alias: "baseten",
  display: {
    name: "Baseten",
    icon: "deployed_code",
    color: "#111827",
    textIcon: "BT",
    website: "https://baseten.co",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://inference.baseten.co/v1/chat/completions",
    validateUrl: "https://inference.baseten.co/v1/models",
  },
  models: [
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax-M2.5" },
    { id: "nvidia/Nemotron-120B-A12B", name: "Nemotron Super" },
    { id: "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B", name: "Nemotron Ultra" },
    { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5" },
    { id: "moonshotai/Kimi-K2.7-Code", name: "Kimi K2.7 Code" },
    { id: "moonshotai/Kimi-K3", name: "Kimi K3" },
  ],
  hasFree: true,
  freeNote: "$30 free trial credits for GPU inference",
};
