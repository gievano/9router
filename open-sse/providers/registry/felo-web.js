// Felo — free chat/search-agent aggregator (felo.ai), now Turnstile-gated.
//
// Since mid-2026 Felo requires a Cloudflare Turnstile *session* token
// (`cf_token`) on thread creation — anonymous access returns HTTP 400
// `turnstile_session_token_required`. The token is issued by the Turnstile
// widget when the user runs a search in a browser, then cached in
// sessionStorage under the key `turnstile_session_token`.
//
// The FeloWebExecutor opens a search thread (with cf_token) and reads the
// SSE-shaped answer stream. Optionally the user can also paste the session
// `authorization` Bearer token (`6h_...`) and/or the full Cookie header so
// the stream request authenticates and the profile badge can load.
//
// Auth input (apiKey field):
//   cf_token=<turnstile_session_token>[; bearer=<6h_...>][; cookie=<full cookie>]
//   The cookie/bearer parts are optional but recommended — user/info profile
//   and stream auth need them. Port of OmniRoute felo-web.
export default {
  id: "felo-web",
  priority: 60,
  alias: "felo",
  uiAlias: "felo",
  display: {
    name: "Felo (Free)",
    icon: "travel_explore",
    color: "#0EA5E9",
    textIcon: "FE",
    website: "https://felo.ai",
    notice: {
      signupUrl: "https://felo.ai",
      apiKeyUrl: "https://felo.ai",
      text: "Felo is a chat/search-agent aggregator backed by real frontier models (DeepSeek V4, GPT-5.6, Claude 5, Gemini 3.x…). Open felo.ai in a browser, run one search so the security check completes, then copy DevTools → Application → Session Storage → `turnstile_session_token` and paste it as `cf_token=<token>` (required for chat). For the profile badge, also copy the full Cookie header from any request (DevTools → Network → Request Headers) and append `; cookie=<full Cookie>` — the `felo-user-token` cookie identifies your account. `cf_token` alone is not enough for the badge.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint:
    "Easiest: press 'Capture from Felo' above — it reads your logged-in session straight from the running browser (Brave/Chrome/Edge; if none is reachable, 'Launch browser' detects your OS and starts one with remote debugging). Manual: paste your session cookie `cookie=felo-user-token=<6h_...>` (DevTools → Application → Cookies → felo.ai — enough for chat AND the profile badge, no Turnstile needed for logged-in accounts). Anonymous fallback: `cf_token=<turnstile_session_token>` (DevTools → Application → Session Storage → felo.ai — NOT a cookie). Example: cookie=felo-user-token=6h_...",
  transport: {
    baseUrl: "https://felo.ai",
    format: "openai",
    authType: "cookie",
  },
  // Models follow felo.ai/api-proxy/main/search/user/presets (Aug 2026).
  // `deepseek-v4-flash` is the free-tier default (is_pro: false); the rest are
  // Pro-tier. The executor routes via category + auto_routing, so the backend
  // picks the actual model — these are UI labels for model selection.
  models: [
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash (Felo)", toolCalling: false },
    { id: "gpt-5-6-terra", name: "GPT-5.6 Terra (Felo, Pro)", toolCalling: false },
    { id: "gpt-5-6-luna", name: "GPT-5.6 Luna (Felo, Pro)", toolCalling: false },
    { id: "claude-5-0-sonnet", name: "Claude 5 Sonnet (Felo, Pro)", toolCalling: false },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (Felo, Pro)", toolCalling: false },
    { id: "grok-4.6", name: "Grok 4.6 (Felo, Pro)", toolCalling: false },
    { id: "kimi-k2-thinking", name: "Kimi K2 (Felo, Pro)", toolCalling: false },
  ],
};
