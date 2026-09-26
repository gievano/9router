// 1min.ai — AI platform with 38+ coding models (api.1min.ai).
//
// Auth: Bearer JWT token from app.1min.ai dashboard login.
// The user copies the x-auth-token value (eyJ...) from DevTools.
//
// Chat flow (3-step, custom executor):
//   1. POST /teams/{teamId}/features/conversations { type, title }
//      → { conversation: { uuid } }
//   2. POST /teams/{teamId}/features?isStreaming=true
//      { type, conversationId, model, promptObject: { prompt, webSearch }, metadata }
//      → plain-text streaming response (NOT SSE — raw chunks)
//   3. Parse plain-text chunks → OpenAI chat.completion.chunk SSE
//
// Profile: GET /teams/{teamId}/credits → credit balance
// Models: GET /models?feature=CODE_GENERATOR → 38 coding models

export default {
  id: "1min",
  priority: 365,
  alias: "1min",
  aliases: ["1m"],
  uiAlias: "1m",
  display: {
    name: "1min.ai",
    icon: "bolt",
    color: "#8B5CF6",
    textIcon: "1M",
    website: "https://1min.ai",
    notice: {
      signupUrl: "https://1min.ai?referrer_id=3cf6f69c-2006-4ce2-93d5-de493365e967",
      text: "1min.ai is an AI platform with 38+ coding models (Claude, GPT, Gemini, DeepSeek, Qwen, GLM, Grok). Log in at app.1min.ai, then open DevTools → Network → copy the x-auth-token Bearer value (eyJ...) from any API request. Paste it here.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste your Bearer JWT token (eyJ...) from app.1min.ai DevTools (x-auth-token header)",
  transport: {
    baseUrl: "https://api.1min.ai/teams",
    format: "1min",
    authType: "cookie",
  },
  // Seed catalog — top models. Live discovery via /models endpoint.
  models: [
    { id: "claude-5-sonnet", name: "Claude 5 Sonnet" },
    { id: "claude-4-6-sonnet", name: "Claude 4.6 Sonnet" },
    { id: "claude-4-8-opus", name: "Claude 4.8 Opus" },
    { id: "gpt-5-6-sol", name: "GPT-5.6 Sol" },
    { id: "gpt-5-6-terra", name: "GPT-5.6 Terra" },
    { id: "gpt-5-6-luna", name: "GPT-5.6 Luna" },
    { id: "gpt-5-5", name: "GPT-5.5" },
    { id: "deepseek-v3-2-reasoner", name: "DeepSeek V3.2 Reasoner" },
    { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus" },
    { id: "gemini-3-5-flash", name: "Gemini 3.5 Flash" },
    { id: "glm-5-2", name: "GLM-5.2" },
    { id: "xai-grok-code-fast-1", name: "Grok Code Fast 1" },
  ],
  passthroughModels: true,
  modelsFetcher: {
    url: "https://api.1min.ai/models?feature=CODE_GENERATOR",
    type: "1min",
  },
};
