// PiAPI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "piapi",
  priority: 50,
  alias: "pi",
  display: {
    name: "PiAPI",
    icon: "api",
    color: "#7C4DFF",
    textIcon: "PI",
    website: "https://piapi.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.piapi.ai/v1/chat/completions",
    validateUrl: "https://api.piapi.ai/v1/models",
  },
  passthroughModels: true,
};
