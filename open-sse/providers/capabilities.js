// Model capabilities — what each model can read/do beyond plain text.
//
// Fallback order (first match wins), result merged over DEFAULT_CAPABILITIES:
//   1. PROVIDER_CAPABILITIES[provider][model]  — provider-specific override
//   2. MODEL_CAPABILITIES[model]               — canonical exact id (handles exceptions)
//   3. PATTERN_CAPABILITIES                     — glob match, ordered specific -> generic
//   4. DEFAULT_CAPABILITIES                     — safe floor (always returned)
//
// Two extra layers then refine the result, and neither can override the hand
// written tables above (steps 1-2 short-circuit before they are consulted):
//   • the synced catalog — modalities keyed by model, limits keyed by provider
//     + model, refreshed from models.dev in the background. It reads a file, so
//     the server installs it via setCatalogSource(); this module stays free of
//     node:fs because the dashboard bundles it into the browser too.
//   • visionPatterns.js — name-based vision detection, last resort so a model
//     nobody has catalogued yet still accepts images.
// Both only ever turn a capability ON.
//
// ── HOW TO ADD / UPDATE A MODEL ──────────────────────────────────────
// Authoritative data source: https://models.dev/api.json (145 providers, 4000+
// models, MIT). Each model exposes the exact fields we map below:
//   modalities.input  ["text","image","pdf","audio","video"] -> vision / pdf / audioInput / videoInput
//   modalities.output ["text","image","audio"]               -> imageOutput / audioOutput
//   reasoning   -> reasoning      tool_call    -> tools
//   limit.context -> contextWindow   limit.output -> maxOutput
// Look up the model id, then:
//   • If a PATTERN below already covers it correctly -> nothing to do.
//   • If it is an exception (pattern would mis-match) -> add an exact entry to
//     MODEL_CAPABILITIES (only the fields that differ from DEFAULT).
//   • If a whole new family -> add an ordered PATTERN (specific before generic).
// NOTE: models.dev has NO "search" flag (web search is a runtime tool, not a
// model spec); set `search` from vendor docs (Claude 4.x+, GPT-5.x/4o, Gemini
// 2.0+, Grok, Perplexity). Verify with: curl -s https://models.dev/api.json

import { matchPattern } from "./pricing.js";
import { looksLikeVisionModel } from "./visionPatterns.js";

/**
 * Safe floor — every resolved result is merged over this so consumers
 * never need null-checks. Most modern LLMs meet these limits.
 */
export const DEFAULT_CAPABILITIES = {
  // input modalities
  vision: false,        // read images
  pdf: false,           // read PDF / documents
  audioInput: false,    // read audio
  videoInput: false,    // read video
  // output modalities
  imageOutput: false,   // generate images
  audioOutput: false,   // generate audio
  // features
  search: false,        // built-in web search tool / grounding
  tools: true,          // function / tool calling
  reasoning: false,     // thinking / reasoning
  // thinking wire format (only meaningful when reasoning:true). null → derive from transport.format.
  // enum: openai|claude-adaptive|claude-budget|gemini-level|gemini-budget|zai|qwen|deepseek|kimi|minimax|hunyuan|step
  thinkingFormat: null,
  thinkingCanDisable: true,  // false → model cannot turn thinking off (clamp to min instead of disable)
  thinkingRange: null,       // { min, max } for budget formats; null = no clamp
  thinkingEffortSupported: false, // zai format only: model accepts a reasoning_effort level (GLM-5.2+; older GLM ignores it)
  // limits (tokens)
  contextWindow: 200000,
  maxOutput: 64000,
};

// User-added model metadata can carry dashboard service kinds instead of the
// runtime capability names used here. Map those typed model kinds into input /
// output capabilities so custom vision models are not treated as text-only.
const SERVICE_KIND_CAPABILITIES = {
  imageToText: { vision: true },
  image: { imageOutput: true },
  stt: { audioInput: true },
  tts: { audioOutput: true },
  embedding: { tools: false },
};

export function capabilitiesFromServiceKind(kind) {
  return SERVICE_KIND_CAPABILITIES[kind] || null;
}

/**
 * Canonical exact-id overrides — used for exceptions that patterns would
 * otherwise mis-match. Only declare deltas vs DEFAULT.
 */
export const MODEL_CAPABILITIES = {
  // Claude Fable 5.1, Opus 5, 4.6/4.7/4.8, and Kiro Sonnet 5 have 1M context + adaptive thinking (override generic claude pattern)
  "claude-fable-5-1": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-5":     { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-5-thinking": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-5-agentic": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-5-thinking-agentic": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4.6":   { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4.7":   { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4-7":   { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4.8":   { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4-6":   { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4-8":   { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4.8-thinking": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-opus-4-8-thinking": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-sonnet-4.6": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-sonnet-4-6": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-sonnet-5": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-sonnet-5-thinking": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-sonnet-5-agentic": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  "claude-sonnet-5-thinking-agentic": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },

  // Gemini image-gen / OpenAI image / xai image variants
  "gpt-image-1":       { imageOutput: true, tools: false },

  // GLM vision variants (text GLM has no vision) — 5.3-Flash and 5V-Turbo are
  // natively multimodal per z.ai, and 5.3-Flash carries the full 1M window.
  "glm-5.3-flash":     { vision: true, videoInput: true, pdf: true, reasoning: true, thinkingFormat: "zai", contextWindow: 1000000, maxOutput: 131072 },
  "glm-4.6v":          { vision: true, videoInput: true, reasoning: true, thinkingFormat: "zai", contextWindow: 128000, maxOutput: 32768 },
  "glm-4.5v":          { vision: true, videoInput: true, reasoning: true, thinkingFormat: "zai", contextWindow: 64000, maxOutput: 16384 },
  // GLM-5.2 has 1M context — pattern *glm-5* only gives 200k, so override here
  "glm-5.2":           { reasoning: true, thinkingFormat: "zai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 131072 },

  // DeepSeek's first V4 model with image input; text limits match V4-Flash.
  "deepseek-v4-flash-vision-exp": { vision: true, reasoning: true, thinkingFormat: "deepseek", contextWindow: 1000000, maxOutput: 384000 },

  // DeepSeek V4.1-Flash is natively multimodal — models.dev lists
  // opencode-go/deepseek-v4.1-flash with modalities.input ["text","image"] — and upstream
  // the retired v4-flash / vision-exp ids route to it, so the live V4.1 ids carry the
  // same image capability as the exp id above. "deepseek-flash" is the GA id on the
  // DeepSeek API; it previously fell through to the generic *deepseek* pattern, whose
  // 128K/64K limits are kept here. The repeated fields are deliberate: an exact entry
  // short-circuits the pattern table, so a vision-only delta would drop them.
  "deepseek-v4.1-flash": { vision: true, reasoning: true, thinkingFormat: "deepseek", contextWindow: 1000000, maxOutput: 384000 },
  "deepseek-flash":      { vision: true, reasoning: true, thinkingFormat: "deepseek", contextWindow: 128000, maxOutput: 64000 },

  // Qwen plain coder/text (no vision) — registry "vision-model" / "coder-model" aliases
  "vision-model":      { vision: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000 },
  "coder-model":       { reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000 },

  // Kimi flagship + coding (platform + Kimi Code ids) — vision/video native
  "kimi-k3":           { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 131072 },
  "k3":                { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 131072 },
  "kimi-for-coding":   { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 65536 },
  "kimi-for-coding-highspeed": { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 65536 },
  "kimi-k2.7-code":    { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 65536 },
  "kimi-k2.7-code-highspeed": { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 65536 },
  "union-alpha":      { vision: true, reasoning: true, thinkingFormat: "anthropic", contextWindow: 262144, maxOutput: 131072 },
  "union-alpha-free": { vision: true, reasoning: true, thinkingFormat: "anthropic", contextWindow: 262144, maxOutput: 131072 },
  // OpenCode Free Muse Spark — multimodal (text+image per models.dev meta/muse-spark)
  // via OpenAI Responses input_image; reasoning supports up to xhigh.
  "muse-spark-1.2-contributor-free": { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 1048576, maxOutput: 131072 },
  "muse-spark-1.3-contributor-free": { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 1048576, maxOutput: 131072 },
};

const KIRO_GPT_5_6_CAPABILITIES = { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 272000, maxOutput: 128000 };

// Codex OAuth (ChatGPT backend) — per-model context window reported by upstream
// (lower than OpenAI API's 1.05M). Sol differs from Terra/Luna. #2720
const CODEX_GPT_56_SOL_CAPS  = { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 372000, maxOutput: 128000 };
const CODEX_GPT_56_DEFAULT_CAPS = { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 272000, maxOutput: 128000 };

/**
 * Provider-specific capability overrides. Keyed by provider alias/id.
 */
export const PROVIDER_CAPABILITIES = {
  // NVIDIA NIM is OpenAI-compatible → rejects MiniMax/GLM native `thinking` field.
  // Force openai reasoning_effort format for its reasoning models. #issue
  "nvidia": {
    "minimaxai/minimax-m2.7": { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 131072 },
    "minimaxai/minimax-m3": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 512000, maxOutput: 131072 },
    "z-ai/glm-5.2": { reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 128000 },
    "deepseek-ai/deepseek-v4-pro": { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 65536 },
    "deepseek-ai/deepseek-v4-flash": { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 65536 },
  },
  // glm-5.3-flash on OpenCode Go is served by a backend that rejects the z.ai
  // `thinking` object (400: unknown field "thinking") and wants reasoning_effort.
  // Overrides the global entry, whose z.ai shape is correct for z.ai itself.
  "opencode-go": {
    "glm-5.3-flash": { vision: true, videoInput: true, pdf: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 131072 },
  },
  "codex": {
    "gpt-6-astra":               { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 272000, maxOutput: 128000 },
    "gpt-5.6-sol":               CODEX_GPT_56_SOL_CAPS,
    "gpt-5.6-sol-review":        CODEX_GPT_56_SOL_CAPS,
    "gpt-5.6-terra":             CODEX_GPT_56_DEFAULT_CAPS,
    "gpt-5.6-terra-review":      CODEX_GPT_56_DEFAULT_CAPS,
    "gpt-5.6-luna":              CODEX_GPT_56_DEFAULT_CAPS,
    "gpt-5.6-luna-review":       CODEX_GPT_56_DEFAULT_CAPS,
  },
  "kiro": {
    "gpt-5.6-sol": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-terra": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-luna": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-sol-thinking": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-terra-thinking": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-luna-thinking": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-sol-agentic": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-terra-agentic": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-luna-agentic": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-sol-thinking-agentic": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-terra-thinking-agentic": KIRO_GPT_5_6_CAPABILITIES,
    "gpt-5.6-luna-thinking-agentic": KIRO_GPT_5_6_CAPABILITIES,
  },
  // CodeBuddy.cn — authoritative per-model metadata from the gateway's model
  // config (contextWindow=maxInputTokens, maxOutput=maxOutputTokens, vision=
  // supportsImages). Every model reasons via OpenAI-style reasoning_effort
  // (see registry thinkingFormat). For thinkingCanDisable use the server's
  // reasoning.canDisableThinking flag — see the note in the codebuddy-cn block
  // below; it is NOT the inverse of onlyReasoning.
  "codebuddy-cn": {
    "glm-5.2":            { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, contextWindow: 1000000, maxOutput: 48000 },
    "glm-5.1":            { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "glm-5.0":            { reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 48000 },
    "glm-5.0-turbo":      { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    // maxOutput 64000 per both the plugin-baked fallback and the live server
    // table (the old 38000 had no source and truncated output).
    "glm-5v-turbo":       { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 64000 },
    "glm-4.7":            { reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 48000 },
    "minimax-m3":         { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 512000, maxOutput: 128000 },
    "minimax-m2.7":       { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "kimi-k2.7":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 256000, maxOutput: 32000 },
    "kimi-k2.6":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 256000, maxOutput: 32000 },
    "kimi-k2.5":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 164000, maxOutput: 32000 },
    "hy3-preview":        { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 192000, maxOutput: 64000 },
    "deepseek-v4-flash":  { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 50000 },
    "deepseek-v3-2-volc": { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 96000, maxOutput: 32000 },
    // Per-model values mirror the server's product-config payload (the plugin
    // fetches it from copilot.tencent.com; the `models[]` entries carry
    // maxInputTokens/maxOutputTokens/supportsImages). contextWindow =
    // maxInputTokens, maxOutput = maxOutputTokens. Where the server and the
    // plugin-baked fallback disagree, the server table wins.
    // ⚠️ thinkingCanDisable maps to the server's reasoning.canDisableThinking —
    // it is NOT the inverse of onlyReasoning. onlyReasoning means "thinking is
    // on by default"; canDisableThinking means "it CAN be turned off". glm-5.3
    // and glm-5.3-flash are onlyReasoning:true BUT canDisableThinking:true, so
    // their thinking is switchable; the hy* models are forced always-on.
    "hy3":                { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 192000, maxOutput: 64000 },
    "hy4-preview":        { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 64000 },
    "glm-5.3":            { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, contextWindow: 1000000, maxOutput: 48000 },
    "glm-5.3-flash":      { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, contextWindow: 1000000, maxOutput: 32000 },
    "kimi-k3-1":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 32000 },
    "deepseek-v4-pro":    { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, contextWindow: 1000000, maxOutput: 50000 },
    // deepseek-v4.1-flash replaces v4-flash (dropped from the server list;
    // the old endpoint still answers 200 but the published list is the
    // contract). maxOutput 128000 per the server's product-config payload.
    "deepseek-v4.1-flash": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, contextWindow: 1000000, maxOutput: 128000 },
  },
  // Poolside Laguna — OpenAI-compatible, all reasoning-capable (32K max output).
  "poolside": {
    "laguna-s-2.1":  { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 32000 },
    "laguna-xs-2.1": { reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 32000 },
  },
  // Ollama Cloud — the generic *deepseek-v4* pattern misses the vision badge
  // the library page publishes for this model (text+image in, 1M context).
  // ponytail: thinkingFormat stays "deepseek" to preserve today's body shape;
  // Ollama's native toggle is the top-level `think` field (bool or
  // low/medium/high/max), which no format in thinkingUnified.js emits yet —
  // openai-to-ollama.js drops it. Wire a "think" format when thinking on
  // Ollama Cloud is actually needed.
  "ollama": {
    "deepseek-v4.1-flash:cloud": { vision: true, reasoning: true, thinkingFormat: "deepseek", contextWindow: 1000000, maxOutput: 384000 },
  },
  // Web-cookie providers: text-only RAG backends, no native function tools.
  // Kimi Web exposes reasoning deltas as reasoning_content; Gemini Web
  // surfaces no reasoning channel.
  "gemini-web": {
    "gemini-3.1-pro": { tools: false, contextWindow: 1048576, maxOutput: 65536 },
    "gemini-3.7-flash": { tools: false, contextWindow: 1048576, maxOutput: 65536 },
    "gemini-3.1-flash-lite": { tools: false, contextWindow: 1048576, maxOutput: 65536 },
  },
  "kimi-web": {
    "k3": { tools: false, reasoning: true, contextWindow: 262144, maxOutput: 65536 },
    "k2d6": { tools: false, reasoning: true, contextWindow: 262144, maxOutput: 65536 },
  },
  // Fireworks AI — OpenAI-compatible host. transport.thinkingFormat:"openai" makes
  // reasoning models speak OpenAI reasoning_effort. These per-model pins correct
  // generic family patterns that mis-flag Fireworks models:
  //   *kimi*k2*     → vision + kimi thinking format (k2-instruct-0905 is text-only)
  //   *glm-5*       → zai thinking format + 200k ctx (glm-5p2 is 1M ctx)
  //   *deepseek*    → reasoning (deepseek-v3p1 is a plain chat model)
  //   *qwen*235b*   → qwen thinking format (OpenAI-style effort here)
  fireworks: {
    "accounts/fireworks/models/glm-5p2":            { reasoning: true, thinkingFormat: "openai", contextWindow: 1048575, maxOutput: 131072 },
    "accounts/fireworks/models/kimi-k2p6":          { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 262000, maxOutput: 262000 },
    "accounts/fireworks/models/kimi-k2-instruct-0905": { vision: false, reasoning: false, contextWindow: 262144, maxOutput: 262144 },
    "accounts/fireworks/models/deepseek-v3p1":      { vision: false, reasoning: false, contextWindow: 128000, maxOutput: 16384 },
    "accounts/fireworks/models/qwen3-235b-a22b":    { reasoning: true, thinkingFormat: "openai", contextWindow: 128000, maxOutput: 32768 },
  },
  // Bynara (router.bynara.id) — deterministic runtime mirror of the gateway's
  // /v1/models metadata (context_window, vision, reasoning). Live-verified
  // against a real-key /v1/models capture (2026-09-10): ids must match the
  // gateway exactly or the override is dead (falls through to
  // DEFAULT_CAPABILITIES). The live values are also absorbed automatically by
  // the bynara modelsFetcher parser (suggested-models/filters.js) for the
  // providers page; this static block keeps getCapabilitiesForModel correct
  // for picker/combo/playground even before/without that fetch. Reasoning
  // models speak OpenAI reasoning_effort (the gateway's primary chat format).
  bynara: {
    "agnes-2.0-flash":        { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 512000 },
    "agnes-2.5-flash":        { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 512000 },
    // 1M context per live catalog. The old 128000 starved resolveOutputBudget
    // (availableContext<=0 → max_tokens:0 on the wire → provider rejection)
    // for large Swarm-panel prompts on this model.
    "glm-5.3-flash-free":     { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 1000000 },
    "glm-5.3-free":           { reasoning: true, thinkingFormat: "openai", contextWindow: 128000 },
    "grok-4.5-free":          { vision: true, contextWindow: 212000 },
    "laguna-s-2.1":           { reasoning: true, thinkingFormat: "openai", contextWindow: 262000 },
    // Live id is ling-3.0-flash-fin-free ("fin" = fine-tune); no vision/reasoning
    // field in the live catalog (docs list no reasoning support) — reasoning
    // stays at the default false. The old "ling-3.0-flash-free" key never matched.
    "ling-3.0-flash-fin-free": { contextWindow: 262000 },
    "minimax-m3-free":        { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 1000000 },
    "mistral-large":          { contextWindow: 252000 },
    "mistral-medium-3-5":     { vision: true, contextWindow: 256000 },
    // Live id is nemotron-3.5-lightning-free (context_window 261996 → rounded to
    // the 262000 convention used by the other mid-tier bynara entries). The old
    // "nemotron-3-ultra" key was dead AND 1M (never true for this model).
    "nemotron-3.5-lightning-free": { contextWindow: 262000 },
    "qwen-3.8-max-free":      { contextWindow: 262144 },
    "qwen3.8-27b":            { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000 },
    "qwen3.8-flash-free":     { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 1000000 },
    "stepfun-3.7-flash":      { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 262000 },
    "tencent-hy3-free":       { contextWindow: 262000 },
    // DeepSeek V4 free/paid on Bynara speak OpenAI reasoning_effort only
    // (gateway rejects native DeepSeek thinking:{type} blocks → HTTP 400).
    "deepseek-v4-pro":        { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1000000, maxOutput: 384000 },
    "deepseek-v4-pro-free":   { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1000000, maxOutput: 384000 },
    "deepseek-v4-flash":      { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1000000, maxOutput: 384000 },
    "deepseek-v4-flash-free": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1000000, maxOutput: 384000 },
  },
  // OrcaRouter (api.orcarouter.ai) — multi-provider OpenAI gateway. Live model
  // cards: https://www.orcarouter.ai/api/public/models/<id>. thinkingFormat is
  // also pinned on transport (openai reasoning_effort is the unified wire
  // shape per docs.orcarouter.ai/advanced/reasoning); provider-scoped caps fix
  // context/vision so generic *qwen3.7*/*deepseek-v4* patterns don't inflate
  // free-tier text models to 1M multimodal.
  orcarouter: {
    "orcarouter/free":                 { contextWindow: 1000000, maxOutput: 64000 },
    "orcarouter/fusion":               { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 64000 },
    "orcarouter/fusion-flash":         { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 64000 },
    "orcarouter/fusion-mini":          { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 64000 },
    "qwen/qwen3.8-27b-free":           { vision: false, reasoning: true, thinkingFormat: "openai", contextWindow: 65536, maxOutput: 65536 },
    "qwen/qwen3.8-27b":                { vision: false, reasoning: true, thinkingFormat: "openai", contextWindow: 65536, maxOutput: 65536 },
    "qwen/qwen3.7-max":                { vision: false, reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 64000 },
    // Live card reports a 32k window. The 65536 output value this entry
    // originally carried was copied from the qwen3.8-27b sibling (65536/65536)
    // and exceeded the window, handing Token Budget an unreachable ceiling.
    // Clamped to the window pending a model-specific output figure.
    "qwen/qwen3.5-27b":                { vision: true, videoInput: true, reasoning: true, thinkingFormat: "openai", contextWindow: 32768, maxOutput: 32768 },
    "deepseek/deepseek-v4-pro":        { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1048576, maxOutput: 384000 },
    "deepseek/deepseek-v4-pro-free":   { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1048576, maxOutput: 384000 },
    "deepseek/deepseek-v4-flash":      { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1048576, maxOutput: 384000 },
    "deepseek/deepseek-v4-flash-free": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingMaxEffort: true, contextWindow: 1048576, maxOutput: 384000 },
    "deepseek/deepseek-reasoner":      { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 384000 },
    "minimax/minimax-m2.7":            { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 204800, maxOutput: 131072 },
    "openai/gpt-5.5":                  { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 400000, maxOutput: 128000 },
    "tencent/hy3-free":                { vision: false, contextWindow: 262000 },
  },
  // tokenharbor — AI gateway; pin the Claude 5 flagships to claude-adaptive 1M
  // so the generic *claude*opus*/*claude*fable* pattern (claude-budget 200k)
  // can't win for these models.
  tokenharbor: {
    "claude-opus-5":  { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
    "claude-fable-5": { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 },
  },
  // meta-ai — Muse Spark family. Reasoning always on (native reasoning_effort
  // tiers minimal/low/medium/high/xhigh; "none" unsupported → HTTP 400, so
  // thinkingCanDisable false clamps disable requests to minimal). Provider-
  // scoped so the generic *muse-spark* pattern can't leak native effort levels
  // onto muse-spark-web (web bridge doesn't speak OpenAI-compatible effort).
  "meta-ai": {
    // Muse Spark 1.x is fully multimodal (models.dev: image+video+pdf+audio input).
    "muse-spark-1.2":            { vision: true, pdf: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 },
    "muse-spark-1.2-contributor": { vision: true, pdf: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 },
    "muse-spark-1.1":            { vision: true, pdf: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 },
  },
  // opencode — free lane serves muse-spark-1.2-contributor-free via the
  // Responses API (model targetFormat: openai-responses). Same Muse Spark 1.2
  // family as meta-ai's entries: multimodal input, reasoning always on with
  // native effort tiers ("none" unsupported), 1M context / 131072 output
  // (models.dev: opencode/muse-spark-1.2-contributor-free, verified live —
  // /zen/v1/responses accepted the request; /chat/completions 500s).
  opencode: {
    "muse-spark-1.2-contributor-free": { vision: true, pdf: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 },
    "muse-spark-1.3-contributor-free": { vision: true, pdf: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 },
  },
  // codebuddy-intl + workbuddy — same CodeBuddy gateway on their own hosts
  // (codebuddy.ai / workbuddy.ai). WorkBuddy's flagship model is "hy3" (the
  // registry model id); it reasons via OpenAI-style reasoning_effort like every
  // other model on this gateway.
  "codebuddy-intl": {
    "glm-5.3":           { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 48000 },
    "glm-5.3-flash":     { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "glm-5.2":            { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 48000 },
    "glm-5.1":            { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "glm-5.0-turbo":      { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "glm-5v-turbo":       { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 38000 },
    "minimax-m3":         { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 512000, maxOutput: 48000 },
    "minimax-m2.7":       { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "kimi-k3-1":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 1048576 },
    "kimi-k2.7":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 256000, maxOutput: 32000 },
    "kimi-k2.6":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 256000, maxOutput: 32000 },
    "kimi-k2.5":          { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 164000, maxOutput: 32000 },
    "hy4-preview":        { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 64000 },
    "hy4-preview-x":      { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 64000 },
    "hy3-preview":        { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 192000, maxOutput: 64000 },
    "deepseek-v4-pro":    { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 50000 },
    "deepseek-v4-flash":  { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 50000 },
    "deepseek-v3-2-volc": { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 96000, maxOutput: 32000 },
  },
  workbuddy: {
    "hy3":               { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 64000 },
    "hy4-preview":       { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 64000 },
    "hy4-preview-x":     { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 64000 },
    "glm-5.3":           { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 48000 },
    "glm-5.3-flash":     { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "glm-5.2":           { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 48000 },
    "glm-5.1":           { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "glm-5.0-turbo":     { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "glm-5v-turbo":      { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 38000 },
    "minimax-m3":        { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 512000, maxOutput: 48000 },
    "minimax-m2.7":      { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 48000 },
    "kimi-k3-1":         { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 1048576 },
    "kimi-k2.7":         { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 256000, maxOutput: 32000 },
    "kimi-k2.6":         { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 256000, maxOutput: 32000 },
    "kimi-k2.5":         { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 164000, maxOutput: 32000 },
    "hy3-preview":       { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 192000, maxOutput: 64000 },
    "deepseek-v4-pro":   { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 50000 },
    "deepseek-v4-flash": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 50000 },
    "deepseek-v3-2-volc": { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 96000, maxOutput: 32000 },
  },
  // Qoder — upstream exposes opaque internal ids (dfmodel, kmodel, …); the
  // registry `name` is display-only and capability lookup matches on the raw
  // id, so every qoder model would fall through to DEFAULT_CAPABILITIES
  // (200K) without this map. contextWindow follows the real model family's
  // spec: the /algo/api/v2/model/list max_input_tokens under-reports some
  // windows (GLM-5.3 / Kimi-K3 / Qwen3.8-Max claim 180K but accept more).
  // max_output_tokens arrives as 0 for every model, so outputs are
  // best-guess from the real model family. Vision tags follow the
  // upstream is_vl flag; the executor now passes image_url blocks through
  // (http(s) URLs and inline data: URIs are accepted directly). reasoning:true
  // on all of them — every model can reason; the upstream is_reasoning flag
  // only drives model_config selection. thinkingFormat keeps the true-model
  // family for documentation/UI, but thinkingCanDisable:false everywhere: the
  // executor only forwards messages/tools/max_tokens, and thinking is fixed
  // upstream via modelConfig.is_reasoning — client thinking intent is dropped,
  // so "none" must never be offered as an option.
  "qoder": {
    "ultimate":       { vision: true, reasoning: true, thinkingFormat: "claude-adaptive", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 128000 }, // Claude Opus 5
    "performance":    { vision: true, reasoning: true, thinkingFormat: "claude-adaptive", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 128000 }, // Claude Sonnet 5
    "dmodel":         { reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 65536 },  // DeepSeek-V4-Pro
    "dfmodel":        { reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 65536 },  // DeepSeek-V4-Flash
    "gmodel":         { reasoning: true, thinkingFormat: "zai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 128000 },      // GLM-5.3
    "gfmodel":        { vision: true, reasoning: true, thinkingFormat: "zai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 128000 }, // GLM-5.3-Flash
    "kmodel_latest":  { vision: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 65536 },      // Kimi-K3
    "kmodel":         { vision: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 256000, maxOutput: 65536 },  // Kimi-K2.7-Code
    "mmodel":         { reasoning: true, thinkingFormat: "minimax", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 512000 }, // MiniMax-M3
    "qmodel_latest":  { vision: true, reasoning: true, thinkingFormat: "qwen", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 65536 },  // Qwen3.7-Max
    "qmodel":         { vision: true, reasoning: true, thinkingFormat: "qwen", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 65536 },  // Qwen3.7-Plus
    "qfmodel":        { vision: true, reasoning: true, thinkingFormat: "qwen", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 65536 },  // Qwen3.8-Flash
    "qmodel_38max":   { vision: true, reasoning: true, thinkingFormat: "qwen", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 65536 },      // Qwen3.8-Max
  },
  // xKiro — generated from the LIVE /v1/models snapshot (2026-09-06, all 112
  // chat models). Models WITHOUT a reasoning_efforts object ignore reasoning
  // parameters entirely (xKiro docs) → reasoning:false hides the thinking
  // picker instead of advertising controls that do nothing.
  // Two-position switch shapes are remapped to our enum faithfully:
  //   off/on           → [none, low]      (none = off; positive = switch on)
  //   adaptive/disabled → [none, medium]  (none = off; positive = model decides)
  // For graded sets without an off position a none-intent clamps to the
  // cheapest advertised step, matching xKiro's below-lowest semantics.
  "xkiro": {
    "anthropic/claude-fable-5": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "anthropic/claude-fable-5-1": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "anthropic/claude-haiku-4.5": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high"], contextWindow: 200000, maxOutput: 65536 },
    "anthropic/claude-opus-4.6": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "anthropic/claude-opus-4.7": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "anthropic/claude-opus-4.8": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "anthropic/claude-opus-5": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "anthropic/claude-sonnet-4.6": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "anthropic/claude-sonnet-5": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "deepseek/deepseek-chat-v3.1": { vision: false, reasoning: false, contextWindow: 163840, maxOutput: 65536 },
    "deepseek/deepseek-v3.2": { vision: false, reasoning: false, contextWindow: 131072, maxOutput: 65536 },
    "deepseek/deepseek-v4-flash": { vision: false, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "deepseek/deepseek-v4-flash-0731": { vision: false, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "deepseek/deepseek-v4-flash-vision-exp": { vision: true, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "deepseek/deepseek-v4-pro": { vision: false, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "deepseek/deepseek-v4-pro-0813": { vision: false, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "google/gemini-2.5-flash": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "google/gemini-2.5-pro": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "google/gemini-3-flash": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "google/gemini-3.1-pro": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "google/gemini-3.5-flash": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "google/gemini-3.6-flash": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high"], contextWindow: 1000000, maxOutput: 65536 },
    "google/gemini-3.7-flash": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high"], contextWindow: 1000000, maxOutput: 65536 },
    "google/gemini-3.8-flash": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high"], contextWindow: 1000000, maxOutput: 65536 },
    "meta/muse-spark-1.2-contributor": { vision: true, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "minimax/minimax-m2.1-highspeed:free": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m2.1:free": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m2.5": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m2.5-highspeed:free": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m2.5:free": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m2.7": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 131100 },
    "minimax/minimax-m2.7-highspeed:free": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m2.7:free": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m2:free": { vision: false, reasoning: false, contextWindow: 204800, maxOutput: 65536 },
    "minimax/minimax-m3": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "minimax/minimax-m3:free": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "medium"], contextWindow: 1000000, maxOutput: 65536 },
    "mistralai/codestral-2508": { vision: false, reasoning: false, contextWindow: 256000, maxOutput: 16384 },
    "mistralai/devstral-medium": { vision: false, reasoning: false, contextWindow: 256000, maxOutput: 16384 },
    "mistralai/ministral-14b": { vision: true, reasoning: false, contextWindow: 256000, maxOutput: 8192 },
    "mistralai/ministral-3b": { vision: true, reasoning: false, contextWindow: 128000, maxOutput: 8192 },
    "mistralai/ministral-8b": { vision: true, reasoning: false, contextWindow: 256000, maxOutput: 8192 },
    "mistralai/mistral-large-2512": { vision: true, reasoning: false, contextWindow: 256000, maxOutput: 16384 },
    "mistralai/mistral-medium-3.5": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "high"], contextWindow: 256000, maxOutput: 65536 },
    "mistralai/mistral-small-2603": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "high"], contextWindow: 256000, maxOutput: 65536 },
    "moonshotai/kimi-k2.5": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "moonshotai/kimi-k2.6": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "moonshotai/kimi-k2.7-code": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "moonshotai/kimi-k3": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "high", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "nvidia/llama-3.3-nemotron-super-49b": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 131072, maxOutput: 65536 },
    "nvidia/nemotron-3-nano": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 1000000, maxOutput: 65536 },
    "nvidia/nemotron-3-nano-omni": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 256000, maxOutput: 65536 },
    "nvidia/nemotron-3-super": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 1000000, maxOutput: 65536 },
    "nvidia/nemotron-3-ultra": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 1000000, maxOutput: 65536 },
    "openai/gpt-5.3-codex-spark": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 128000, maxOutput: 65536 },
    "openai/gpt-5.4": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 1000000, maxOutput: 65536 },
    "openai/gpt-5.4-mini": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 400000, maxOutput: 65536 },
    "openai/gpt-5.5": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 1000000, maxOutput: 65536 },
    "openai/gpt-5.6-luna": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "openai/gpt-5.6-sol": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "openai/gpt-5.6-terra": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "openai/gpt-6-astra": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh", "max"], contextWindow: 1050000, maxOutput: 65536 },
    "qwen/qwen-plus-2025-07-28:free": { vision: true, reasoning: false, contextWindow: 131072, maxOutput: 65536 },
    "qwen/qwen3-coder-plus:free": { vision: true, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "qwen/qwen3-max:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3-omni-flash:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3-vl-plus:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3.5-397b-a17b:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3.5-flash:free": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.5-omni-flash:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3.5-omni-plus:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3.5-plus": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.5-plus:free": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.6-27b:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3.6-35b-a3b:free": { vision: true, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3.6-max-preview:free": { vision: false, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "qwen/qwen3.6-plus": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.6-plus:free": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.7-max": { vision: false, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.7-max:free": { vision: false, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.7-plus": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.7-plus:free": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.8-max": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "qwen/qwen3.8-max:free": { vision: true, reasoning: false, contextWindow: 1000000, maxOutput: 65536 },
    "sensenova/sensenova-6.7-flash-lite": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low", "medium", "high"], contextWindow: 262144, maxOutput: 65536 },
    "sensenova/sensenova-6.8-flash-lite": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low", "medium", "high"], contextWindow: 262144, maxOutput: 65536 },
    "tencent/hy3": { vision: false, reasoning: false, contextWindow: 262144, maxOutput: 65536 },
    "tencent/hy4-preview": { vision: false, reasoning: false, contextWindow: 1048576, maxOutput: 65536 },
    "x-ai/grok-4.5": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high"], contextWindow: 500000, maxOutput: 65536 },
    "x-ai/grok-4.6": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 500000, maxOutput: 65536 },
    "x-ai/grok-build-0.1": { vision: true, reasoning: false, contextWindow: 256000, maxOutput: 16384 },
    "xiaomi/mimo-v2.5": { vision: true, reasoning: false, contextWindow: 1050000, maxOutput: 65536 },
    "xiaomi/mimo-v2.5-pro": { vision: false, reasoning: false, contextWindow: 1050000, maxOutput: 65536 },
    "z-ai/glm-4.5": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 131072, maxOutput: 65536 },
    "z-ai/glm-4.5-air": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 131072, maxOutput: 65536 },
    "z-ai/glm-4.5-airx": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 131072, maxOutput: 65536 },
    "z-ai/glm-4.5-flash": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 131072, maxOutput: 65536 },
    "z-ai/glm-4.5-x": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 131072, maxOutput: 65536 },
    "z-ai/glm-4.5v": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 65536, maxOutput: 65536 },
    "z-ai/glm-4.6": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
    "z-ai/glm-4.6v": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 128000, maxOutput: 65536 },
    "z-ai/glm-4.6v-flash": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 128000, maxOutput: 65536 },
    "z-ai/glm-4.6v-flashx": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 128000, maxOutput: 65536 },
    "z-ai/glm-4.7": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
    "z-ai/glm-4.7-flash": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
    "z-ai/glm-4.7-flashx": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
    "z-ai/glm-5": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
    "z-ai/glm-5-turbo": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
    "z-ai/glm-5.1": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
    "z-ai/glm-5.2": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "minimal", "low", "medium", "high", "xhigh", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "z-ai/glm-5.3": { vision: false, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "high", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "z-ai/glm-5.3-flash": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "high", "max"], contextWindow: 1000000, maxOutput: 65536 },
    "z-ai/glm-5v-turbo": { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: true, thinkingLevels: ["none", "low"], contextWindow: 200000, maxOutput: 65536 },
  },
};

// Qoder CN serves the identical model catalog from the CN gateway, so it shares
// the intl Qoder capability table verbatim (vision/reasoning/contextWindow).
PROVIDER_CAPABILITIES["qoder-cn"] = PROVIDER_CAPABILITIES["qoder"];

/**
 * Pattern fallback — glob (* = wildcard), matched case-insensitively and
 * anchored (^...$) so a pattern must match the full model id. ORDER MATTERS:
 * vision/specific variants first, text-only/generic families last, to avoid
 * a broad family pattern swallowing an exception (e.g. glm-4.6v vs glm-5).
 */
export const PATTERN_CAPABILITIES = [
  // ── Claude (4.6+ = adaptive thinking; older/haiku = budget) ──────
  { pattern: "*claude*opus-5*",     caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive", contextWindow: 1000000, maxOutput: 128000 } },
  { pattern: "*claude*opus-4.6*",   caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive" } },
  { pattern: "*claude*opus-4.7*",   caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive" } },
  { pattern: "*claude*opus-4.8*",   caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive" } },
  { pattern: "*claude*sonnet-4.6*", caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive" } },
  { pattern: "*claude*sonnet-4.7*", caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-adaptive" } },
  { pattern: "*claude*haiku*",  caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-budget" } },
  { pattern: "*claude*opus*",   caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-budget" } },
  { pattern: "*claude*sonnet*", caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-budget" } },
  { pattern: "*claude*fable*",  caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-budget", contextWindow: 1000000, maxOutput: 128000 } },
  { pattern: "*claude*mythos*", caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-budget", contextWindow: 1000000, maxOutput: 128000 } },
  { pattern: "*claude-3*",      caps: { vision: true } },
  { pattern: "*claude*",        caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-budget" } },

  // ── Gemini (all 2.0+ multimodal + google_search grounding, 1M ctx) ─
  { pattern: "*gemini*image*",  caps: { vision: true, imageOutput: true, contextWindow: 1048576 } },
  { pattern: "*gemini-3.8*",    caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, search: true, thinkingFormat: "gemini-level", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 65536 } },
  { pattern: "*gemini-3.7*",    caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, search: true, thinkingFormat: "gemini-level", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 65536 } },
  { pattern: "*gemini-3*pro*",  caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, search: true, thinkingFormat: "gemini-level", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 65535 } },
  { pattern: "*gemini-3*",      caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, search: true, thinkingFormat: "gemini-level", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 65536 } },
  { pattern: "*gemini-2.5*",    caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, search: true, thinkingFormat: "gemini-budget", thinkingRange: { min: 0, max: 24576 }, contextWindow: 1048576, maxOutput: 65536 } },
  { pattern: "*gemini-2*",      caps: { vision: true, audioInput: true, videoInput: true, search: true, contextWindow: 1048576, maxOutput: 65536 } },
  { pattern: "*gemini*",        caps: { vision: true, search: true, contextWindow: 1048576 } },
  { pattern: "*gemma*",         caps: { vision: true, contextWindow: 128000 } },
  { pattern: "*nanobanana*",    caps: { vision: true, imageOutput: true } },

  // ── OpenAI GPT-6.x (vision + thinking + web search) ──────────────
  { pattern: "*gpt-6*",         caps: { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 272000, maxOutput: 128000 } },

  // ── OpenAI GPT-5.x (vision + thinking + web search) ──────────────
  { pattern: "*gpt-5*image*",   caps: { imageOutput: true } },
  { pattern: "*gpt-5*codex*",   caps: { reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 400000, maxOutput: 128000 } },
  { pattern: "*gpt-5*",         caps: { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 400000, maxOutput: 128000 } },
  { pattern: "*gpt-4o*",        caps: { vision: true, search: true, contextWindow: 128000, maxOutput: 16384 } },
  { pattern: "*gpt-4.1*",       caps: { vision: true, contextWindow: 1000000, maxOutput: 32768 } },
  { pattern: "*gpt-4-turbo*",   caps: { vision: true, contextWindow: 128000 } },
  { pattern: "*gpt-4*",         caps: { contextWindow: 128000 } },
  { pattern: "*gpt-3.5*",       caps: { contextWindow: 16385, maxOutput: 4096 } },
  { pattern: "*gpt-oss*",       caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 128000 } },

  // ── OpenAI o-series (reasoning, vision) ──────────────────────────
  { pattern: "*o1-mini*",       caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 128000 } },
  { pattern: "*o1*",            caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "*o3*",            caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "*o4*",            caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },

  // ── Grok (vision + Live Search) ──────────────────────────────────
  { pattern: "*grok*image*",    caps: { imageOutput: true } },
  { pattern: "*grok-code*",     caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 256000 } },
  // Grok 4.6: 500k context, no text output limit (docs.x.ai/developers/grok-4-6)
  { pattern: "*grok-4.6*",      caps: { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 500000, maxOutput: 500000 } },
  // Grok 4.5 (Grok CLI / Grok Build): 500k context per cli-chat-proxy /v1/models
  { pattern: "*grok-4.5*",      caps: { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 500000, maxOutput: 64000 } },
  { pattern: "*grok-4*",        caps: { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 256000 } },
  { pattern: "*grok-3*",        caps: { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 131072 } },
  { pattern: "*grok*",          caps: { vision: true, reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 256000 } },

  // ── Qwen (3.5+ = native vision/video; coder & max = text-only; QwQ = thinking-only) ─
  { pattern: "*qwen*vl*",       caps: { vision: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 262144 } },
  { pattern: "*qwen*omni*",     caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 262144, maxOutput: 65536 } },
  { pattern: "*qwen*coder*",    caps: { reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000 } },
  { pattern: "*qwen*max*",      caps: { vision: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000, maxOutput: 65536 } },
  { pattern: "*qwen3.5*",       caps: { vision: true, videoInput: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000, maxOutput: 65536 } },
  { pattern: "*qwen3.6*",       caps: { vision: true, videoInput: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000, maxOutput: 65536 } },
  { pattern: "*qwen3.7*",       caps: { vision: true, videoInput: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000, maxOutput: 65536 } },
  { pattern: "*qwen*plus*",     caps: { vision: true, reasoning: true, thinkingFormat: "qwen", contextWindow: 1000000, maxOutput: 65536 } },
  { pattern: "*qwen*235b*",     caps: { reasoning: true, thinkingFormat: "qwen", contextWindow: 262144 } },
  { pattern: "*qwq*",           caps: { reasoning: true, thinkingFormat: "qwen", thinkingCanDisable: false, contextWindow: 131072 } },
  { pattern: "*qwen*",          caps: { reasoning: true, thinkingFormat: "qwen", contextWindow: 262144 } },

  // ── Kimi (enabled→reasoning_effort; K2.7-code cannot disable) ─────
  { pattern: "*kimi*k3*",       caps: { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 131072 } },
  { pattern: "*kimi*for-coding*", caps: { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 65536 } },
  { pattern: "*kimi*k2.7*code*", caps: { vision: true, videoInput: true, reasoning: true, thinkingFormat: "kimi", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 65536 } },
  { pattern: "*kimi*k2*",       caps: { vision: true, reasoning: true, thinkingFormat: "kimi", contextWindow: 262144, maxOutput: 262144 } },
  { pattern: "*kimi*",          caps: { reasoning: true, thinkingFormat: "kimi", contextWindow: 262144 } },

  // ── GLM / Z.ai (thinking.enabled; disable via enable_thinking:false) ─
  // reasoning_effort is only read by z.ai from GLM-5.2 onward (docs.z.ai/guides/capabilities/thinking) —
  // older GLM (4.x, 5.0, 5.1, 5-turbo, 5v-turbo) ignore it, so gate it per exact version, not the "*glm-5*" catch-all.
  { pattern: "*glm-5.3*",       caps: { reasoning: true, thinkingFormat: "zai", thinkingEffortSupported: true, contextWindow: 200000, maxOutput: 128000 } },
  { pattern: "*glm-5.2*",       caps: { reasoning: true, thinkingFormat: "zai", thinkingEffortSupported: true, contextWindow: 200000, maxOutput: 128000 } },
  { pattern: "*glm-5*",         caps: { reasoning: true, thinkingFormat: "zai", contextWindow: 200000, maxOutput: 128000 } },
  { pattern: "*glm-4.7*",       caps: { reasoning: true, thinkingFormat: "zai", contextWindow: 200000, maxOutput: 128000 } },
  { pattern: "*glm-4*",         caps: { reasoning: true, thinkingFormat: "zai", contextWindow: 200000 } },
  { pattern: "*glm*",           caps: { reasoning: true, thinkingFormat: "zai", contextWindow: 200000 } },

  // ── DeepSeek (thinking.enabled + reasoning_effort; r1 = thinking-only) ─
  // v4.1+ has real image input (probed live on Alibaba MaaS: correct color
  // read from a PNG). v4-pro / v4-flash-0731 accept image blocks but ignore
  // them (answered "Unknown"), so vision stays scoped to v4.* dotted releases.
  { pattern: "*deepseek-v4.*",  caps: { vision: true, reasoning: true, thinkingFormat: "deepseek", thinkingEffortSupported: true, contextWindow: 1000000, maxOutput: 128000 } },
  { pattern: "*deepseek-v4*",   caps: { reasoning: true, thinkingFormat: "deepseek", thinkingEffortSupported: true, contextWindow: 1000000, maxOutput: 384000 } },
  { pattern: "*reasoner*",      caps: { reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 128000 } },
  { pattern: "*deepseek-r*",    caps: { reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 128000 } },
  { pattern: "*deepseek-chat*", caps: { contextWindow: 128000 } },
  { pattern: "*deepseek*",      caps: { reasoning: true, thinkingFormat: "deepseek", contextWindow: 128000 } },

  // ── MiniMax (M3 = adaptive; M2.x cannot disable) ─────────────────
  { pattern: "*minimax*image*", caps: { imageOutput: true } },
  { pattern: "*minimax-m3*",    caps: { vision: true, reasoning: true, thinkingFormat: "minimax", contextWindow: 1000000, maxOutput: 131072 } },
  { pattern: "*minimax-m2.7*",  caps: { vision: true, reasoning: true, thinkingFormat: "minimax", thinkingCanDisable: false, contextWindow: 204800, maxOutput: 131072 } },
  { pattern: "*minimax-m2.5*",  caps: { vision: true, reasoning: true, thinkingFormat: "minimax", thinkingCanDisable: false, contextWindow: 204800, maxOutput: 131072 } },
  { pattern: "*minimax*",       caps: { reasoning: true, thinkingFormat: "minimax", thinkingCanDisable: false, contextWindow: 200000, maxOutput: 131072 } },

  // ── Xiaomi MiMo (vision + <think>-tag reasoning, always-on, can't disable) ──
  { pattern: "*mimo*v2.6*",     caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 131072 } },
  { pattern: "*mimo*v2.5*",     caps: { vision: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 1048576, maxOutput: 131072 } },
  { pattern: "*mimo*omni*",     caps: { vision: true, audioInput: true, reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 131072 } },
  { pattern: "*mimo*",          caps: { vision: true, reasoning: true, thinkingFormat: "deepseek", thinkingCanDisable: false, contextWindow: 262144, maxOutput: 131072 } },

  // ── Llama (4 = vision/1M; 3.x = text-only/128K) ──────────────────
  { pattern: "*llama-4*",       caps: { vision: true, contextWindow: 1000000 } },
  { pattern: "*llama*",         caps: { contextWindow: 128000 } },

  // ── Mistral (Large 3 = vision/256K; codestral text) ──────────────
  { pattern: "*codestral*",     caps: { contextWindow: 256000 } },
  { pattern: "*mistral-large*", caps: { vision: true, contextWindow: 256000 } },
  { pattern: "*mistral*",       caps: { contextWindow: 128000 } },

  // ── Cohere (Command A Vision = vision; others text) ──────────────
  { pattern: "*command-a-vision*", caps: { vision: true, contextWindow: 128000 } },
  { pattern: "*command*",       caps: { contextWindow: 128000 } },

  // ── Perplexity (web search native) ───────────────────────────────
  { pattern: "*sonar*",         caps: { search: true, contextWindow: 128000 } },
  { pattern: "*pplx*",          caps: { search: true, contextWindow: 128000 } },
  { pattern: "*perplexity*",    caps: { search: true, contextWindow: 128000 } },

  // ── Poolside Laguna (resellers: openrouter/nvidia/kilocode/vercel/...) ──
  // Free tiers cap S 2.1 well below the paid 1M window → match the free suffix
  // (":free" or "-free", depending on reseller) before the plain id.
  { pattern: "*laguna-s-2.1*free*", caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 32000 } },
  { pattern: "*laguna-s-2.1*",  caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 1000000, maxOutput: 32000 } },
  { pattern: "*laguna*",        caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 32000 } },


  // ── OpenCode Free Muse Spark (multimodal text+image; OpenAI Responses reasoning supports up to xhigh) ─
  { pattern: "*muse*spark*",    caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 1048576, maxOutput: 131072 } },
  // ── Others ───────────────────────────────────────────────────────
  { pattern: "*hunyuan*",       caps: { reasoning: true, thinkingFormat: "hunyuan", contextWindow: 262144, maxOutput: 262144 } },
  { pattern: "hy3*",            caps: { reasoning: true, thinkingFormat: "hunyuan", contextWindow: 262144, maxOutput: 262144 } },
  { pattern: "*step-*",         caps: { reasoning: true, thinkingFormat: "step", contextWindow: 128000 } },
  { pattern: "*nemotron*",      caps: { reasoning: true, contextWindow: 128000 } },
  { pattern: "*ling-*",         caps: { reasoning: true, contextWindow: 128000 } },
  // M5 FIX: Tightened from bare *claude* to require a dash separator, avoiding
  // false-positives on custom models that happen to contain "claude" (e.g.
  // "my-claude-finetune"). Real Claude model IDs always contain "claude-".
  { pattern: "*claude-*",       caps: { vision: true, reasoning: true, search: true, thinkingFormat: "claude-budget" } },
  { pattern: "*gpt-5.6-sol*",  caps: { reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 272000, maxOutput: 128000, thinkingMaxEffort: true } },
  { pattern: "*gpt-5.6-terra*", caps: { reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 272000, maxOutput: 128000 } },
  { pattern: "*gpt-5.6-luna*", caps: { reasoning: true, search: true, thinkingFormat: "openai", contextWindow: 272000, maxOutput: 128000 } },
  // ── Moonshot / Kimi K3 (reasoning, supports max effort) ──────────
  // K3 reasoning + Preserved Thinking always on (can't disable), native tiers
  // low/high/max only (default max). See moonshot.js registry note.
  { pattern: "*kimi-k3*",      caps: { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["low", "high", "max"], thinkingMaxEffort: true, contextWindow: 1048576, maxOutput: 1048576 } },
  // MAI-Code-1-Flash (Microsoft via GitHub Copilot) — code-generation model.
  { pattern: "*mai-code*",      caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 256000, maxOutput: 128000 } },
  { pattern: "*o1-*",           caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "*o1_*",           caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "*o3-*",           caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "*o3_*",           caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "*o4-*",           caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "*o4_*",           caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  // Bare o1/o3/o4 ids (openai/o1, openai/o3, chatgpt-web/o3, copilot-web/o3, …)
  // contain no dash/underscore, so the *o1-* / *o3_* patterns never match them
  // and they silently lost reasoning+vision. models.dev: reasoning, image/pdf
  // input, 200k ctx / 100k output. Specific variants (o1-mini, o3-mini, o4-mini)
  // are still caught by the earlier patterns.
  { pattern: "o1*",            caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "o3*",            caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  { pattern: "o4*",            caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 200000, maxOutput: 100000 } },
  // ── Grok (vision + Live Search) ──────────────────────────────────
  { pattern: "*grok-imagine-video*", caps: { videoOutput: true } },
  // ── Qwen (3.5+ = native vision/video; coder & max = text-only; QwQ = thinking-only) ─
  // TokenRouter qwen family (provider-qualified, must precede the generic
  // patterns below): the backing endpoint only accepts reasoning_effort
  // low|medium — high/max/none/auto are rejected by the validator and xhigh
  // 422s upstream. Thinking is always on by default, so "none"/"auto" must not
  // reach it as an invalid enum: clamp every request to low|medium and
  // disable-requests to low (minimal).
  { provider: "tokenrouter", pattern: "*qwen*", caps: { vision: true, reasoning: true, thinkingFormat: "openai", thinkingLevels: ["low", "medium"], thinkingCanDisable: false, thinkingMaxEffort: false, contextWindow: 262144, maxOutput: 65536 } },
  // opencode — generic Muse Spark pattern (covers passthrough discoveries the free
  // lane returns, e.g. muse-spark-1.x-contributor-free). Provider-scoped so it can't
  // leak onto muse-spark-web (which doesn't speak OpenAI-compatible effort). Matches
  // isMuseSparkModel() routing: any Muse Spark on opencode is Responses-API + multimodal.
  { provider: "opencode", pattern: "*muse*spark*", caps: { vision: true, pdf: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 } },
  // opencode-go — same Muse Spark family on the Go lane (/zen/go/v1/responses
  // only, see OpenCodeGoExecutor). Provider-scoped for the same muse-spark-web guard.
  { provider: "opencode-go", pattern: "*muse*spark*", caps: { vision: true, pdf: true, audioInput: true, videoInput: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, thinkingLevels: ["minimal", "low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 } },
  // Qwen3.8 dense (OrcaRouter self-host + Alibaba) — reasoning + tools; vision
  // not guaranteed on every host (Orca free card is text-only 64k). Keep
  // family-level reasoning; provider-scoped orcarouter pin overrides ctx/vision.
  { pattern: "*qwen3.8*",       caps: { reasoning: true, thinkingFormat: "qwen", contextWindow: 262144, maxOutput: 65536 } },
  // kimi-latest (Moonshot chat) accepts image input (models.dev).
  { pattern: "*kimi-latest*",   caps: { vision: true, reasoning: true, thinkingFormat: "kimi", contextWindow: 262144 } },
  { pattern: "*mimo*auto*",     caps: { vision: true, reasoning: true, thinkingFormat: "openai", contextWindow: 262144, maxOutput: 131072 } },
  // ── Cohere (Command A Vision = vision; others text) ──────────────
  // Cohere Command A Reasoning — explicit reasoning model (models.dev: 256k ctx).
  { pattern: "*command-a-reasoning*", caps: { reasoning: true, thinkingFormat: "openai", contextWindow: 256000, maxOutput: 32000 } },
  // 0x-Alpha family (covers bare, slashed, stealth prefix, and -free forms).
  // Must be before *x-preview* so stealth/ox-alpha doesn't fall through.
  { pattern: "*ox-alpha*",     caps: { reasoning: true, thinkingFormat: "openai", thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 } },
  { pattern: "*0x*alpha*",     caps: { reasoning: true, thinkingFormat: "openai", thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 } },
  { pattern: "*x-preview*",    caps: { reasoning: true, thinkingFormat: "openai", thinkingLevels: ["low", "medium", "high", "xhigh"], contextWindow: 1048576, maxOutput: 131072 } },
  { pattern: "*step-3.7*",      caps: { reasoning: true, thinkingFormat: "step", thinkingLevels: ["low", "medium", "high"], contextWindow: 256000, maxOutput: 256000 } },
  // Hy4 preview (Tencent Hunyuan, OpenCode Go / CodeBuddy / WorkBuddy).
  // Vendor reports vision + always-on reasoning; large context/output.
  { pattern: "hy4*",            caps: { vision: true, reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000, maxOutput: 64000 } },
  // LongCat-2.0 (Meituan) — OpenCode Go cheap coding lane. Large context
  // (Go usage table: ~89K cached tokens/request); reasoning format unknown.
  { pattern: "*longcat*",       caps: { contextWindow: 131072, maxOutput: 32768 } },
];

/**
 * Aggregate capabilities for a combo from its constituent model IDs.
 * Each entry in comboModels is a fully-qualified "provider/model" string.
 *
 * Union:        vision, pdf, audioInput, videoInput, imageOutput, audioOutput, search
 * Intersection: tools
 * Primary:      reasoning fields from the first (primary) model
 * Window:       contextWindow and maxOutput both follow the largest member, because a
 *               combo fails over instead of splitting one conversation across models.
 *               Reporting the smallest window would make a client compact a 1M model
 *               down to 256k for no reason. A combo may set its own window, which then
 *               wins over the auto-detected one.
 *
 * @param {string[]} comboModels
 * @param {Object|null} [comboLookup] optional map of combo name → models array for nested resolution
 * @param {number} [_depth] internal recursion depth guard
 * @param {number} [contextOverride] explicit contextWindow set on the combo
 * @returns {object|null} full capabilities object, or null for empty input
 */
export function aggregateComboCapabilities(comboModels, comboLookup = null, _depth = 0, contextOverride = 0) {
  if (!comboModels?.length || _depth > 6) return null;
  const allCaps = comboModels.map((fullId) => {
    // Nested combo: bare name (no slash) that exists in the lookup — recurse
    if (!fullId.includes("/") && comboLookup?.[fullId]) {
      return aggregateComboCapabilities(comboLookup[fullId], comboLookup, _depth + 1, contextOverride)
          ?? getCapabilitiesForModel(null, fullId);
    }
    const slash = fullId.indexOf("/");
    const provider = slash === -1 ? null : fullId.slice(0, slash);
    const model = slash === -1 ? fullId : fullId.slice(slash + 1);
    return getCapabilitiesForModel(provider, model);
  });
  const first = allCaps[0];
  const windows = allCaps.map((c) => c.contextWindow).filter(Number.isFinite);
  const outputs = allCaps.map((c) => c.maxOutput).filter(Number.isFinite);
  const override = Number(contextOverride);
  return {
    vision:      allCaps.some((c) => c.vision),
    pdf:         allCaps.some((c) => c.pdf),
    audioInput:  allCaps.some((c) => c.audioInput),
    videoInput:  allCaps.some((c) => c.videoInput),
    imageOutput: allCaps.some((c) => c.imageOutput),
    audioOutput: allCaps.some((c) => c.audioOutput),
    search:      allCaps.some((c) => c.search),
    tools:       allCaps.every((c) => c.tools),
    reasoning:          first.reasoning,
    thinkingFormat:     first.thinkingFormat,
    thinkingCanDisable: first.thinkingCanDisable,
    thinkingRange:      first.thinkingRange,
    contextWindow: Number.isFinite(override) && override > 0
      ? override
      : (windows.length ? Math.max(...windows) : DEFAULT_CAPABILITIES.contextWindow),
    maxOutput: outputs.length ? Math.max(...outputs) : DEFAULT_CAPABILITIES.maxOutput,
  };
}

/**
 * Resolve capabilities for a model using the 4-step fallback chain,
 * merged over DEFAULT_CAPABILITIES so the result is always complete.
 *
 * @param {string} provider
 * @param {string} model
 * @returns {object} full capabilities object
 */
const MODALITY_KEYS = ["vision", "pdf", "audioInput", "videoInput"];

// Catalog lookups, installed by the server at startup. Left as no-ops in the
// browser bundle, where there is no file to read.
//
// The server bundles this module into every route chunk that needs it, and each
// copy carries its own module state, so an install landing in the copy the
// startup hook imported stays invisible to the copy resolving requests. The slot
// lives on globalThis instead; the local binding is the fast path.
let catalogSource = null;

/**
 * Install the synced catalog reader (server only).
 * @param {{ getModalities: (provider: string, model: string) => object|null,
 *           getLimits: (provider: string, model: string) => object|null } | null} source
 */
export function setCatalogSource(source) {
  catalogSource = source;
  if (typeof globalThis !== "undefined") globalThis.__9rCatalogSource = source;
}

function getCatalogSource() {
  if (catalogSource) return catalogSource;
  if (typeof globalThis === "undefined") return null;
  return (catalogSource = globalThis.__9rCatalogSource || null);
}

// Apply the synced catalog + name heuristic on top of a table-resolved result.
// Strictly additive: a capability already true stays true, and a false one only
// flips when an outside source positively declares support.
function refine(base, provider, model) {
  const result = { ...DEFAULT_CAPABILITIES, ...base };

  const source = getCatalogSource();
  if (source) {
    const modalities = source.getModalities(provider, model);
    if (modalities) {
      for (const key of MODALITY_KEYS) {
        if (modalities[key] === true) result[key] = true;
      }
    }

    const limits = source.getLimits(provider, model);
    if (limits) {
      if (limits.contextWindow > 0) result.contextWindow = limits.contextWindow;
      if (limits.maxOutput > 0) result.maxOutput = limits.maxOutput;
    }
  }

  if (!result.vision && looksLikeVisionModel(model)) result.vision = true;

  return result;
}

// Mirrors Command Code CLI `isKnownTextOnlyModel` (no image input). New models
// default to vision; only this denylist stays text-only.
const COMMANDCODE_TEXT_ONLY = new Set([
  "deepseek/deepseek-v4-pro",
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-flash-fast",
  "zai-org/glm-5.3",
  "zai-org/glm-5.2",
  "zai-org/glm-5.2-fast",
  "zai-org/glm-5.1",
  "zai-org/glm-5",
  "minimaxai/minimax-m2.7",
  "minimax/minimax-m2.7-free",
  "minimaxai/minimax-m2.5",
  "xiaomi/mimo-v2.5-pro",
  "qwen/qwen3.6-max-preview",
  "qwen/qwen3.7-max",
  "meituan/longcat-2.0:free",
  "stepfun/step-3.5-flash",
  "tencent/hy4-preview",
  "tencent/hy3",
  "tencent/hy3-paid",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "poolside/laguna-s-2.1-free",
  "inclusionai/ling-3.0-flash-free",
  "inclusionai/ling-3.0-flash-sante:free",
]);

function isCommandCodeTextOnly(model) {
  const key = String(model || "").toLowerCase();
  if (COMMANDCODE_TEXT_ONLY.has(key)) return true;
  for (const id of COMMANDCODE_TEXT_ONLY) {
    const base = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id;
    if (key === base || key.endsWith("/" + base)) return true;
  }
  return false;
}
export function getCapabilitiesForModel(provider, model) {
  if (!model) return { ...DEFAULT_CAPABILITIES };

  // Canonical exact lookup strips vendor prefix: "anthropic/claude-opus-4.7" -> "claude-opus-4.7".
  const baseModel = model.includes("/") ? model.split("/").pop() : model;

  // CommandCode wire is /alpha/generate for every model. Family patterns
  // (deepseek-v4 → thinkingFormat:deepseek, vision:false) must not win here.
  if (provider === "commandcode" || provider === "cmc") {
    const providerCaps = PROVIDER_CAPABILITIES.commandcode;
    if (providerCaps?.[model]) return { ...DEFAULT_CAPABILITIES, ...providerCaps[model] };
    if (providerCaps?.[baseModel]) return { ...DEFAULT_CAPABILITIES, ...providerCaps[baseModel] };
    return {
      ...DEFAULT_CAPABILITIES,
      reasoning: true,
      thinkingFormat: "commandcode",
      thinkingEffortSupported: true,
      vision: !isCommandCodeTextOnly(model),
      contextWindow: 1000000,
      maxOutput: 384000,
    };
  }

  // 1. Provider-specific override
  if (provider) {
    const providerCaps = PROVIDER_CAPABILITIES[provider];
    if (providerCaps?.[model]) return { ...DEFAULT_CAPABILITIES, ...providerCaps[model] };
    if (providerCaps?.[baseModel]) return { ...DEFAULT_CAPABILITIES, ...providerCaps[baseModel] };
  }

  // 2. Canonical exact
  if (MODEL_CAPABILITIES[baseModel]) return { ...DEFAULT_CAPABILITIES, ...MODEL_CAPABILITIES[baseModel] };
  if (MODEL_CAPABILITIES[model]) return { ...DEFAULT_CAPABILITIES, ...MODEL_CAPABILITIES[model] };

  // 3. Pattern match (first match wins), refined by catalog + name heuristic
  for (const { pattern, caps, provider: patternProvider } of PATTERN_CAPABILITIES) {
    if (patternProvider && patternProvider !== provider) continue;
    if (matchPattern(pattern, baseModel) || matchPattern(pattern, model)) {
      return refine(caps, provider, model);
    }
  }

  // 4. Floor
  return refine(null, provider, model);
}
