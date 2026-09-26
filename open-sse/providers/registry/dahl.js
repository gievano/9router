// Dahl — OpenAI-compatible free inference provider (inference.dahl.global).
// Free tier serves MiniMax M2.7 and Kimi K2.6.
//
// Token lifecycle: accounts are created by POSTing to
// https://inference.dahl.global/tokens (response `{ available_tokens, token }`
// yields the API key). We don't proxy the minting route, so the auth hint
// documents it; paste the returned `token` as the API key.
export default {
  id: "dahl",
  priority: 60,
  alias: "dahl",
  display: {
    name: "Dahl",
    icon: "local_florist",
    color: "#14B8A6",
    textIcon: "DH",
    website: "https://dahl.global",
    notice: {
      apiKeyUrl: "https://inference.dahl.global/tokens",
      text: "Free OpenAI-compatible inference — MiniMax M2.7 and Kimi K2.6. To mint a token: POST to https://inference.dahl.global/tokens, then paste the returned `token` field as the API key.",
    },
  },
  category: "apikey",
  authType: "apikey",
  authHint: "POST https://inference.dahl.global/tokens (no body needed) → copy the `token` field from the JSON response into the API key field.",
  hasFree: true,
  transport: {
    baseUrl: "https://inference.dahl.global/v1/chat/completions",
    format: "openai",
  },
  models: [
    { id: "MiniMaxAI/MiniMax-M2.7", name: "MiniMax M2.7" },
    { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
  ],
};
