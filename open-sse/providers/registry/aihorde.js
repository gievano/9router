// AI Horde — crowdsourced inference from volunteer GPU workers
// (aihorde.net), via its OpenAI-compatible facade at oai.aihorde.net.
//
// Keyless: the literal `0000000000` is AI Horde's documented anonymous key,
// injected by the executor when no credential is supplied. A real account key
// works too and buys higher queue priority (kudos).
//
// Unlike other OpenAI-compatible providers: requests sit in a shared volunteer
// queue (latency is minutes, not seconds — 120s timeout), there is NO tool
// calling (workers run raw text-completion backends — strip rules drop
// tools/tool_choice/parallel_tool_calls), and throughput depends on worker
// availability rather than a fixed quota. Model list changes as workers
// come/go, so the catalog is passthrough with a curated fallback.
export default {
  id: "aihorde",
  priority: 60,
  alias: "aihorde",
  display: {
    name: "AI Horde",
    icon: "groups",
    color: "#9333EA",
    textIcon: "AH",
    website: "https://aihorde.net",
    notice: {
      text: "Crowdsourced inference from volunteer GPUs — free anonymous key (or an account key for higher queue priority via kudos). Requests wait in a shared queue, so latency is minutes, not seconds. No tool calling. The catalog changes as workers come and go.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://oai.aihorde.net/v1/chat/completions",
    format: "openai",
    noAuth: true,
    timeoutMs: 120000,
  },
  models: [
    {
      id: "aphrodite/TheDrummer/Cydonia-24B-v4.3",
      name: "Cydonia 24B (AI Horde)",
      contextLength: 32768,
      toolCalling: false,
    },
    {
      id: "aphrodite/TheDrummer/Skyfall-31B-v4.2",
      name: "Skyfall 31B (AI Horde)",
      contextLength: 32768,
      toolCalling: false,
    },
    {
      id: "google/gemma-4-31b",
      name: "Gemma 4 31B (AI Horde)",
      contextLength: 32768,
      toolCalling: false,
    },
  ],
  passthroughModels: true,
};
