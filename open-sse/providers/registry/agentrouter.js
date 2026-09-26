// AgentRouter — multi-model AI router (agentrouter.org).
//
// OpenAI-compatible + Anthropic-native gateway behind a single API key.
// Models: GLM 5.2, GPT 5.5, Claude Opus 4.6/4.7/4.8.
// Claude models support both OpenAI and Anthropic endpoint types.
//
// Multi-endpoint transport with cross-transport fallback: if the OpenAI
// endpoint times out or 5xxs, the engine retries via the Anthropic endpoint
// automatically (body is re-translated to Claude format).
import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "agentrouter",
  priority: 360,
  alias: "agentrouter",
  aliases: ["ar"],
  uiAlias: "ar",
  display: {
    name: "AgentRouter",
    icon: "hub",
    color: "#F97316",
    textIcon: "AR",
    website: "https://agentrouter.org",
    notice: {
      signupUrl: "https://agentrouter.org",
      apiKeyUrl: "https://agentrouter.org",
      text: "AgentRouter is a multi-model AI router with OpenAI and Anthropic API support. Create an API key at agentrouter.org, then paste it here. Models: GLM 5.2, GPT 5.5, Claude Opus 4.6/4.7/4.8.",
    },
  },
  category: "freeTier",
  hasFree: true,
  authType: "apikey",
  transport: {
    baseUrl: "https://agentrouter.org/v1/chat/completions",
    format: "openai",
    validateUrl: "https://agentrouter.org/v1/models",
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  // Multi-endpoint: OpenAI (/v1/chat/completions) + Anthropic (/v1/messages).
  transports: [
    {
      format: "openai",
      baseUrl: "https://agentrouter.org/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://agentrouter.org/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  // Seed catalog (from /api/pricing). Live discovery via modelsFetcher.
  models: [
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "gpt-5.5", name: "GPT 5.5" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
  ],
  passthroughModels: true,
  modelsFetcher: {
    url: "https://agentrouter.org/api/pricing",
    type: "agentrouter",
  },
};
