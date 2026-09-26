export default {
  id: "api-airforce",
  alias: "af",
  aliases: [
    "airforce",
  ],
  uiAlias: "af",
  display: {
    name: "API.airforce",
    icon: "flight",
    color: "#0EA5E9",
    textIcon: "AF",
    website: "https://api.airforce",
    notice: {
      apiKeyUrl: "https://api.airforce",
    },
  },
  category: "freeTier",
  authType: "apikey",
  authModes: [
    "apikey",
  ],
  passthroughModels: true,
  modelsFetcher: { url: "https://api.airforce/v1/models", type: "airforce-free" },
  transport: {
    baseUrl: "https://api.airforce/v1/chat/completions",
    validateUrl: "https://api.airforce/v1/models",
    headers: {
      "HTTP-Referer": "https://endpoint-proxy.local",
      "X-Title": "Endpoint Proxy",
    },
    forceStream: true,
  },
  models: [
    { id: "gpt-oss-120b", name: "GPT-OSS 120B (Free)", contextLength: 131072 },
    { id: "gpt-oss-20b", name: "GPT-OSS 20B (Free)", contextLength: 131072 },
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code (Free)", contextLength: 262144 },
  
    { id: "gpt-4o-mini", name: "GPT-4o mini (Free)" },
    { id: "glm-4.7-flash", name: "GLM 4.7 Flash (Free)" },
    { id: "minimax-m2.5", name: "MiniMax M2.5 (Free)" },
    { id: "seed-rp", name: "Seed RP (Free)" },
    { id: "unmoderated-gpt", name: "Unmoderated GPT (Free)" },
    { id: "gemma3-270m:free", name: "Gemma 3 270M (Free)" },
    { id: "rnj-1", name: "RNJ-1 (Free)" },
    { id: "plutotext-r3-emotional", name: "PlutoText R3 Emotional (Free)" },
    { id: "claude-sonnet-4.6-rp", name: "Claude Sonnet 4.6 (Paid)" },
    { id: "claude-opus-4.5-rp", name: "Claude Opus 4.5 (Paid)" },
    { id: "gpt-5", name: "GPT-5 (Paid)" },
    { id: "deepseek-v3-0324", name: "DeepSeek V3.2 (Paid)" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Paid)" },
  ],
};
