// Heroku AI — hosted inference gateway; OpenAI-compatible.
export default {
  id: "heroku",
  priority: 40,
  alias: "heroku",
  display: {
    name: "Heroku AI",
    icon: "cloud_upload",
    color: "#7C3AED",
    textIcon: "HK",
    website: "https://www.heroku.com",
    notice: {
      apiKeyUrl: "https://dashboard.heroku.com/account/applications",
      text: "Hosted inference gateway over frontier open-weight models.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://us.inference.heroku.com/v1/chat/completions",
    validateUrl: "https://us.inference.heroku.com/v1/models",
  },
  models: [
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "claude-4-6-sonnet", name: "Claude 4.6 Sonnet" },
    { id: "claude-4-5-haiku", name: "Claude 4.5 Haiku" },
    { id: "glm-4-7", name: "GLM 4.7" },
    { id: "kimi-k2-5", name: "Kimi K2.5" },
    { id: "minimax-m2-1", name: "MiniMax M2.1" },
    { id: "deepseek-v3-2", name: "DeepSeek V3.2" },
    { id: "qwen3-coder-480b", name: "Qwen3 Coder 480B" },
    { id: "qwen3-235b", name: "Qwen3 235B" },
    { id: "gpt-oss-120b", name: "GPT-OSS 120B" },
    { id: "nova-pro", name: "Nova Pro" },
    { id: "nova-2-lite", name: "Nova 2 Lite" },
  ],
  serviceKinds: ["llm"],
};
