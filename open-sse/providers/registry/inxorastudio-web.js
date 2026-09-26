// InxoraStudio Labs (Web) — web dashboard chat provider.
//
// Auth: Bearer JWT token from labs.inxorastudio.com dashboard login.
// The user copies the Authorization header value (eyJ...) from DevTools.
//
// Chat flow (3-step, custom executor required — NOT yet implemented):
//   1. POST /api/conversations { model } → { id }
//   2. POST /api/conversations/{id}/messages/stream { content, model, mode, search, attachments }
//      → SSE stream of { t: "chunk" | "gen" | "user_message" | "done", d: ... }
//   3. Parse: t="chunk" → content delta; t="done" → usage + finish
//
// Profile: GET /api/auth/me → { user: { email, name, plan, apiKey } }
// Models:  GET /api/ai/models → { models: [...], plan } (same as API provider)
//
// NOTE: The custom executor for the 3-step chat flow is pending. Until it
// lands, this provider appears in the dashboard and can be validated/profiled,
// but chat requests will not route correctly. Use the API-key provider
// ("inxorastudio") for functional chat.
export default {
  id: "inxorastudio-web",
  priority: 345,
  alias: "ix-web",
  aliases: ["ixweb"],
  uiAlias: "ix-web",
  display: {
    name: "InxoraStudio Labs (Web)",
    icon: "science",
    color: "#A78BFA",
    textIcon: "IX",
    website: "https://labs.inxorastudio.com",
    notice: {
      signupUrl: "https://labs.inxorastudio.com",
      text: "InxoraStudio Labs web dashboard chat. Log in at labs.inxorastudio.com, then open DevTools → Network → copy the Authorization Bearer token (eyJ...) from any API request. Paste it here.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste your Bearer JWT token (eyJ...) from labs.inxorastudio.com DevTools",
  transport: {
    baseUrl: "https://labs.inxorastudio.com/api/conversations",
    format: "inxorastudio-web",
    authType: "cookie",
  },
  // Models discovered live from /api/ai/models (same endpoint as API provider).
  // The JWT token authenticates the discovery fetch.
  models: [],
  passthroughModels: true,
  modelsFetcher: {
    url: "https://labs.inxorastudio.com/api/ai/models",
    type: "inxora",
  },
};
