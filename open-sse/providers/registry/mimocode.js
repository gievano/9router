// Mimocode — Xiaomi MiMo free OpenAI-compatible gateway (api.xiaomimimo.com),
// no-auth. The executor bootstraps a JWT from a device fingerprint
// (POST /api/free-ai/bootstrap) and sends chat to the custom
// /api/free-ai/openai/chat endpoint. Only `mimo-auto` is supported
// (1M context, 128K output). Port of OmniRoute mimocode (simplified to a
// single JWT cache + re-bootstrap on 401/403).
export default {
  id: "mimocode",
  priority: 60,
  alias: "mcode",
  uiAlias: "mcode",
  display: {
    name: "MiMoCode (Free)",
    icon: "smart_toy",
    color: "#FF6900",
    textIcon: "MC",
    website: "https://github.com/XiaomiMiMo/MiMo-Code",
    notice: {
      text: "Free Xiaomi MiMo models via bootstrap JWT auth — no API key required. Supports the `mimo-auto` model (1M context, 128K output) with streaming.",
    },
  },
  category: "free",
  noAuth: true,
  hasFree: true,
  transport: {
    baseUrl: "https://api.xiaomimimo.com",
    format: "openai",
    noAuth: true,
  },
  models: [
    { id: "mimo-auto", name: "MiMo Auto", contextLength: 1000000, maxOutput: 131072 },
  ],
  passthroughModels: true,
};
