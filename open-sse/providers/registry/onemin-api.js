// 1min.ai (API) — official API-key access to 1min.ai's model catalog.
//
// Sibling of the cookie/JWT provider ("1min"). This variant uses the official
// developer API key issued from the 1min.ai dashboard (docs.1min.ai). It is
// preferred over the cookie provider for production use: keys are revocable,
// rate-limited predictably, and survive dashboard logouts.
//
// Auth: custom `API-KEY: <key>` header (NOT Authorization: Bearer).
//
// Chat flow (single request, custom executor):
//   POST /api/chat-with-ai?isStreaming=true
//     { type:"UNIFY_CHAT_WITH_AI", model,
//       promptObject:{ prompt, conversationId?, settings? } }
//   → SSE stream: event: content | result | done | error
//     data: {"content":"..."} / {"aiRecord":{...}} / {"message":"..."}
//
// The custom executor translates the 1min SSE dialect into OpenAI
// chat.completion.chunk SSE so the rest of the gateway is format-agnostic.
//
// Non-streaming requests hit /api/chat-with-ai (no query param) and return a
// single JSON { aiRecord: { resultObject: [...] } }.
//
// Profile: GET /api/profile → account + remaining credits (API-key scoped).
// Models: GET /models?feature=UNIFY_CHAT_WITH_AI → model catalog.

export default {
  id: "1min-api",
  priority: 364,
  alias: "1min-api",
  aliases: ["1m-api", "1minai"],
  uiAlias: "1m-api",
  display: {
    name: "1min.ai (API)",
    icon: "bolt",
    color: "#7C3AED",
    textIcon: "1M",
    website: "https://1min.ai",
    notice: {
      signupUrl: "https://1min.ai?referrer_id=3cf6f69c-2006-4ce2-93d5-de493365e967",
      apiKeyUrl: "https://1min.ai?referrer_id=3cf6f69c-2006-4ce2-93d5-de493365e967",
      text: "1min.ai official API. Create an API key in your dashboard (app.1min.ai → API), then paste it here. Uses the chat-with-ai streaming endpoint with 38+ models (Claude, GPT, Gemini, DeepSeek, Qwen, GLM, Grok).",
    },
  },
  category: "freeTier",
  hasFree: true,
  authType: "apikey",
  authHint: "Paste your 1min.ai API key (from app.1min.ai → API). Starts with letters/numbers — no 'Bearer' prefix.",
  transport: {
    baseUrl: "https://api.1min.ai/api/chat-with-ai",
    format: "1min-api",
    authType: "apikey",
    auth: {
      header: "API-KEY",
      scheme: "raw",
    },
    validateUrl: "https://api.1min.ai/api/profile",
  },
  // Seed catalog — mirrors the cookie provider. Live discovery via /models.
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
    url: "https://api.1min.ai/models?feature=UNIFY_CHAT_WITH_AI",
    type: "1min",
  },
};
