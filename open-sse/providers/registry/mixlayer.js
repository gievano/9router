// Mixlayer — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "mixlayer",
  priority: 50,
  alias: "mixlayer",
  display: {
    name: "Mixlayer",
    icon: "router",
    color: "#0EA5E9",
    textIcon: "MX",
    website: "https://www.mixlayer.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://models.mixlayer.ai/v1/chat/completions",
    validateUrl: "https://models.mixlayer.ai/v1/models",
  },
  models: [
    { id: "qwen/qwen3.5-35b-a3b", name: "Qwen3.5 35B A3B" },
    { id: "qwen/qwen3.5-397b-a17b", name: "Qwen3.5 397B A17B" },
    { id: "qwen/qwen3.5-9b", name: "Qwen3.5 9B" },
    { id: "qwen/qwen3.5-27b", name: "Qwen3.5 27B" },
    { id: "qwen/qwen3.5-122b-a10b", name: "Qwen3.5 122B A10B" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "The qwen/qwen3.5-4b-free model is free for prototyping and rate-limited; no fixed public RPM or daily quota is confirmed.",
};
