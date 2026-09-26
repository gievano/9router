// ChatAnywhere — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "chatanywhere",
  priority: 50,
  alias: "chatanywhere",
  display: {
    name: "ChatAnywhere",
    icon: "router",
    color: "#2563EB",
    textIcon: "CA",
    website: "https://chatanywhere.tech",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.chatanywhere.org/v1/chat/completions",
    validateUrl: "https://api.chatanywhere.org/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Personal, educational or research use only: public documentation cites 10,000 points/day and 200 requests/day per IP/key; do not use for commercial traffic.",
};
