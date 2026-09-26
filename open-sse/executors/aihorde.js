import { DefaultExecutor } from "./default.js";
import { PROVIDERS } from "../config/providers.js";

// AI Horde — OpenAI-compatible facade at oai.aihorde.net, reached keylessly:
// `0000000000` is AI Horde's documented anonymous key. A real account key
// (higher queue priority via kudos) still works and wins when present.
const ANONYMOUS_KEY = "0000000000";

export class AihordeExecutor extends DefaultExecutor {
  constructor(provider = "aihorde") {
    super(provider, PROVIDERS[provider] || PROVIDERS.openai);
  }

  async execute(input) {
    const credentials = input.credentials || {};
    if (!credentials.apiKey && !credentials.accessToken) {
      credentials.apiKey = ANONYMOUS_KEY;
    }
    return super.execute(input);
  }
}

export default AihordeExecutor;
