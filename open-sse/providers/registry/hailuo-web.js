// Hailuo Web (hailuo.ai) — MiniMax's free consumer web chat.
// Ported from OmniRoute catalog + executor (open-sse/executors/hailuo-web.js).
// Auth: the `_token` value from hailuo.ai localStorage; requests are signed
// with a per-request `yy` MD5 header derived from the fingerprint + body.
export default {
  id: "hailuo-web",
  priority: 150,
  alias: "hailuo-web",
  display: {
    name: "Hailuo Web (MiniMax)",
    icon: "auto_awesome",
    color: "#5B21B6",
    textIcon: "HL",
    website: "https://hailuo.ai",
    notice: {
      signupUrl: "https://hailuo.ai",
      apiKeyUrl: "https://hailuo.ai",
      text: "Hailuo AI (MiniMax) free web chat. Open hailuo.ai, log in, then copy the `_token` value from DevTools → Application → Local Storage → hailuo.ai and paste it here. The executor signs each request with a per-request MD5 header; device-fingerprint params are derived stably from the token when not captured. ⚠️ Reverse-engineered protocol — upstream may change without notice.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint:
    'Copy the "_token" value from hailuo.ai → DevTools → Application → Local Storage → hailuo.ai and paste it here.',
  transport: {
    baseUrl: "https://www.hailuo.ai",
    format: "hailuo-web",
    authType: "cookie",
  },
  models: [
    { id: "hailuo", name: "Hailuo (MiniMax Web)" },
  ],
  passthroughModels: true,
};
