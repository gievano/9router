// IBM watsonx.ai — model gateway exposing OpenAI-compatible /chat/completions
// under /ml/gateway/v1. Base URL is regional; the registry ships the us-south
// gateway as a working default and users can override per region.
export default {
  id: "watsonx",
  priority: 40,
  alias: "watsonx",
  display: {
    name: "IBM watsonx.ai",
    icon: "hub",
    color: "#0F62FE",
    textIcon: "WX",
    website: "https://www.ibm.com/products/watsonx-ai",
    notice: {
      apiKeyUrl: "https://dataplatform.cloud.ibm.com/iam/apikeys",
      text: "watsonx model gateway is OpenAI-compatible under /ml/gateway/v1. Base URL is regional — override with your region's gateway (e.g. https://us-south.ml.cloud.ibm.com/ml/gateway/v1) via a custom baseUrl connection.",
    },
  },
  category: "apikey",
  authType: "apikey",
  hasProviderSpecificData: true,
  transport: {
    baseUrl: "https://us-south.ml.cloud.ibm.com/ml/gateway/v1/chat/completions",
    validateUrl: "https://us-south.ml.cloud.ibm.com/ml/gateway/v1/models",
  },
  models: [
    { id: "ibm/granite-3-8b-instruct", name: "Granite 3 8B Instruct" },
    { id: "meta-llama/llama-3-3-70b-instruct", name: "Llama 3.3 70B Instruct" },
  ],
  serviceKinds: ["llm"],
  passthroughModels: true,
};
