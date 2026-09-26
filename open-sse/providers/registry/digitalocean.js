// DigitalOcean — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "digitalocean",
  priority: 50,
  alias: "digitalocean",
  display: {
    name: "DigitalOcean",
    icon: "cloud",
    color: "#0060FF",
    textIcon: "DO",
    website: "https://docs.digitalocean.com/products/ai-platform/",
      notice: {
        text: "Use a DigitalOcean Personal Access Token (dop_v1_...) or a Model Access Key from the Inference console. OAuth tokens (doo_v1_...) may not have the required scopes.",
        apiKeyUrl: "https://cloud.digitalocean.com/account/api/tokens",
      },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://inference.do-ai.run/v1/chat/completions",
    validateUrl: "https://inference.do-ai.run/v1/models",
  },
  models: [
    { id: "openai-gpt-5.2-pro", name: "OpenAI GPT-5.2 Pro" },
    { id: "openai-gpt-5.6-luna", name: "OpenAI GPT-5.6 Luna" },
    { id: "gte-large-en-v1.5", name: "GTE Large (v1.5)" },
    { id: "anthropic-claude-4.6-sonnet", name: "Anthropic Claude Sonnet 4.6" },
    { id: "openai-o3", name: "OpenAI o3" },
    { id: "anthropic-claude-opus-5", name: "Anthropic Claude Opus 5" },
  ],
  passthroughModels: true,
};
