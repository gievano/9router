// Ollama Cloud — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "ollama-cloud",
  priority: 50,
  alias: "ollamacloud",
  display: {
    name: "Ollama Cloud",
    icon: "cloud",
    color: "#58A6FF",
    textIcon: "OC",
    website: "https://ollama.com/settings/keys",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://ollama.com/v1/chat/completions",
    validateUrl: "https://ollama.com/api/tags",
  },
  models: [
    { id: "gpt-oss:20b", name: "GPT-OSS 20B" },
    { id: "gpt-oss:120b", name: "GPT-OSS 120B" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "kimi-k2.6", name: "Kimi K2.6" },
    { id: "glm-5.1", name: "GLM 5.1" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "minimax-m3", name: "MiniMax M3" },
    { id: "minimax-m2.7", name: "MiniMax M2.7" },
    { id: "gemma4:31b", name: "Gemma 4 31B" },
    { id: "nemotron-3-super", name: "NVIDIA Nemotron 3 Super" },
    { id: "qwen3.5:397b", name: "Qwen 3.5 397B" },
  ],
  passthroughModels: true,
  hasFree: true,
};
