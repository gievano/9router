// Tencent AI Studio Web — cookie-based reverse of the consumer web chat at
// aistudio.tencent.ai (free web session, no API key needed).
//
// The TencentAIStudioWebExecutor (open-sse/executors/tencent-aistudio-web.js)
// POSTs OpenAI-style chat bodies to `https://aistudio.tencent.ai/api/chat/{model}`
// using the pasted session Cookie header. Port of OmniRoute PR #10174.
//
// Auth input (apiKey field): the FULL Cookie header from aistudio.tencent.ai
// (DevTools → Network → any request → Request Headers → Cookie). A leading
// "Cookie:" prefix is stripped automatically.
export default {
  id: "tencent-aistudio-web",
  priority: 60,
  alias: "tasw",
  uiAlias: "tasw",
  display: {
    name: "Tencent AI Studio (Free)",
    icon: "auto_awesome",
    color: "#0052D9",
    textIcon: "TAS",
    website: "https://aistudio.tencent.ai",
    notice: {
      signupUrl: "https://aistudio.tencent.ai",
      apiKeyUrl: "https://aistudio.tencent.ai",
      text: "Free web session on Tencent AI Studio (aistudio.tencent.ai) — direct chat with Hunyuan models (hy3-g, Hunyuan Default, Hunyuan 3D). Open aistudio.tencent.ai, log in, then copy your full Cookie header (DevTools → Network → any request → Request Headers → Cookie). Paste the full cookie string here. Responses are streamed from the web /api/chat endpoint and translated to OpenAI format.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Log in to aistudio.tencent.ai, open DevTools → Network, copy any request Cookie header containing session tokens.",
  hasFree: true,
  transport: {
    baseUrl: "https://aistudio.tencent.ai",
    format: "openai",
    authType: "cookie",
  },
  // Plain chat only — no tool/function calling on the web endpoint.
  models: [
    { id: "hy3-g", name: "HY3-G (via Tencent AI Studio)", toolCalling: false },
    { id: "hunyuan-default", name: "Hunyuan Default (via Tencent AI Studio)", toolCalling: false },
    { id: "hunyuan-3d", name: "Hunyuan 3D (via Tencent AI Studio)", toolCalling: false },
  ],
};
