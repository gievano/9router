// ModelScope — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "modelscope",
  priority: 50,
  alias: "modelscope",
  display: {
    name: "ModelScope",
    icon: "cloud",
    color: "#FF6A00",
    textIcon: "MS",
    website: "https://modelscope.cn",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api-inference.modelscope.cn/v1/chat/completions",
    validateUrl: "https://api-inference.modelscope.cn/v1/models",
  },
  models: [
    { id: "ZhipuAI/GLM-4.5", name: "GLM-4.5" },
    { id: "ZhipuAI/GLM-4.6", name: "GLM-4.6" },
    { id: "Qwen/Qwen3-235B-A22B-Instruct-2507", name: "Qwen3 235B A22B Instruct 2507" },
    { id: "Qwen/Qwen3-Coder-30B-A3B-Instruct", name: "Qwen3 Coder 30B A3B Instruct" },
    { id: "Qwen/Qwen3-30B-A3B-Thinking-2507", name: "Qwen3 30B A3B Thinking 2507" },
    { id: "Qwen/Qwen3-30B-A3B-Instruct-2507", name: "Qwen3 30B A3B Instruct 2507" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free tier via ModelScope API-Inference — Alibaba account required.",
};
