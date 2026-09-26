// Agnes (Web) — agentic consumer AI app at app.agnes-ai.com.
//
// Agnes is an agentic AI assistant by Kiwiar. The web app authenticates via a
// JWT stored in the `token` cookie (or Authorization header). Chat requests
// are sent to the SSE streaming endpoint with a custom event format:
//   AgentStart → NodeStart → MessageDelta (content) → NodeEnd → AgentEnd
//
// Auth: Bearer JWT from app.agnes-ai.com cookie/token.
// The JWT has a 28-day lifetime (exp claim).
//
// The AgnesWebExecutor translates the SSE event stream into OpenAI
// chat.completion.chunk SSE so the rest of the gateway is format-agnostic.

export default {
  id: "agnes-web",
  priority: 58,
  alias: "agnes",
  aliases: ["agnes-web"],
  uiAlias: "agnes",
  display: {
    name: "Agnes (Web)",
    icon: "auto_awesome",
    color: "#6C5CE7",
    textIcon: "AG",
    website: "https://app.agnes-ai.com",
    notice: {
      signupUrl: "https://app.agnes-ai.com",
      text: "Agnes is an agentic AI assistant. Log in at app.agnes-ai.com, then copy the token cookie value (eyJ...) from DevTools. Paste it here. The JWT is valid for ~28 days.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste your Agnes JWT token (from app.agnes-ai.com cookie 'token' or Authorization Bearer header). Starts with eyJ...",
  transport: {
    baseUrl: "https://api.agnes-ai.com/api/v1/agnes/chat/stream",
    format: "agnes-web",
    authType: "cookie",
  },
  models: [
    { id: "agnes-super", name: "Agnes Super (Agent)" },
  ],
  passthroughModels: true,
};
