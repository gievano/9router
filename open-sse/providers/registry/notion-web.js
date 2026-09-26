// Notion AI Web (app.notion.com) — cookie-authenticated browser-session chat.
// Ported from OmniRoute catalog + executor (open-sse/executors/notion-web.js).
// Auth: the `token_v2` session cookie from a logged-in notion.so browser session
// (optionally + space_id / notion_user_id / notion_browser_id). The live model
// catalog comes from cookie-auth POST /api/v3/getAvailableModels; the entries
// below are the offline fallback when discovery fails. Catalog ids are real
// web-picker labels (fable-5, gpt-5.6-sol); food codenames stay internal for
// runInferenceTranscript via resolveNotionCodename.
export default {
  id: "notion-web",
  priority: 150,
  alias: "nw",
  display: {
    name: "Notion AI Web",
    icon: "auto_awesome",
    color: "#1A1919",
    textIcon: "NW",
    website: "https://www.notion.so",
    notice: {
      signupUrl: "https://www.notion.so",
      apiKeyUrl: "https://www.notion.so",
      text: "Notion AI browser-session chat. Open notion.so, log in, then copy the `token_v2` cookie (plus `space_id` / `notion_user_id` / `notion_browser_id` if present) from DevTools → Application → Cookies → notion.so and paste it here. Requests go through Chrome-TLS impersonation because Notion's edge rejects plain Node fetch. Multi-turn chats reuse one Notion thread. ⚠️ Reverse-engineered protocol — upstream may change without notice.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint:
    'Copy the "token_v2" cookie value from notion.so → DevTools → Application → Cookies → notion.so and paste it here. Optional: "space_id=...; notion_user_id=..." pairs.',
  transport: {
    baseUrl: "https://app.notion.com",
    format: "notion-web",
    authType: "cookie",
  },
  models: [
    { id: "fable-5", name: "Fable 5" },
    { id: "sonnet-5", name: "Sonnet 5" },
    { id: "opus-4.8", name: "Opus 4.8" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
    { id: "gpt-5.5", name: "GPT-5.5" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "grok-4.5", name: "Grok 4.5" },
    { id: "notion-ai", name: "Notion AI (default)" },
  ],
  passthroughModels: true,
};
