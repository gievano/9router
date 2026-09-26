// StepFun — AI model platform (api.stepfun.ai).
//
// StepFun provides access to the Step-3/3.x model family (multimodal MoE,
// 256K context, vision, video, reasoning). Supports three API formats:
//   - OpenAI Chat Completions: POST /v1/chat/completions
//   - OpenAI Responses API:    POST /v1/responses
//   - Anthropic Messages:      POST /v1/messages
//
// Also supports image generation (/v1/images/generations) and editing
// (/v1/images/edits).
//
// Auth: standard Authorization: Bearer <api_key>.
// No custom executor needed — DefaultExecutor handles all formats.

const COMPAT_BASE = "https://api.stepfun.ai";

export default {
  id: "stepfun",
  priority: 63,
  alias: "stepfun",
  aliases: ["step", "sf"],
  uiAlias: "stepfun",
  display: {
    name: "StepFun",
    icon: "stairs",
    color: "#FF6B35",
    textIcon: "SF",
    website: "https://platform.stepfun.ai",
    notice: {
      signupUrl: "https://platform.stepfun.ai",
      apiKeyUrl: "https://platform.stepfun.ai",
      text: "StepFun provides access to the Step-3/3.x model family (multimodal MoE, 256K context, vision, video, reasoning). Create an API key at platform.stepfun.ai, then paste it here. Supports OpenAI, Responses API, and Anthropic formats.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: `${COMPAT_BASE}/v1/chat/completions`,
    format: "openai",
    responsesUrl: `${COMPAT_BASE}/v1/responses`,
    validateUrl: `${COMPAT_BASE}/v1/models`,
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  // Multi-endpoint: OpenAI Chat + Responses + Anthropic Messages.
  transports: [
    {
      format: "openai",
      baseUrl: `${COMPAT_BASE}/v1/chat/completions`,
      responsesUrl: `${COMPAT_BASE}/v1/responses`,
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "openai-responses",
      baseUrl: `${COMPAT_BASE}/v1/responses`,
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: `${COMPAT_BASE}/v1/messages`,
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "step-3.7-flash", name: "Step 3.7 Flash", contextWindow: 256000 },
    { id: "step-3.5-flash", name: "Step 3.5 Flash", contextWindow: 256000 },
    { id: "step-3.5-flash-2603", name: "Step 3.5 Flash 2603", contextWindow: 256000 },
    { id: "step-3", name: "Step 3", contextWindow: 65536 },
    { id: "step-image-edit-2", name: "Step Image Edit 2", kind: "image" },
  ],
  passthroughModels: true,
  modelsFetcher: {
    url: `${COMPAT_BASE}/v1/models`,
    type: "openai",
  },
  // Reasoning support via reasoning_effort.
  thinkingConfig: {
    options: ["auto", "none", "low", "medium", "high"],
    defaultMode: "auto",
  },
  // Image generation + editing.
  serviceKinds: ["llm", "image"],
  imageConfig: {
    baseUrl: `${COMPAT_BASE}/v1/images/generations`,
    editUrl: `${COMPAT_BASE}/v1/images/edits`,
    bodyFields: ["model", "prompt", "n", "size", "response_format", "cfg_scale", "steps", "seed"],
  },
};
