// Lambda AI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "lambda-ai",
  priority: 50,
  alias: "lambda",
  display: {
    name: "Lambda AI",
    icon: "bolt",
    color: "#7C3AED",
    textIcon: "LA",
    website: "https://lambda.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.lambda.ai/v1/chat/completions",
    validateUrl: "https://api.lambda.ai/v1/models",
  },
  passthroughModels: true,
};
