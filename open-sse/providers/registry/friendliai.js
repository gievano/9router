// FriendliAI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "friendliai",
  priority: 50,
  alias: "friendli",
  display: {
    name: "FriendliAI",
    icon: "handshake",
    color: "#EC4899",
    textIcon: "FR",
    website: "https://friendli.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.friendli.ai/serverless/v1/chat/completions",
    validateUrl: "https://api.friendli.ai/serverless/v1/models",
  },
  models: [
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax-M2.5" },
    { id: "google/gemma-4-31B-it", name: "Gemma 4 31B IT" },
    { id: "deepseek-ai/DeepSeek-V3.2", name: "DeepSeek-V3.2" },
    { id: "zai-org/GLM-5.1", name: "GLM-5.1" },
    { id: "zai-org/GLM-5.2", name: "GLM-5.2" },
  ],
  hasFree: true,
  freeNote: "Free tier for serverless inference — no credit card required",
};
