// UniModel.ai — unified AI model hub for aggregation & distribution.
//
// Aggregator gateway with cross-format conversion (LLMs exposed as
// OpenAI/Claude/Gemini-compatible). Singapore node endpoint.
//
// Endpoint: POST https://sg.unimodel.ai/v1/chat/completions
// Models:   GET  https://sg.unimodel.ai/v1/models  (requires auth → 401 without key)
// Auth: Bearer <api key>
//
// No custom executor needed — DefaultExecutor handles OpenAI-compatible APIs.
// Model discovery at runtime via modelsFetcher (live /v1/models endpoint).
export default {
  id: "unimodel",
  priority: 280,
  alias: "unimodel",
  aliases: ["um", "unimodel-ai"],
  uiAlias: "um",
  display: {
    name: "UniModel",
    icon: "hub",
    color: "#7C4DFF",
    textIcon: "UM",
    website: "https://unimodel.ai",
    notice: {
      signupUrl: "https://unimodel.ai",
      apiKeyUrl: "https://unimodel.ai",
      text: "UniModel.ai aggregates LLMs from one key, converting them to OpenAI-compatible endpoints. Get a key from the UniModel dashboard. Models are auto-discovered at runtime.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://sg.unimodel.ai/v1/chat/completions",
    format: "openai",
    validateUrl: "https://sg.unimodel.ai/v1/models",
  },
  modelsFetcher: { url: "https://sg.unimodel.ai/v1/models", type: "openai" },
  // Seed models — offline fallback + popular picks. Full list discoverable at runtime.
  models: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "deepseek-chat", name: "DeepSeek Chat" },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
  ],
  passthroughModels: true,
};
