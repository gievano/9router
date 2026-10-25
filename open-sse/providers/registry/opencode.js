export default {
  id: "opencode",
  priority: 40,
  hasFree: true,
  alias: "oc1",
  uiAlias: "oc1",
  aliases: ["oc", "opencode-v1", "opencode-free"],
  display: {
    name: "OpenCode Free V1",
    icon: "terminal",
    color: "#E87040",
    textIcon: "OC1",
  },
  category: "free",
  noAuth: true,
  transport: {
    baseUrl: "https://opencode.ai",
    timeoutMs: 45000,
    headers: {
      "x-opencode-client": "desktop",
    },
    forceStream: true,
    noAuth: true,
    // Zen reasoning models reject multi-turn history whose assistant messages
    // carry no reasoning_content (400 missing_required_parameter), and the
    // response pipeline strips the field before it reaches the client, so the
    // echo can never come from the client. Inject a placeholder instead.
    reasoningInject: {
      scope: "all",
    },
    quirks: {
      forceAutoToolChoiceModels: ["muse-spark-1.3-contributor-free"],
    },
  },
  models: [
    // Endpoint formats differ per model, so declare non-chat models explicitly.
    { id: "muse-spark-1.2-contributor-free", name: "Muse Spark 1.2 Contributor Free", targetFormat: "openai-responses", isFree: true },
    { id: "muse-spark-1.3-contributor-free", name: "Muse Spark 1.3 Contributor Free", targetFormat: "openai-responses", isFree: true },
    { id: "union-alpha", name: "Union Alpha Free", targetFormat: "claude", isFree: true },
    { id: "deepseek-v4.1-flash-free", name: "DeepSeek V4.1 Flash Free", supportedFormats: ["openai", "claude", "openai-responses"], isFree: true },
    // jev-1.13-free intentionally has no chat route: upstream answers
    // ModelProtocolUnsupported on /inference/v1/chat/completions for Jev ids,
    // and /zen/v1/systemone is a decision payload lane, not chat. Listing it
    // as a chat model only produces an unwinnable 400 loop in the fallback.
  ],
  serviceKinds: ["llm", "systemone"],
  systemoneConfig: {
    baseUrl: "https://opencode.ai/zen/v1/systemone",
    headers: {
      "x-opencode-client": "desktop",
      "User-Agent": "opencode/1.19.4 ai-sdk/provider-utils/4.0.23 runtime/bun/1.4.4",
    },
  },
  modelsFetcher: { url: "https://opencode.ai/zen/v1/models", type: "opencode-free" },
  passthroughModels: true,
};
