// Marathon (by GoKite AI) — adaptive inference infrastructure for long-running agents.
//
// Marathon is OpenAI-compatible but adds a unique `completion_window` field:
//   - "now"     → synchronous streaming (like any real-time API)
//   - "soon"    → short delay, small discount
//   - "later"   → ~15 min wait, ~50% cheaper
//   - "anytime" → best-effort, no deadline, deepest discount (up to 65%)
//
// Delayed windows return a job id instead of streaming; the custom executor
// (MarathonExecutor) polls GET /v1/delayed/jobs/{id} until completion and
// streams the result back with heartbeat keep-alive frames.
//
// The window is selected per-connection via the MarathonWindowSelector UI
// component (stored in providerSpecificData.completionWindow, default "now").
//
// Launch catalog: 5 flagship open-weight models (Kimi K3, GLM 5.2, DeepSeek
// V4 Pro, Qwen3.6-35B-A3B, Nemotron 3 Ultra).
//
// Auth: standard Authorization: Bearer <api_key>.

export default {
  id: "marathon",
  priority: 363,
  alias: "marathon",
  aliases: ["mara", "marathonbuild"],
  uiAlias: "mara",
  display: {
    name: "Marathon",
    icon: "timer",
    color: "#0EA5E9",
    textIcon: "MR",
    website: "https://marathon.build",
    notice: {
      signupUrl: "https://marathon.build",
      apiKeyUrl: "https://marathon.build",
      text: "Marathon (by GoKite AI) is adaptive inference infrastructure. Choose a completion window per request: 'now' for real-time streaming, or 'soon'/'later'/'anytime' for up to 65% cost savings (delayed async with automatic polling). Create an API key at marathon.build, then paste it here.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    // The delayed endpoint handles BOTH now and delayed modes.
    // For "now", Marathon streams synchronously like a standard OpenAI API.
    // For delayed windows, it returns { job_id } and you poll /v1/delayed/jobs/{id}.
    baseUrl: "https://delayed-inference.prod.gokite.ai/v1/delayed/chat/completions",
    format: "openai",
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  // Seed catalog — the 5 flagship launch models. Live discovery via /v1/models.
  models: [
    { id: "kimi-k3", name: "Kimi K3" },
    { id: "glm-5-2", name: "GLM 5.2" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "qwen3-6-35b-a3b", name: "Qwen3.6-35B-A3B" },
    { id: "nemotron-3-ultra", name: "Nemotron 3 Ultra" },
  ],
  passthroughModels: true,
  modelsFetcher: {
    url: "https://delayed-inference.prod.gokite.ai/v1/models",
    type: "openai",
  },
  // Per-connection completion window is configured via the MarathonWindowSelector
  // UI component and stored in providerSpecificData.completionWindow (default "now").
  // The MarathonExecutor reads it at request time to switch between sync
  // streaming (now) and delayed job polling (soon/later/anytime).
};
