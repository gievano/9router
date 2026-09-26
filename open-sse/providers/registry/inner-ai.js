// Inner.ai (app.innerai.com) — AI gateway with a token-cookie auth model.
// Ported from OmniRoute catalog + executor (open-sse/executors/inner-ai.js).
// Auth: the `token` cookie scoped to .innerai.com (JWT); the executor resolves
// email + deviceId from the JWT/profile API and dynamically fetches the live
// model catalog (cached 1h), so this is a gateway to GPT/Claude/Gemini/etc.
export default {
  id: "inner-ai",
  priority: 150,
  alias: "in-ai",
  display: {
    name: "Inner.ai",
    icon: "auto_awesome",
    color: "#0EA5E9",
    textIcon: "IA",
    website: "https://app.innerai.com",
    notice: {
      signupUrl: "https://app.innerai.com",
      apiKeyUrl: "https://app.innerai.com",
      text: "Inner.ai gateway — GPT, Claude, Gemini, DeepSeek, Grok, Llama, Mistral. Auth: the `token` cookie scoped to .innerai.com (DevTools → Application → Cookies → .innerai.com → token). Paste it directly, or as `token=<value> user@example.com` to include your account email. The executor resolves the live model catalog per account (plan-gated) and caches it for 1 hour. ⚠️ Reverse-engineered protocol — upstream may change without notice.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint:
    'Copy the "token" cookie value from .innerai.com (DevTools → Application → Cookies → .innerai.com → token) and paste it here. Optional: "token=<value> user@example.com".',
  transport: {
    baseUrl: "https://chatapi.innerai.com",
    format: "inner-ai",
    authType: "cookie",
  },
  models: [
    { id: "gpt-4o", name: "GPT-4o (via Inner.ai)" },
    { id: "gpt-4.1", name: "GPT-4.1 (via Inner.ai)" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini (via Inner.ai)" },
    { id: "o3", name: "o3 (via Inner.ai)", supportsReasoning: true },
    { id: "o4-mini", name: "o4-mini (via Inner.ai)", supportsReasoning: true },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5 (via Inner.ai)" },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5 (via Inner.ai)" },
    { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet (via Inner.ai)" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (via Inner.ai)" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (via Inner.ai)" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (via Inner.ai)" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (via Inner.ai)" },
    { id: "deepseek-r1", name: "DeepSeek R1 (via Inner.ai)", supportsReasoning: true },
    { id: "deepseek-v3", name: "DeepSeek V3 (via Inner.ai)" },
    { id: "grok-3", name: "Grok 3 (via Inner.ai)" },
    { id: "grok-3-mini", name: "Grok 3 Mini (via Inner.ai)", supportsReasoning: true },
    { id: "llama-4-maverick", name: "Llama 4 Maverick (via Inner.ai)" },
    { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B (via Inner.ai)" },
    { id: "mistral-large-2411", name: "Mistral Large (via Inner.ai)" },
  ],
  passthroughModels: true,
};
