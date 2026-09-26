// The Old LLM — free no-auth aggregator (theoldllm.vercel.app). No API key:
// the executor generates the X-Request-Token server-side. Free tier mirrors
// the site's "chatgpt" catalog (GPT-5.x, o-series, Gemini, Claude 4.6,
// Grok 4, DeepSeek, Sonar). Vercel bot protection may require a residential
// proxy for non-residential egress IPs. Port of OmniRoute (TheOldLlmExecutor).
export default {
  id: "theoldllm",
  priority: 60,
  alias: "tllm",
  uiAlias: "tllm",
  display: {
    name: "The Old LLM (Free)",
    icon: "history_edu",
    color: "#F59E0B",
    textIcon: "TL",
    website: "https://theoldllm.vercel.app",
    notice: {
      text: "Free GPT-5.4, Claude 4.6 Opus/Sonnet/Haiku, Gemini 3 Pro, Grok 4, DeepSeek and more — no API key, tokens are auto-generated. If requests are blocked by Vercel bot protection, configure a residential/global proxy for this provider.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://theoldllm.vercel.app/api/chatgpt",
    format: "openai",
    noAuth: true,
  },
  // Upstream ids (GPT_5_*, CLAUDE_4_*, gemini_*…) mirror the site's free
  // "chatgpt" tier and MUST match the executor's map so they route unchanged.
  models: [
    { id: "GPT_5_4", name: "GPT-5.4 (The Old LLM)", contextLength: 400000 },
    { id: "GPT_5_3", name: "GPT-5.3 (The Old LLM)", contextLength: 400000 },
    { id: "GPT_5_2", name: "GPT-5.2 (The Old LLM)", contextLength: 400000 },
    { id: "GPT_5_1", name: "GPT-5.1 (The Old LLM)", contextLength: 400000 },
    { id: "GPT_5", name: "GPT-5 (The Old LLM)", contextLength: 400000 },
    { id: "GPT_o4_mini", name: "o4-mini (The Old LLM)" },
    { id: "GPT_o3_mini", name: "o3-mini (The Old LLM)" },
    { id: "gemini_3_pro", name: "Gemini 3 Pro (The Old LLM)", contextLength: 1000000 },
    { id: "gemini_2_5_pro", name: "Gemini 2.5 Pro (The Old LLM)", contextLength: 1000000 },
    { id: "gemini_2_0_flash", name: "Gemini 2.0 Flash (The Old LLM)", contextLength: 1000000 },
    { id: "gemini_1_5_flash", name: "Gemini 1.5 Flash (The Old LLM)", contextLength: 1000000 },
    { id: "CLAUDE_4_6_OPUS", name: "Claude 4.6 Opus (The Old LLM)", contextLength: 200000 },
    { id: "CLAUDE_4_6_SONNET", name: "Claude 4.6 Sonnet (The Old LLM)", contextLength: 200000 },
    { id: "CLAUDE_4_5_HAIKU", name: "Claude 4.5 Haiku (The Old LLM)", contextLength: 200000 },
    { id: "openrouter_gpt_4_o", name: "GPT-4o (The Old LLM)" },
    { id: "openrouter_gpt_4_o_mini", name: "GPT-4o mini (The Old LLM)" },
    { id: "openrouter_grok_4", name: "Grok 4 (The Old LLM)" },
    { id: "together_deepseek_v3", name: "DeepSeek V3 (The Old LLM)" },
    { id: "openrouter_deepseek_r1", name: "DeepSeek R1 (The Old LLM)" },
    { id: "sonar-pro", name: "Sonar Pro (The Old LLM)" },
  ],
  passthroughModels: true,
};
