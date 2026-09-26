// Azure AI Foundry — OpenAI-compatible endpoint, but the base URL is per
// resource (https://<resource>.services.ai.azure.com/openai/v1). Users must
// supply their own resource endpoint; the registry ships a placeholder.
export default {
  id: "azure-ai",
  priority: 40,
  alias: "azure-ai",
  display: {
    name: "Azure AI Foundry",
    icon: "cloud",
    color: "#2563EB",
    textIcon: "AF",
    website: "https://learn.microsoft.com/azure/ai-foundry",
    notice: {
      apiKeyUrl: "https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI",
      text: "Azure AI Foundry uses the OpenAI v1 surface with deployment names as models. Base URL is per resource — e.g. https://<resource>.services.ai.azure.com/openai/v1. Add the resource endpoint via a custom baseUrl connection.",
    },
  },
  category: "apikey",
  authType: "apikey",
  hasProviderSpecificData: true,
  transport: {
    baseUrl: "https://example-resource.services.ai.azure.com/openai/v1/chat/completions",
    validateUrl: "https://example-resource.services.ai.azure.com/openai/v1/models",
  },
  passthroughModels: true,
};
