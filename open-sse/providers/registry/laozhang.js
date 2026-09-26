// LaoZhang AI — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "laozhang",
  priority: 50,
  alias: "lz",
  display: {
    name: "LaoZhang AI",
    icon: "hub",
    color: "#FF1744",
    textIcon: "LZ",
    website: "https://api.laozhang.ai",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.laozhang.ai/v1/chat/completions",
    validateUrl: "https://api.laozhang.ai/v1/models",
  },
  passthroughModels: true,
};
