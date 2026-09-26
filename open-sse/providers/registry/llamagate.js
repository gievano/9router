// LlamaGate — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "llamagate",
  priority: 50,
  alias: "llamagate",
  display: {
    name: "LlamaGate",
    icon: "gate",
    color: "#16A34A",
    textIcon: "LG",
    website: "https://llamagate.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://llamagate.ai/v1/chat/completions",
    validateUrl: "https://llamagate.ai/v1/models",
  },
  passthroughModels: true,
};
