// Infron AI — multi-model AI router (llm.onerouter.pro).
//
// OpenAI-compatible + Anthropic-native gateway behind a single API key.
// Hosts 457+ models from Google, OpenAI, Anthropic, DeepSeek, Moonshot, etc.
//
// Multi-endpoint transport with cross-transport fallback: if the OpenAI
// endpoint times out or 5xxs, the engine retries via the Anthropic endpoint
// automatically (body is re-translated to Claude format).
//
// Models discovered live via /v1/models at runtime.
import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "infron",
  priority: 355,
  alias: "infron",
  aliases: ["ifr"],
  uiAlias: "ifr",
  display: {
    name: "Infron AI",
    icon: "hub",
    color: "#06B6D4",
    textIcon: "IF",
    website: "https://onerouter.pro",
    notice: {
      signupUrl: "https://onerouter.pro",
      apiKeyUrl: "https://onerouter.pro",
      text: "Infron AI is a multi-model AI router with OpenAI and Anthropic API support. 457+ models including Claude, GPT, Gemini, DeepSeek, Kimi, and more. Create an API key at onerouter.pro, then paste it here.",
    },
  },
  category: "freeTier",
  hasFree: true,
  authType: "apikey",
  transport: {
    baseUrl: "https://llm.onerouter.pro/v1/chat/completions",
    format: "openai",
    validateUrl: "https://llm.onerouter.pro/v1/models",
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
    usage: {
      balanceUrl: "https://api.onerouter.pro/v1/balance",
    },
  },
  // Multi-endpoint: both OpenAI and Anthropic formats supported.
  transports: [
    {
      format: "openai",
      baseUrl: "https://llm.onerouter.pro/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://llm.onerouter.pro/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [],
  passthroughModels: true,
  modelsFetcher: {
    url: "https://llm.onerouter.pro/v1/models",
    type: "openai",
  },
  features: {
    usage: true,
    usageApikey: true,
  },
};
