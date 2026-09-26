// SAP Generative AI Hub (SAP AI Core) — OpenAI-compatible chat via the
// deploymentUrl; requests require an AI-Resource-Group header. Base URL is
// per-deployment, so the registry ships an empty baseUrl (custom-node flow).
export default {
  id: "sap",
  priority: 40,
  alias: "sap",
  display: {
    name: "SAP Generative AI Hub",
    icon: "business",
    color: "#0FAAFF",
    textIcon: "SAP",
    website: "https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/generative-ai-hub-in-sap-ai-core",
    notice: {
      apiKeyUrl: "https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-api-credentials-for-ai-core",
      text: "Chat requests use the deploymentUrl from Generative AI Hub and require an AI-Resource-Group header. Add the deployment endpoint via a custom baseUrl connection (OpenAI-compatible).",
    },
  },
  category: "apikey",
  authType: "apikey",
  hasProviderSpecificData: true,
  transport: {
    baseUrl: "",
    validateUrl: "",
  },
  passthroughModels: true,
};
