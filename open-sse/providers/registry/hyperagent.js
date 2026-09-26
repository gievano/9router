// HyperAgent (hyperagent.com) — unofficial reverse-engineered web session.
// Ported from OmniRoute catalog + executor (open-sse/executors/hyperagent.js).
// Auth: browser Cookie header. Chat: POST /api/threads/{id}/chat (SSE).
// Model is applied on the thread via PATCH /api/threads/{id} (wire ids like
// fable-latest — bare "fable" is invalid upstream).
export default {
  id: "hyperagent",
  priority: 150,
  alias: "ha",
  display: {
    name: "HyperAgent",
    icon: "auto_awesome",
    color: "#7C3AED",
    textIcon: "HA",
    website: "https://hyperagent.com",
    notice: {
      signupUrl: "https://hyperagent.com",
      apiKeyUrl: "https://hyperagent.com",
      text: "HyperAgent agent chat via browser session. Open hyperagent.com, log in, then paste the full Cookie header from DevTools → Network → any document request → Request Headers → Cookie. Claude-family agent models with 1M context; multi-turn chats reuse one thread + session. ⚠️ Reverse-engineered protocol — upstream may change without notice.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint:
    'Paste the full Cookie header from hyperagent.com (DevTools → Network → any document request → Request Headers → Cookie).',
  transport: {
    baseUrl: "https://hyperagent.com",
    format: "hyperagent",
    authType: "cookie",
  },
  defaultContextLength: 1_000_000,
  models: [
    { id: "fable-latest", name: "Fable 5", contextLength: 1_000_000 },
    { id: "claude-fable-5", name: "Claude Fable 5", contextLength: 1_000_000 },
    { id: "opus-latest", name: "Claude Opus Latest", contextLength: 1_000_000 },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8", contextLength: 1_000_000 },
    { id: "sonnet-latest", name: "Claude Sonnet Latest", contextLength: 1_000_000 },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", contextLength: 1_000_000 },
  ],
  passthroughModels: true,
};
