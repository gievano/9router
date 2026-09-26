// WorkBuddy — Tencent Cloud CodeBuddy's B2B/enterprise skin (workbuddy.ai).
// Shares the CodeBuddy CN gateway contract (OpenAI-compatible SSE chat + Tencent
// billing quota) but hits the www.workbuddy.ai domain. Auth is the same
// /v2/plugin browser-polling flow; platform is "workbuddy".
export default {
  id: "workbuddy",
  alias: "wb",
  uiAlias: "wb",
  hidden: false,
  priority: 90,
  display: {
    name: "WorkBuddy",
    icon: "smart_toy",
    color: "#006EFF",
    website: "https://www.workbuddy.ai",
    notice: {
      signupUrl: "https://www.workbuddy.ai",
    },
  },
  category: "oauth",
  authModes: ["oauth", "apikey"],
  hasOAuth: true,
  transport: {
    baseUrl: "https://www.workbuddy.ai/v2/chat/completions",
    forceStream: true,
    // Unified OpenAI-style gateway (same as CodeBuddy CN).
    thinkingFormat: "openai",
    headers: {
      "User-Agent": "CLI/2.108.1 WorkBuddy/2.108.1",
      "X-Product": "SaaS",
      "X-IDE-Type": "CLI",
      "X-IDE-Name": "CLI",
      "x-requested-with": "XMLHttpRequest",
      "x-codebuddy-request": "1",
    },
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
    // Quota lives behind the Tencent billing endpoint (same shape as
    // codebuddy-cn, ProductCode p_tcaca). See services/usage/codebuddy-cn.js.
    usage: {
      url: "https://www.workbuddy.ai/v2/billing/meter/get-user-resource",
    },
  },
  models: [
    { id: "hy3", name: "Hy3" },
    { id: "hy4-preview", name: "Hy4 Preview" },
    { id: "hy4-preview-x", name: "Hy4 Preview X" },
    { id: "glm-5.3", name: "GLM-5.3" },
    { id: "glm-5.3-flash", name: "GLM-5.3-Flash" },
    { id: "glm-5.2", name: "GLM-5.2" },
    { id: "glm-5.1", name: "GLM-5.1" },
    { id: "glm-5.0-turbo", name: "GLM-5.0-Turbo" },
    { id: "glm-5v-turbo", name: "GLM-5v-Turbo" },
    { id: "minimax-m3", name: "MiniMax-M3" },
    { id: "minimax-m2.7", name: "MiniMax-M2.7" },
    { id: "kimi-k3-1", name: "Kimi-K3.1" },
    { id: "kimi-k2.7", name: "Kimi-K2.7-Code" },
    { id: "kimi-k2.6", name: "Kimi-K2.6" },
    { id: "kimi-k2.5", name: "Kimi-K2.5" },
    { id: "hy3-preview", name: "Hy3 Preview" },
    { id: "deepseek-v4-pro", name: "DeepSeek-V4-Pro" },
    { id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash" },
    { id: "deepseek-v3-2-volc", name: "DeepSeek-V3.2" },
  ],
  oauth: {
    baseUrl: "https://www.workbuddy.ai",
    stateUrl: "https://www.workbuddy.ai/v2/plugin/auth/state",
    tokenUrl: "https://www.workbuddy.ai/v2/plugin/auth/token",
    refreshUrl: "https://www.workbuddy.ai/v2/plugin/auth/token/refresh",
    userAgent: "CLI/2.63.2 WorkBuddy/2.63.2",
    platform: "workbuddy",
    pollInterval: 5000,
  },
  features: {
    usage: true,
    usageApikey: true,
  },
};
