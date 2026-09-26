// Wafer AI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "wafer",
  priority: 50,
  alias: "wafer",
  display: {
    name: "Wafer AI",
    icon: "layers",
    color: "#6366F1",
    textIcon: "WF",
    website: "https://wafer.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://pass.wafer.ai/v1/messages",
    validateUrl: "https://pass.wafer.ai/v1/models",
  },
  models: [
    { id: "DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
    { id: "MiniMax-M2.7", name: "MiniMax M2.7" },
    { id: "Qwen3.5-397B-A17B", name: "Qwen3.5 397B A17B" },
    { id: "GLM-5.1", name: "GLM 5.1" },
  ],
};
