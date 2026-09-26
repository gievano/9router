// Synthetic — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "synthetic",
  priority: 50,
  alias: "synthetic",
  display: {
    name: "Synthetic",
    icon: "verified_user",
    color: "#6366F1",
    textIcon: "SY",
    website: "https://synthetic.new",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.synthetic.new/openai/v1/chat/completions",
    validateUrl: "https://api.synthetic.new/openai/v1/models",
  },
  models: [
    { id: "hf:openai/gpt-oss-120b", name: "openai/gpt-oss-120b" },
    { id: "hf:zai-org/GLM-5.2", name: "zai-org/GLM-5.2" },
    { id: "hf:moonshotai/Kimi-K2.7-Code", name: "moonshotai/Kimi-K2.7-Code" },
    { id: "hf:Qwen/Qwen3.6-27B", name: "Qwen/Qwen3.6-27B" },
    { id: "hf:MiniMaxAI/MiniMax-M3", name: "MiniMaxAI/MiniMax-M3" },
    { id: "hf:zai-org/GLM-4.7-Flash", name: "zai-org/GLM-4.7-Flash" },
    { id: "hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4", name: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4" },
  ],
  passthroughModels: true,
};
