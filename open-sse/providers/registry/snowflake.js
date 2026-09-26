// Snowflake Cortex — OpenAI-compatible Chat Completions at
// /api/v2/cortex/inference:complete. The base URL is per-account
// (https://<org>-<account>.snowflakecomputing.com); the registry ships a
// placeholder and users add their account via a custom baseUrl connection.
export default {
  id: "snowflake",
  priority: 40,
  alias: "snowflake",
  display: {
    name: "Snowflake Cortex",
    icon: "ac_unit",
    color: "#29B5E8",
    textIcon: "SF",
    website: "https://www.snowflake.com",
    notice: {
      apiKeyUrl: "https://app.snowflake.com",
      text: "Cortex inference is OpenAI-compatible at https://<org>-<account>.snowflakecomputing.com/api/v2/cortex/inference:complete. Add your account endpoint via a custom baseUrl connection.",
    },
  },
  category: "apikey",
  authType: "apikey",
  hasProviderSpecificData: true,
  transport: {
    baseUrl: "https://example-org-example-account.snowflakecomputing.com/api/v2/cortex/inference:complete",
    validateUrl: "https://example-org-example-account.snowflakecomputing.com/api/v2/cortex/inference:complete",
  },
  models: [
    { id: "llama3.1-70b", name: "Llama 3.1 70B" },
    { id: "llama3.3-70b", name: "Llama 3.3 70B" },
    { id: "deepseek-r1", name: "DeepSeek R1" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
  ],
  serviceKinds: ["llm"],
  passthroughModels: true,
};
