import { DefaultExecutor } from "./default.js";

/**
 * GLM effort tiers (glm-5.3-high / glm-5.3-low) are OmniRoute-style aliases:
 * upstream advertises ONE model id (`glm-5.3`) and effort is a request
 * parameter (`reasoning_effort`: low|high|max, default max) on the coding
 * chat/completions endpoint. The tier aliases live in the registry
 * (upstreamModelId already rewrites the wire model to the base id); this
 * executor pins the effort selector and forces thinking on — GLM-5.3 rejects
 * thinking.type "disabled", and an effort tier without thinking would
 * silently drop the selector upstream.
 *
 * https://docs.z.ai/devpack/latest-model
 * https://z.ai/blog/glm-5.3
 */
export function parseGlmEffortTier(model) {
  switch (model) {
    case "glm-5.3-high":
      return { baseModel: "glm-5.3", effort: "high" };
    case "glm-5.3-low":
      return { baseModel: "glm-5.3", effort: "low" };
    default:
      return null;
  }
}

export class GlmExecutor extends DefaultExecutor {
  constructor(provider) {
    super(provider);
  }

  transformRequest(model, body, stream, credentials) {
    const tier = parseGlmEffortTier(model);
    const transformed = super.transformRequest(model, body, stream, credentials);

    if (transformed && typeof transformed === "object" && tier) {
      // Wire model is already the base id (registry upstreamModelId), but set
      // it unconditionally so callers that bypass chatCore's upstream
      // resolution still never send a tier alias upstream.
      transformed.model = tier.baseModel;

      const existingThinking = transformed.thinking && typeof transformed.thinking === "object"
        ? transformed.thinking
        : {};
      transformed.thinking = { ...existingThinking, type: "enabled" };

      // OpenAI coding endpoint: documented reasoning_effort param. On the
      // Anthropic-compatible endpoint (e.g. Claude Code clients) the same
      // transport z.ai maps Claude Code effort selectors from — best-effort
      // mirror of the GLM-5.2 tier pattern there.
      const format = credentials?.runtimeTransport?.format || this.config.format;
      if (format === "claude") {
        transformed.effort = tier.effort;
        delete transformed.reasoning_effort;
      } else {
        transformed.reasoning_effort = tier.effort;
      }
    }

    return transformed;
  }
}

export default GlmExecutor;
