export default {
  id: "claude-web",
  priority: 146,
  alias: "claude-web",
  aliases: [
    "clw",
    "claude-cookie",
    "claudeai",
  ],
  uiAlias: "clw",
  display: {
    name: "Claude Web (Cookie)",
    icon: "bolt",
    color: "#D97757",
    textIcon: "CLW",
    website: "https://claude.ai",
    notice: {
      apiKeyUrl: "https://claude.ai",
    },
  },
  category: "webCookie",
  authType: "cookie",
  // LLM chat (this fork enables llm explicitly; source schema predates serviceKinds).
  serviceKinds: ["llm"],
  authHint:
    "Paste your claude.ai cookie header. It must contain sessionKey. Copy it from DevTools -> Network -> the document request -> Request Headers -> cookie. A Netscape cookie file also works.",
  transport: {
    baseUrl: "https://claude.ai/api",
    format: "openai",
    authType: "cookie",
  },
  models: [
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
    { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet" },
    { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku" },
  ],
  passthroughModels: true,
};
