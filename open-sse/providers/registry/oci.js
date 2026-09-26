// OCI Generative AI — Oracle Cloud; OpenAI-compatible /openai/v1 surface.
// Base URL is regional; the registry ships the us-chicago-1 region as a
// working default and users can override per region.
export default {
  id: "oci",
  priority: 40,
  alias: "oci",
  display: {
    name: "OCI Generative AI",
    icon: "cloud",
    color: "#C74634",
    textIcon: "OCI",
    website: "https://www.oracle.com/artificial-intelligence/generative-ai",
    notice: {
      apiKeyUrl: "https://cloud.oracle.com/identity/domains/my-profile/api-keys",
      text: "OpenAI-compatible at https://inference.generativeai.<region>.oci.oraclecloud.com/openai/v1/. Override with your region via a custom baseUrl connection if needed.",
    },
  },
  category: "apikey",
  authType: "apikey",
  hasProviderSpecificData: true,
  transport: {
    baseUrl: "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/openai/v1/chat/completions",
    validateUrl: "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/openai/v1/models",
  },
  models: [
    { id: "meta.llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
    { id: "cohere.command-r-plus", name: "Command R+ (Cohere)" },
  ],
  serviceKinds: ["llm"],
  passthroughModels: true,
};
