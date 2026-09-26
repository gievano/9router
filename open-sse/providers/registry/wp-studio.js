// WordPress Studio Code — AI coding assistant built into WordPress Studio.
//
// Studio Code (by Automattic) routes AI requests through the WordPress.com
// AI API proxy at public-api.wordpress.com/wpcom/v2/ai-api-proxy. The proxy
// supports two API formats:
//   - Anthropic Messages API:  proxy base → /v1/messages
//   - OpenAI Chat Completions: proxy base/v1 → /v1/chat/completions
//
// Auth: WordPress.com OAuth2 implicit flow (client_id 95109, scope "global").
// Users log in via Studio Code (Electron app browser), and the access token
// is stored at ~/.studio/shared.json. We import that token — no separate
// OAuth flow needed.
//
// Required headers per format:
//   Anthropic: X-WPCOM-AI-Feature: studio-assistant-anthropic
//   OpenAI:    X-WPCOM-AI-Feature: studio-assistant
//
// Token lifetime: 14 days (1,209,600 seconds).

const PROXY_BASE = "https://public-api.wordpress.com/wpcom/v2/ai-api-proxy";

export default {
  id: "wp-studio",
  priority: 57,
  alias: "wp-studio",
  aliases: ["wps", "wpstudio"],
  uiAlias: "wps",
  display: {
    name: "WordPress Studio Code",
    icon: "code",
    color: "#3499CD",
    textIcon: "WP",
    website: "https://developer.wordpress.com/studio/",
    notice: {
      signupUrl: "https://developer.wordpress.com/studio/",
      text: "WordPress Studio Code provides access to Claude Sonnet 5, Opus 4.8, and GPT-5.6 Sol via the WordPress.com AI proxy. Install Studio Code, log in with your WordPress.com account, then import your credentials here.",
    },
  },
  category: "oauth",
  authType: "oauth",
  transport: {
    // Default = Anthropic Messages API (Claude models are the primary use case).
    baseUrl: `${PROXY_BASE}/v1/messages`,
    format: "claude",
    headers: {
      "X-WPCOM-AI-Feature": "studio-assistant-anthropic",
    },
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
  },
  // Multi-endpoint: Anthropic for Claude, OpenAI for GPT models.
  transports: [
    {
      format: "claude",
      baseUrl: `${PROXY_BASE}/v1/messages`,
      headers: { "X-WPCOM-AI-Feature": "studio-assistant-anthropic" },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "openai",
      baseUrl: `${PROXY_BASE}/v1/chat/completions`,
      headers: { "X-WPCOM-AI-Feature": "studio-assistant" },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", contextWindow: 200000 },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8", contextWindow: 200000 },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", contextWindow: 128000 },
  ],
  passthroughModels: true,
  oauth: {
    apiEndpoint: PROXY_BASE,
    // Token is imported from ~/.studio/shared.json, not minted via OAuth flow.
    refreshLeadMs: 86400000, // 1 day before expiry
  },
};
