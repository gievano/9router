// DXNT / DX Token — OpenAI-compatible gateway.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "dxnt",
  priority: 50,
  alias: "dxnt",
  display: {
    name: "DXNT / DX Token",
    icon: "hub",
    color: "#111827",
    textIcon: "DX",
    website: "https://www.dxnt.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://www.dxnt.com/v1/chat/completions",
    validateUrl: "https://www.dxnt.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free accounts are documented at 100 calls/day; the quota may increase through invitations and can vary by account.",
};
