// NanoGPT — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "nanogpt",
  priority: 50,
  alias: "nanogpt",
  display: {
    name: "NanoGPT",
    icon: "chat",
    color: "#4F46E5",
    textIcon: "NG",
    website: "https://nano-gpt.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://nano-gpt.com/api/v1/chat/completions",
    validateUrl: "https://nano-gpt.com/api/v1/models",
  },
  passthroughModels: true,
};
