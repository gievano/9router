import { PROVIDER_MODELS } from "@/shared/constants/models";
import { resolveModelDisplayName } from "@/shared/utils/modelDisplayName";

export const dynamic = "force-dynamic";

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

/**
 * GET /v1beta/models - Gemini compatible models list
 * Returns models in Gemini API format
 */
export async function GET() {
  try {
    const models = [];
    const seen = new Set();

    function addModel({ name, displayName, description, methods = ["generateContent"] }) {
      if (seen.has(name)) return;
      seen.add(name);
      models.push({
        name,
        displayName,
        description,
        supportedGenerationMethods: methods,
        inputTokenLimit: 128000,
        outputTokenLimit: 8192,
      });
    }
    
    for (const [provider, providerModels] of Object.entries(PROVIDER_MODELS)) {
      for (const model of providerModels) {
        // Registry names are authoritative; ids the registry does not name (and
        // that clients would otherwise render as a slug) get a readable name.
        const displayName = resolveModelDisplayName(model.id, model.name);
        addModel({
          name: `models/${provider}/${model.id}`,
          displayName,
          description: `${provider} model: ${displayName}`,
        });

        if (provider === "gemini") {
          addModel({
            name: `models/${model.id}`,
            displayName,
            description: `Gemini model: ${displayName}`,
            methods: ["generateContent", "streamGenerateContent"],
          });
        }
      }
    }

    return Response.json({ models });
  } catch (error) {
    console.log("Error fetching models:", error);
    return Response.json({ error: { message: error.message } }, { status: 500 });
  }
}
