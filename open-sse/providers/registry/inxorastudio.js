// InxoraStudio Labs — multi-format AI gateway (OpenAI + Anthropic native).
//
// Hosts models from multiple providers (Claude, GLM, DeepSeek, etc.) behind a
// single API key. Supports BOTH:
//   - OpenAI Chat Completions:  POST https://labs.inxorastudio.com/v1/chat/completions
//   - Anthropic Messages:       POST https://labs.inxorastudio.com/v1/messages
//
// Model ids use the `ixlabs/` prefix (e.g. "ixlabs/claude-haiku-4.5"). The
// full model catalog is discovered live via /api/ai/models so new models appear
// automatically without a registry update.
//
// Multi-endpoint transport: the `transports` array lets the engine pick the
// right endpoint based on the client's sourceFormat. A Claude Code client
// hits /v1/messages directly (skip translation); an OpenAI client hits
// /v1/chat/completions.
import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "inxorastudio",
  priority: 340,
  alias: "inxora",
  // No "ix" alias — inferx already owns "ix"; a duplicate token made
  // resolveProviderAlias("ix") return inferx, so inxorastudio's "ix" was
  // dead config that also made the UI badge route elsewhere.
  aliases: [],
  uiAlias: "inxora",
  display: {
    name: "InxoraStudio Labs",
    icon: "science",
    color: "#8B5CF6",
    textIcon: "IX",
    website: "https://labs.inxorastudio.com",
    notice: {
      signupUrl: "https://labs.inxorastudio.com",
      apiKeyUrl: "https://labs.inxorastudio.com/dashboard",
      text: "InxoraStudio Labs is a multi-model AI gateway hosting Claude, GLM, DeepSeek, and more behind a single API key. Create an API key at labs.inxorastudio.com/dashboard, then paste it here. Supports both OpenAI and Anthropic API formats.",
    },
  },
  category: "freeTier",
  hasFree: true,
  authType: "apikey",
  transport: {
    // Default = OpenAI format (most clients use this).
    baseUrl: "https://labs.inxorastudio.com/v1/chat/completions",
    format: "openai",
    validateUrl: "https://labs.inxorastudio.com/api/ai/models",
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  // Multi-endpoint: pick the transport matching the client sourceFormat.
  // Claude clients → /v1/messages (Anthropic-native, skip translation).
  // OpenAI clients → /v1/chat/completions (native).
  transports: [
    {
      format: "openai",
      baseUrl: "https://labs.inxorastudio.com/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://labs.inxorastudio.com/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  // Live discovery only — /api/ai/models returns the full catalog with
  // accessibility flags. Empty seed catalog; passthroughModels allows any
  // model id. The modelsFetcher filter ("inxora") extracts only accessible
  // chat models.
  models: [],
  passthroughModels: true,
  modelsFetcher: {
    url: "https://labs.inxorastudio.com/api/ai/models",
    type: "inxora",
  },
};
