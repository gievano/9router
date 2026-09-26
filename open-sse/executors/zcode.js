import { GlmExecutor } from "./glm.js";

// Statuses that mean "this endpoint leg rejects the credential/request shape"
// rather than "the provider is down". ZcodeExecutor advances to the next leg
// (zcode-plan → bigmodel → api.z.ai) on these, mirroring the Kiro
// gateway-first override. 400 stays terminal (malformed request), 429/5xx keep
// base behavior.
const ZCODE_ENDPOINT_FALLBACK_STATUSES = [401, 403, 404];

/**
 * ZCode executor — GLM effort tiers (inherited) + endpoint-leg fallback.
 *
 * The zcode-plan leg (zcode.z.ai/api/v1/zcode-plan/anthropic) is the Start
 * Plan runtime surface; the ZCode app additionally signs its requests with a
 * client-signing handshake (X-Client-Sig / X-Client-Pow). A router request
 * without that signature can be rejected with an auth-shaped status even when
 * the derived coding key is valid on the other legs — so 401/403/404 on any
 * leg but the last advances to the next endpoint instead of hard-stopping.
 */
export class ZcodeExecutor extends GlmExecutor {
  constructor(provider = "zcode") {
    super(provider);
  }

  /**
   * Per-leg credential selection. The legs authenticate against different
   * account surfaces:
   *   - leg 0 (zcode-plan): the Start Plan session JWT (connection.apiKey —
   *     the exact credential the ZCode app stores as options.apiKey), sent
   *     unsigned exactly like the app does.
   *   - legs 1-2 (bigmodel / api.z.ai coding plans): the derived coding-plan
   *     key ("id.secret", providerSpecificData.codingApiKey). OAuth users
   *     without coding-plan entitlement have no valid credential here — the
   *     auth-error fallback moves on / surfaces the upstream billing error.
   *
   * Header shape mirrors ZCode's AI-SDK client (het + Fvo in the app bundle):
   * the credential goes out TWICE — x-api-key (SDK default) AND
   * Authorization: Bearer (Fvo wrapper prepends it for anthropic-kind
   * providers). The zcode-plan leg validates the Bearer header; a request
   * carrying only x-api-key is rejected 401.
   */
  buildHeaders(credentials, stream = true, model = null, opencodeIdentity = null, urlIndex = 0) {
    const codingApiKey = credentials?.providerSpecificData?.codingApiKey;
    const effective = urlIndex >= 1 && codingApiKey
      ? { ...credentials, apiKey: codingApiKey }
      : credentials;
    const headers = super.buildHeaders(effective, stream, model, opencodeIdentity);
    const token = headers["x-api-key"];
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Multi-leg URL resolution. DefaultExecutor.buildUrl (inherited through
   * GlmExecutor) resolves only config.baseUrl — it predates baseUrls chains,
   * which only BaseExecutor.buildUrl (Kiro) walks. Without this override the
   * retry loop would re-request leg 0 on every urlIndex.
   */
  buildUrl(model, stream, urlIndex = 0, credentials = null) {
    const baseUrls = this.getBaseUrls();
    const leg = baseUrls[urlIndex] || baseUrls[0];
    if (leg) return leg;
    return super.buildUrl(model, stream, urlIndex, credentials);
  }

  async execute(args) {
    // Store credentials for content-aware fallback decisions + error context.
    this._lastCredentials = args?.credentials || {};
    this._startPlanCaptchaBlocked = false;
    return super.execute(args);
  }

  shouldRetry(status, urlIndex) {
    if (ZCODE_ENDPOINT_FALLBACK_STATUSES.includes(status)) {
      return urlIndex + 1 < this.getFallbackCount();
    }
    if (status === 400 && urlIndex === 0) {
      // Captcha wall on the start-plan leg: leg 0's 400s are the Aliyun
      // attestation (code 3007), never a client-body problem the coding legs
      // would share. Fall through ONLY when the connection carries a coding
      // key that can actually serve legs 1-2; Start-Plan-only connections get
      // the terminal, actionable parseError message instead.
      if (urlIndex + 1 < this.getFallbackCount() && this._lastCredentials?.providerSpecificData?.codingApiKey) {
        this._startPlanCaptchaBlocked = true;
        return true;
      }
      return false;
    }
    return super.shouldRetry(status, urlIndex);
  }

  /**
   * Captcha-aware error surfacing. The zcode-plan (Start Plan) leg is
   * protected by Aliyun captcha attestation: the ZCode desktop app renders
   * the captcha widget, and the engine attaches the resulting
   * X-Aliyun-Captcha-Verify-Param as a runtime header before each model
   * request (reason "model-request" / "captcha-retry" — verified in the app
   * bundle). A router cannot mint that token, so HTTP 400 code 3007
   * ("captcha verify failed") on this leg is terminal by design. Rewrite it
   * into an actionable message instead of leaking the raw upstream body.
   */
  parseError(response, bodyText) {
    const base = { status: response.status, message: bodyText || `HTTP ${response.status}` };
    const CAPTCHA_NOTE =
      " (Note: the ZCode Start Plan endpoint was skipped — it requires Aliyun captcha attestation only the ZCode desktop app provides, so Start Plan quota cannot be routed through a gateway. Route access needs a GLM Coding Plan key with an active plan.)";
    if (this._startPlanCaptchaBlocked) {
      return { ...base, message: `${base.message}${CAPTCHA_NOTE}` };
    }
    if (response.status !== 400) return base;
    try {
      const parsed = JSON.parse(bodyText);
      const msg = String(parsed?.msg || "");
      if (parsed?.code === 3007 || /captcha/i.test(msg)) {
        return {
          status: response.status,
          message:
            "ZCode Start Plan endpoint requires Aliyun captcha attestation that only the ZCode desktop app can provide (it solves the captcha and attaches X-Aliyun-Captcha-Verify-Param). " +
            "Start Plan quota cannot be routed through a gateway — use a GLM Coding Plan key (id.secret from api.z.ai or open.bigmodel.cn) for ExtremeRouter access.",
        };
      }
    } catch { /* non-JSON body — return as-is */ }
    return base;
  }
}

export default ZcodeExecutor;
