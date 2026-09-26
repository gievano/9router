// Pioneer AI (Fastino Labs) — OpenAI-compatible model routing + fine-tuning.
// Auth is X-API-Key (pio_sk_...); Bearer also accepted upstream.
// Only open-tier models work directly with a bare key — gated models (Claude/
// GPT/Gemini) require a prior fine-tuning job and are called via the job id.
export default {
  id: "pioneer",
  priority: 50,
  alias: "pioneer",
  display: {
    name: "Pioneer AI",
    icon: "rocket_launch",
    color: "#7C5CFF",
    textIcon: "PN",
    website: "https://pioneer.ai",
    notice: {
      apiKeyUrl: "https://agent.pioneer.ai/api-keys",
      text: "$75 free usage credits, no credit card required. Use an API key starting with pio_sk_. Only open-tier models (Qwen3, Llama, Gemma, SmolLM) work directly — gated models (Claude/GPT/Gemini) require prior fine-tuning via the Pioneer platform.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.pioneer.ai/v1/chat/completions",
    validateUrl: "https://api.pioneer.ai/v1/models",
    auth: { combined: true, header: "X-API-Key", scheme: "raw" },
  },
  models: [
    { id: "Qwen/Qwen3-32B", name: "Qwen3 32B" },
    { id: "Qwen/Qwen3.6-27B", name: "Qwen3.6 27B" },
    { id: "Qwen/Qwen3.5-9B", name: "Qwen3.5 9B" },
    { id: "Qwen/Qwen3-8B", name: "Qwen3 8B" },
    { id: "Qwen/Qwen3-4B-Base", name: "Qwen3 4B Base" },
    { id: "Qwen/Qwen3-1.7B-Base", name: "Qwen3 1.7B Base" },
    { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct" },
    { id: "meta-llama/Llama-3.2-1B-Instruct", name: "Llama 3.2 1B Instruct" },
    { id: "google/gemma-3-4b-pt", name: "Gemma 3 4B (Pretrained)" },
    { id: "HuggingFaceTB/SmolLM3-3B-Base", name: "SmolLM3 3B Base" },
  ],
  serviceKinds: ["llm"],
  hasFree: true,
  freeNote: "$75 free usage credits — no credit card required",
};
