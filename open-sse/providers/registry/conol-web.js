// Conol Web (conol.ai) — browser-session agent chat.
// Ported from OmniRoute catalog + executor (open-sse/executors/conol-web.js).
// Auth: the `__Secure-better-auth.session_token` cookie from a logged-in
// conol.ai browser session. Sessions are created empty and configured via
// POST /api/sessions/{id}/model (preset → model → effort) before each turn.
export default {
  id: "conol-web",
  priority: 150,
  alias: "cnl",
  display: {
    name: "Conol Web",
    icon: "auto_awesome",
    color: "#6D4AFF",
    textIcon: "CN",
    website: "https://conol.ai",
    notice: {
      signupUrl: "https://conol.ai",
      apiKeyUrl: "https://conol.ai",
      text: "Conol browser-session chat. Open conol.ai, log in, then copy the `__Secure-better-auth.session_token` cookie (or the full Cookie header) from DevTools → Application → Cookies → conol.ai and paste it here. Sessions are created and configured automatically (preset → model → effort); the executor reuses one session per logical chat. ⚠️ Reverse-engineered protocol — upstream may change without notice.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint:
    'Copy the "__Secure-better-auth.session_token" cookie value from conol.ai → DevTools → Application → Cookies → conol.ai and paste it here.',
  transport: {
    baseUrl: "https://conol.ai",
    format: "conol-web",
    authType: "cookie",
  },
  models: [
    { id: "claude-fable-5", name: "Claude Fable 5" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "z-ai/glm-5.2", name: "GLM 5.2" },
  ],
  passthroughModels: true,
};
