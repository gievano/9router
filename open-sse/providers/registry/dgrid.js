// DGrid — free models router (api.dgrid.ai). 10 req/min, 100 req/day free
// tier; `dgridai/free` routes to whichever free model is available. Port of
// the OmniRoute free-gateway batch.
export default {
  id: "dgrid",
  priority: 60,
  alias: "dgrid",
  display: {
    name: "DGrid Free",
    icon: "grid_view",
    color: "#8B5CF6",
    textIcon: "DG",
    website: "https://dgrid.ai",
    notice: {
      apiKeyUrl: "https://dgrid.ai",
      text: "Free models router — `dgridai/free` auto-routes to available free models. Free tier: 10 requests/min and 100 requests/day.",
    },
  },
  category: "apikey",
  authType: "apikey",
  authHint: "Create an API key at dgrid.ai. Free tier limited to 10 rpm / 100 rpd.",
  hasFree: true,
  transport: {
    baseUrl: "https://api.dgrid.ai/v1/chat/completions",
    format: "openai",
  },
  models: [{ id: "dgridai/free", name: "DGrid Free Models Router" }],
  passthroughModels: true,
};
