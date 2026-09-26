import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { buildErrorBody } from "../utils/error.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

// TencentAIStudioWebExecutor — Tencent AI Studio (aistudio.tencent.ai)
// web-cookie provider.
//
// Routes chat requests through the consumer web session via cookie
// authentication. The upstream `/api/chat/{model}` endpoint speaks an
// OpenAI-compatible chat format, so the response is passed through unchanged
// (SSE for streaming, JSON otherwise). Port of OmniRoute PR #10174.
//
// Endpoint: POST https://aistudio.tencent.ai/api/chat/{model}
// Auth: full Cookie header from aistudio.tencent.ai (pasted as the credential).
// Plain chat only — tool/function calling is NOT supported.

const AISTUDIO_BASE = "https://aistudio.tencent.ai";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Exposed for tests: client model id → upstream endpoint model.
export const MODEL_MAP = {
  "hy3-g": "HunyuanDefault",
  "hunyuan-default": "HunyuanDefault",
  "hunyuan-3d": "Hunyuan3D",
};

// Strip a leading "Cookie:" prefix if present.
function normalizeCookie(raw) {
  const value = String(raw || "").trim();
  return value.startsWith("Cookie:") ? value.slice(7).trim() : value;
}

function errorResponse(status, message, code) {
  return new Response(
    JSON.stringify(buildErrorBody(status, message)),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

export class TencentAIStudioWebExecutor extends BaseExecutor {
  constructor() {
    super("tencent-aistudio-web", PROVIDERS["tencent-aistudio-web"]);
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions }) {
    const cookie = normalizeCookie(credentials?.apiKey ?? "");
    if (!cookie) {
      return {
        response: errorResponse(
          401,
          "Tencent AI Studio Cookie is required. Log in to aistudio.tencent.ai and paste your Cookie header.",
          "missing_cookie"
        ),
        url: AISTUDIO_BASE,
        headers: {},
        transformedBody: body,
      };
    }

    const bodyObj = body || {};
    const messages = Array.isArray(bodyObj.messages) ? bodyObj.messages : [];
    const modelId = bodyObj.model || model || "hy3-g";
    const targetModel = MODEL_MAP[modelId] || "HunyuanDefault";

    const chatUrl = `${AISTUDIO_BASE}/api/chat/${targetModel}`;
    const reqBody = { model: targetModel, messages };
    const reqHeaders = {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: AISTUDIO_BASE,
      Referer: `${AISTUDIO_BASE}/`,
      "User-Agent": USER_AGENT,
      Accept: stream !== false ? "text/event-stream" : "application/json",
    };

    let upstream;
    try {
      upstream = await proxyAwareFetch(
        chatUrl,
        { method: "POST", headers: reqHeaders, body: JSON.stringify(reqBody), signal },
        proxyOptions
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log?.error?.("TENCENT-AISTUDIO", `Fetch failed: ${msg}`);
      if (err?.name === "AbortError") throw err;
      return {
        response: errorResponse(502, `Tencent AI Studio connection failed: ${msg}`, "FETCH_FAILED"),
        url: chatUrl,
        headers: reqHeaders,
        transformedBody: reqBody,
      };
    }

    if (!upstream.ok) {
      const status = upstream.status;
      let errMsg = `Tencent AI Studio returned HTTP ${status}`;
      const errText = await upstream.text().catch(() => "");
      if (status === 401 || status === 403) {
        errMsg = "Tencent AI Studio auth failed — your session cookie may be missing or expired. Re-paste your Cookie header.";
      } else if (status === 429) {
        errMsg = "Tencent AI Studio rate limited. Wait a moment and retry.";
      } else if (errText) {
        errMsg = `Tencent AI Studio error: ${errText.slice(0, 300)}`;
      }
      log?.warn?.("TENCENT-AISTUDIO", errMsg);
      return {
        response: errorResponse(status, errMsg, `HTTP_${status}`),
        url: chatUrl,
        headers: reqHeaders,
        transformedBody: reqBody,
      };
    }

    return { response: upstream, url: chatUrl, headers: reqHeaders, transformedBody: reqBody };
  }
}

export default TencentAIStudioWebExecutor;
