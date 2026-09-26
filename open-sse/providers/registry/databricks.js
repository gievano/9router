// Databricks — Mosaic AI Model Serving endpoints on Databricks workspaces.
//
// The base URL is per-workspace (https://<workspace>.cloud.databricks.com/
// serving-endpoints/...). The registry ships a placeholder; users must paste
// their workspace serving-endpoint URL via the connection's providerSpecificData
// baseUrl override (openai-compatible custom node) for real traffic.

export default {
  id: "databricks",
  priority: 50,
  alias: "databricks",
  display: {
    name: "Databricks",
    icon: "table_chart",
    color: "#F97316",
    textIcon: "DB",
    website: "https://www.databricks.com",
    notice: {
      apiKeyUrl: "https://accounts.cloud.databricks.com/oidc/token",
      text: "Databricks Mosaic AI Model Serving. Base URL is your workspace serving-endpoint (https://<workspace>.cloud.databricks.com/serving-endpoints/...). For self-hosted workspaces, add the endpoint URL via a custom baseUrl connection.",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://adb-0000000000000000.0.azuredatabricks.net/serving-endpoints",
    validateUrl: "https://adb-0000000000000000.0.azuredatabricks.net/serving-endpoints",
  },
  models: [
    { id: "databricks-gpt-5", name: "Databricks GPT-5" },
    { id: "databricks-meta-llama-3-3-70b-instruct", name: "Llama 3.3 70B Instruct" },
    { id: "databricks-claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "databricks-gemini-2-5-pro", name: "Gemini 2.5 Pro" },
  ],
};
