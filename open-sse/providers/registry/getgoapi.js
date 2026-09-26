// GoAPI — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "getgoapi",
  priority: 50,
  alias: "ggo",
  display: {
    name: "GoAPI",
    icon: "rocket_launch",
    color: "#FF6D00",
    textIcon: "GO",
    website: "https://api.getgoapi.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.getgoapi.com/v1/chat/completions",
    validateUrl: "https://api.getgoapi.com/v1/models",
  },
  passthroughModels: true,
};
