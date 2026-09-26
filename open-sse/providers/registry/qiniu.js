// Qiniu — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "qiniu",
  priority: 50,
  alias: "qiniu",
  display: {
    name: "Qiniu",
    icon: "cloud",
    color: "#1E88E5",
    textIcon: "QN",
    website: "https://www.qiniu.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.qnaigc.com/v1/chat/completions",
    validateUrl: "https://api.qnaigc.com/v1/models",
  },
  models: [
    { id: "mimo-v2-flash", name: "Mimo-V2-Flash" },
    { id: "xiaomi/mimo-v2-flash", name: "Xiaomi/Mimo-V2-Flash" },
  ],
  passthroughModels: true,
};
