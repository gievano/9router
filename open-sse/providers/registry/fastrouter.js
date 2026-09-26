// FastRouter — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "fastrouter",
  priority: 50,
  alias: "fastrouter",
  display: {
    name: "FastRouter",
    icon: "speed",
    color: "#F97316",
    textIcon: "FR",
    website: "https://fastrouter.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.fastrouter.ai/api/v1/chat/completions",
    validateUrl: "https://api.fastrouter.ai/api/v1/models",
  },
  models: [
    { id: "z-ai/glm-5", name: "GLM-5" },
    { id: "z-ai/glm-5.1", name: "GLM-5.1" },
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "google/gemini-3-pro-image-preview", name: "Nano Banana Pro" },
    { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
    { id: "google/gemma-4-31b-it", name: "Gemma 4 31B IT" },
  ],
  passthroughModels: true,
  hasFree: true,
  freeNote: "Models with the :free suffix allow 10 requests/day per organization and model; availability may change.",
};
