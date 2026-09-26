import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getProviderNodeById } from "@/models";
import { isOpenAICompatibleProvider, isAnthropicCompatibleProvider, isCustomEmbeddingProvider, AI_PROVIDERS } from "@/shared/constants/providers";
import { getDefaultModel } from "open-sse/config/providerModels.js";
import { resolveOllamaLocalHost, resolveXiaomiTokenplanBaseUrl, PROVIDERS } from "open-sse/config/providers.js";
import { openaiToCommandCodeRequest } from "open-sse/translator/request/openai-to-commandcode.js";
import { resolveQoderCredentials, resolveQoderModels } from "open-sse/services/qoderModels.js";
import { extractZaiToken } from "open-sse/services/zaiWebCredentials.js";
import { normalizeProviderId } from "@/lib/providerNormalization";

// Probe a webSearch/webFetch provider using its searchConfig/fetchConfig.
// Returns true if API key is accepted (status !== 401 && !== 403).
async function probeWebProvider(provider, apiKey) {
  const p = AI_PROVIDERS[provider];
  if (!p) return null;
  // Skip if provider has dual-purpose (LLM + search), let LLM validate handle it
  const kinds = p.serviceKinds || ["llm"];
  const isWebOnly = kinds.every((k) => k === "webSearch" || k === "webFetch");
  if (!isWebOnly) return null;
  const cfg = p.searchConfig || p.fetchConfig;
  if (!cfg) return null;
  if (cfg.authType === "none") return true; // no-auth (e.g. searxng)

  let url = cfg.baseUrl;
  const headers = { "Content-Type": "application/json" };
  let body;

  // Apply auth based on authHeader
  switch (cfg.authHeader) {
    case "bearer":              headers["Authorization"] = `Bearer ${apiKey}`; break;
    case "x-api-key":           headers["x-api-key"] = apiKey; break;
    case "x-subscription-token":headers["x-subscription-token"] = apiKey; break;
    case "key":                 url += `?key=${encodeURIComponent(apiKey)}&q=ping&cx=test`; break; // google-pse
    case "api_key":             url += `?api_key=${encodeURIComponent(apiKey)}&q=ping&engine=google`; break; // searchapi
  }

  // Minimal body for POST endpoints; GET sends nothing
  if (cfg.method === "POST") {
    body = JSON.stringify({ query: "ping", q: "ping", url: "https://example.com" });
  }

  const res = await fetch(url, { method: cfg.method, headers, body, signal: AbortSignal.timeout(8000) });
  return res.status !== 401 && res.status !== 403;
}

// Probe a media provider (tts/embedding/stt/image/video) using *Config.
// Returns true if API key is accepted; null to skip (let default handler decide).
async function probeMediaProvider(provider, apiKey) {
  const p = AI_PROVIDERS[provider];
  if (!p) return null;
  const MEDIA_KINDS = new Set(["tts", "embedding", "stt", "image", "video", "music", "imageToText"]);
  const kinds = p.serviceKinds || ["llm"];
  const isMediaOnly = kinds.every((k) => MEDIA_KINDS.has(k));
  if (!isMediaOnly) return null;
  const cfg = p.ttsConfig || p.sttConfig || p.embeddingConfig || p.imageConfig || p.videoConfig || p.musicConfig;
  // No probe config → best-effort accept (validate at usage time)
  if (!cfg) return true;
  if (p.noAuth || cfg.authType === "none") return true;
  // Skip auth schemes that need provider-specific data
  if (cfg.authHeader === "playht" || cfg.authHeader === "aws-sigv4") return true;

  const headers = { "Content-Type": "application/json", ...(cfg.extraHeaders || {}) };

  switch (cfg.authHeader) {
    case "bearer":      headers["Authorization"] = `Bearer ${apiKey}`; break;
    case "key":         headers["Authorization"] = `Key ${apiKey}`; break;
    case "x-api-key":   headers["x-api-key"] = apiKey; break;
    case "x-key":       headers["x-key"] = apiKey; break;
    case "xi-api-key":  headers["xi-api-key"] = apiKey; break;
    case "token":       headers["Authorization"] = `Token ${apiKey}`; break;
    case "basic":       headers["Authorization"] = `Basic ${apiKey}`; break;
    case "x-gladia-key": headers["x-gladia-key"] = apiKey; break;
    default: return null;
  }

  const method = cfg.method || "POST";
  const res = await fetch(cfg.baseUrl, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify({ input: "ping", text: "ping", prompt: "ping", model: getDefaultModel(provider) || "test" }),
    signal: AbortSignal.timeout(8000),
  });
  return res.status !== 401 && res.status !== 403;
}

// POST /api/providers/validate - Validate API key with provider
export async function POST(request) {
  try {
    const body = await request.json();
    const provider = normalizeProviderId(body.provider);
    const { apiKey, providerSpecificData } = body;

    const isNoAuth = AI_PROVIDERS[provider]?.noAuth === true;
    if (!provider || (!apiKey && provider !== "ollama-local" && !isNoAuth)) {
      return NextResponse.json({ error: "Provider and API key required" }, { status: 400 });
    }

    let isValid = false;
    let error = null;

    // Validate with each provider
    try {
      if (isOpenAICompatibleProvider(provider)) {
        const node = await getProviderNodeById(provider);
        if (!node) {
          return NextResponse.json({ error: "OpenAI Compatible node not found" }, { status: 404 });
        }
        const modelsUrl = `${node.baseUrl?.replace(/\/$/, "")}/models`;
        const res = await fetch(modelsUrl, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        isValid = res.ok;
        return NextResponse.json({
          valid: isValid,
          error: isValid ? null : "Invalid API key",
        });
      }

      // Custom Embedding nodes: probe /models (most embedding APIs are OpenAI-compatible)
      if (isCustomEmbeddingProvider(provider)) {
        const node = await getProviderNodeById(provider);
        if (!node) {
          return NextResponse.json({ error: "Custom Embedding node not found" }, { status: 404 });
        }
        const baseUrl = node.baseUrl?.replace(/\/$/, "");
        const modelsRes = await fetch(`${baseUrl}/models`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        if (modelsRes.ok) {
          return NextResponse.json({ valid: true });
        }
        // Auth errors are definitive
        if (modelsRes.status === 401 || modelsRes.status === 403) {
          return NextResponse.json({ valid: false, error: "Invalid API key" });
        }
        // Fallback: probe /embeddings with a common test model — many providers lack /models
        const embedRes = await fetch(`${baseUrl}/embeddings`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "test", input: "ping" }),
        });
        // 401/403 = bad key; anything else (including 400 "model not found") means key works
        isValid = embedRes.status !== 401 && embedRes.status !== 403;
        return NextResponse.json({
          valid: isValid,
          error: isValid ? null : "Invalid API key",
        });
      }

      if (isAnthropicCompatibleProvider(provider)) {
        const node = await getProviderNodeById(provider);
        if (!node) {
          return NextResponse.json({ error: "Anthropic Compatible node not found" }, { status: 404 });
        }

        let normalizedBase = node.baseUrl?.trim().replace(/\/$/, "") || "";
        if (normalizedBase.endsWith("/messages")) {
          normalizedBase = normalizedBase.slice(0, -9); // remove /messages
        }

        const messagesUrl = `${normalizedBase}/v1/messages`;
        const model = node.defaultModel || "claude-3-haiku-20240307";

        const res = await fetch(messagesUrl, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: "user", content: "test" }],
          }),
        });

        // 400/529 still confirms key accepted; only 401/403 = bad key
        isValid = res.status !== 401 && res.status !== 403;
        return NextResponse.json({
          valid: isValid,
          error: isValid ? null : "Invalid API key",
        });
      }

      if (provider === "cloudflare-ai") {
        const { providerSpecificData } = body;
        const accountId = providerSpecificData?.accountId;
        if (!accountId) {
          return NextResponse.json({ valid: false, error: "Missing Account ID" });
        }
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
        const cfRes = await fetch(url, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: getDefaultModel("cloudflare-ai"),
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1,
          }),
        });
        isValid = cfRes.status !== 401 && cfRes.status !== 403 && cfRes.status !== 404;
        return NextResponse.json({
          valid: isValid,
          error: isValid ? null : "Invalid API token or Account ID",
        });
      }

      if (provider === "azure") {
        const { providerSpecificData } = body;
        const endpoint = (providerSpecificData?.azureEndpoint || "").replace(/\/$/, "");
        const deployment = providerSpecificData?.deployment || "gpt-4";
        const apiVersion = providerSpecificData?.apiVersion || "2024-10-01-preview";
        const organization = providerSpecificData?.organization;

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        const headers = {
          "api-key": apiKey,
          "Content-Type": "application/json",
        };
        if (organization) headers["OpenAI-Organization"] = organization;

        const azureRes = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1,
          }),
        });
        isValid = azureRes.status !== 401 && azureRes.status !== 403;
        return NextResponse.json({
          valid: isValid,
          error: isValid ? null : "Invalid API key or Azure configuration",
        });
      }

      // Generic probe for webSearch/webFetch providers (config-driven)
      const webResult = await probeWebProvider(provider, apiKey);
      if (webResult !== null) {
        return NextResponse.json({
          valid: webResult,
          error: webResult ? null : "Invalid API key",
        });
      }

      // Generic probe for tts/embedding providers (config-driven)
      const mediaResult = await probeMediaProvider(provider, apiKey);
      if (mediaResult !== null) {
        return NextResponse.json({
          valid: mediaResult,
          error: mediaResult ? null : "Invalid API key",
        });
      }

      switch (provider) {
        case "openai":
          const openaiRes = await fetch("https://api.openai.com/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` },
          });
          isValid = openaiRes.ok;
          break;

        case "vercel-ai-gateway":
          const vercelAiGatewayRes = await fetch("https://ai-gateway.vercel.sh/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` },
          });
          isValid = vercelAiGatewayRes.ok;
          break;

        case "anthropic":
          const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-3-haiku-20240307",
              max_tokens: 1,
              messages: [{ role: "user", content: "test" }],
            }),
          });
          isValid = anthropicRes.status !== 401;
          break;

        case "gemini":
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
          isValid = geminiRes.ok;
          break;

        case "openrouter":
          const openrouterRes = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` },
          });
          isValid = openrouterRes.ok;
          break;

        case "tokenharbor":
          const tokenharborRes = await fetch("https://tokenharbor.ai/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` },
          });
          isValid = tokenharborRes.status !== 401 && tokenharborRes.status !== 403;
          break;

        case "qoder":
        case "qoder-cn": {
          // PAT (pt-...) needs the job-token exchange before it can sign
          // anything — the generic OpenAI-compat probe below can't validate it.
          try {
            const resolved = await resolveQoderCredentials({ provider, apiKey, providerSpecificData }, null, AbortSignal.timeout(8000));
            const result = await resolveQoderModels(resolved, { forceRefresh: true });
            isValid = !!result?.models?.length;
          } catch (err) {
            isValid = false;
            error = err.message;
          }
          break;
        }

        case "glm":
        case "glm-cn":
        case "zcode":
        case "kimi":
        case "minimax":
        case "minimax-cn":
        case "alicode-intl":
        case "alicode":
        case "alims-intl":
        case "alitp-intl":
        case "agentrouter": {
          // Use baseUrl from PROVIDERS (DRY); separate openai-format vs claude-format flow
          const cfg = PROVIDERS[provider];
          const isOpenAiFormat =
            provider === "glm-cn" ||
            provider === "alicode" ||
            provider === "alicode-intl" ||
            provider === "alims-intl" ||
            provider === "alitp-intl";

          if (isOpenAiFormat) {
            const testModel = getDefaultModel(provider);
            const res = await fetch(cfg.baseUrl, {
              method: "POST",
              headers: { "Authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
              body: JSON.stringify({ model: testModel, max_tokens: 1, messages: [{ role: "user", content: "test" }] }),
            });
            isValid = res.status !== 401 && res.status !== 403;
          } else {
            const testModel = getDefaultModel(provider) || "claude-sonnet-4-20250514";
            const res = await fetch(cfg.baseUrl, {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
                ...(cfg.headers || {}),
              },
              body: JSON.stringify({ model: testModel, max_tokens: 1, messages: [{ role: "user", content: "test" }] }),
            });
            // 400 = model resolution error but auth passed (e.g. agentrouter "no available channel")
            isValid = res.status !== 401 && res.status !== 403;
          }
          break;
        }
        case "volcengine-ark":
        case "byteplus": {
          const res = await fetch(PROVIDERS[provider]?.baseUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: getDefaultModel(provider),
              max_tokens: 1,
              messages: [{ role: "user", content: "test" }],
            }),
          });
          isValid = res.status !== 401 && res.status !== 403;
          break;
        }

        case "deepseek":
        case "groq":
        case "xai":
        case "mistral":
        case "perplexity":
        case "together":
        case "fireworks":
        case "cerebras":
        case "cohere":
        case "nebius":
        case "siliconflow":
        case "hyperbolic":
        case "ollama":
        case "ollama-local":
        case "assemblyai":
        case "nanobanana":
        case "chutes":
        case "xiaomi-mimo":
        case "xiaomi-tokenplan":
        case "nvidia": {
          const endpoints = {
            ...Object.fromEntries(
              Object.entries(PROVIDERS).filter(([, t]) => t.validateUrl).map(([id, t]) => [id, t.validateUrl])
            ),
            // dynamic URLs (depend on providerSpecificData) — kept inline
            "ollama-local": `${resolveOllamaLocalHost({ providerSpecificData })}/api/tags`,
            "xiaomi-tokenplan": `${resolveXiaomiTokenplanBaseUrl({ providerSpecificData })}/models`,
          };
          const headers = {};
          if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
          const res = await fetch(endpoints[provider], { headers, signal: AbortSignal.timeout(8000) });
          // xai returns 400 for bad key, 403 for valid-but-no-credit. Other providers use 401.
          if (provider === "xai") {
            isValid = res.status === 200 || res.status === 403;
          } else if (provider === "xiaomi-tokenplan") {
            // /models returns 403 for valid keys lacking list permission; only 401 means invalid
            isValid = res.status !== 401;
          } else {
            isValid = res.ok;
          }
          break;
        }

        case "marathon": {
          // Marathon (by GoKite AI) — adaptive inference infrastructure.
          // Validate via a minimal chat probe to the verified endpoint
          // (/v1/delayed/chat/completions). Uses completion_window:"now" for
          // an immediate synchronous response so validation is fast.
          const testModel = getDefaultModel("marathon") || "kimi-k3";
          const res = await fetch("https://delayed-inference.prod.gokite.ai/v1/delayed/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: testModel,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
              stream: false,
              completion_window: "now",
            }),
            signal: AbortSignal.timeout(15000),
          });
          // 200 = valid key + served synchronously. 202 = valid key, delayed job
          // accepted (still means the key is good). 401/403 = invalid key.
          isValid = res.status !== 401 && res.status !== 403;
          if (!isValid) error = "Marathon API key rejected — check your key at marathon.build";
          break;
        }

        case "opencode-go": {
          const res = await fetch("https://opencode.ai/zen/go/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: getDefaultModel("opencode-go"),
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
              stream: false,
            }),
          });
          isValid = res.status !== 401 && res.status !== 403;
          break;
        }

        case "commandcode": {
          const cfg = PROVIDERS.commandcode;
          const model = getDefaultModel("commandcode");
          const payload = openaiToCommandCodeRequest(model, {
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
            stream: false,
          }, false);
          const res = await fetch(cfg.baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(cfg.headers || {}),
              "x-session-id": crypto.randomUUID(),
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });
          isValid = res.status !== 401 && res.status !== 403;
          break;
        }

        case "deepgram": {
          const res = await fetch("https://api.deepgram.com/v1/projects", {
            headers: { "Authorization": `Token ${apiKey}` },
          });
          isValid = res.ok;
          break;
        }

        case "blackbox": {
          const res = await fetch("https://api.blackbox.ai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [{ role: "user", content: "test" }],
              max_tokens: 10,
            }),
          });
          // Returns 401 for invalid key, 200 for valid, 400 for malformed
          isValid = res.status === 200 || res.status === 400;
          break;
        }

        case "vertex":
        case "vertex-partner": {
          // Raw key: probe global endpoint (always 404 for unknown model, never 401)
          // SA JSON: attempt token mint via JWT assertion
          const saJson = (() => { try { const p = JSON.parse(apiKey); return p.type === "service_account" ? p : null; } catch { return null; } })();
          if (saJson) {
            // Validate SA JSON has required fields
            isValid = !!(saJson.client_email && saJson.private_key && saJson.project_id);
          } else {
            // Raw key: probe Vertex — 404 means key is valid (model just doesn't exist), 401 means invalid key
            const probeRes = await fetch(
              `https://aiplatform.googleapis.com/v1/publishers/google/models/__probe__:generateContent?key=${apiKey}`,
              { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
            );
            isValid = probeRes.status !== 401 && probeRes.status !== 403;
          }
          break;
        }

        case "grok-web": {
          const token = apiKey.startsWith("sso=") ? apiKey.slice(4) : apiKey;
          // Cloudflare-bypass: send POST with same browser fingerprint headers as GrokWebExecutor
          const randomHex = (n) => {
            const a = new Uint8Array(n);
            crypto.getRandomValues(a);
            return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
          };
          const statsigId = Buffer.from("e:TypeError: Cannot read properties of null (reading 'children')").toString("base64");
          const traceId = randomHex(16);
          const spanId = randomHex(8);
          const res = await fetch("https://grok.com/rest/app-chat/conversations/new", {
            method: "POST",
            headers: {
              Accept: "*/*",
              "Accept-Encoding": "gzip, deflate, br, zstd",
              "Accept-Language": "en-US,en;q=0.9",
              "Cache-Control": "no-cache",
              "Content-Type": "application/json",
              Cookie: `sso=${token}`,
              Origin: "https://grok.com",
              Pragma: "no-cache",
              Referer: "https://grok.com/",
              "Sec-Ch-Ua": '"Google Chrome";v="136", "Chromium";v="136", "Not(A:Brand";v="24"',
              "Sec-Ch-Ua-Mobile": "?0",
              "Sec-Ch-Ua-Platform": '"macOS"',
              "Sec-Fetch-Dest": "empty",
              "Sec-Fetch-Mode": "cors",
              "Sec-Fetch-Site": "same-origin",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              "x-statsig-id": statsigId,
              "x-xai-request-id": crypto.randomUUID(),
              traceparent: `00-${traceId}-${spanId}-00`,
            },
            body: JSON.stringify({
              temporary: true, modelName: "grok-4", modelMode: "MODEL_MODE_GROK_4", message: "ping",
              fileAttachments: [], imageAttachments: [],
              disableSearch: false, enableImageGeneration: false, returnImageBytes: false,
              returnRawGrokInXaiRequest: false, enableImageStreaming: false, imageGenerationCount: 0,
              forceConcise: false, toolOverrides: {}, enableSideBySide: true, sendFinalMetadata: true,
              isReasoning: false, disableTextFollowUps: true, disableMemory: true,
              forceSideBySide: false, isAsyncChat: false, disableSelfHarmShortCircuit: false,
            }),
          });
          // Cookie valid = any non-401/403 response (200, 400, 429 all mean cookie accepted)
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid SSO cookie — re-paste from grok.com DevTools → Cookies → sso";
          } else {
            isValid = true;
          }
          break;
        }

        case "zai-web": {
          // Z.ai web sessions validate against the authenticated user-settings
          // endpoint (GET /api/v1/users/user/settings) using the Local Storage
          // "token" as a token-only Bearer credential — no Cookie header. The
          // exact upstream status is preserved: 401 = invalid/expired session,
          // 403 = rejected (not labeled expired), 429/5xx = token accepted but
          // upstream busy (validation semantics audited in PR #10329).
          const token = extractZaiToken(apiKey);
          if (!token) {
            isValid = false;
            error = 'No Z.ai token found — copy the "token" value from chat.z.ai Local Storage.';
            break;
          }
          const settingsRes = await fetch("https://chat.z.ai/api/v1/users/user/settings", {
            method: "GET",
            headers: {
              Accept: "application/json, text/plain, */*",
              Authorization: `Bearer ${token}`,
              Origin: "https://chat.z.ai",
              Referer: "https://chat.z.ai/",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (settingsRes.status === 401) {
            isValid = false;
            error = 'Z.ai token invalid or expired — copy a fresh "token" value from chat.z.ai Local Storage.';
          } else if (settingsRes.status === 403) {
            isValid = false;
            error = "Z.ai rejected the token (HTTP 403) — the account may be restricted.";
          } else {
            // 2xx = valid session; 429/5xx = token accepted but upstream busy.
            isValid = true;
          }
          break;
        }

        case "perplexity-web": {
          let sessionToken = apiKey;
          if (sessionToken.startsWith("__Secure-next-auth.session-token=")) {
            sessionToken = sessionToken.slice("__Secure-next-auth.session-token=".length);
          }
          const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
          const res = await fetch("https://www.perplexity.ai/rest/sse/perplexity_ask", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              Origin: "https://www.perplexity.ai",
              Referer: "https://www.perplexity.ai/",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              "X-App-ApiClient": "default",
              "X-App-ApiVersion": "2.18",
              Cookie: `__Secure-next-auth.session-token=${sessionToken}`,
            },
            body: JSON.stringify({
              query_str: "ping",
              params: {
                query_str: "ping", search_focus: "internet", mode: "concise", model_preference: "pplx_pro",
                sources: ["web"], attachments: [],
                frontend_uuid: crypto.randomUUID(), frontend_context_uuid: crypto.randomUUID(),
                version: "2.18", language: "en-US", timezone: tz,
                search_recency_filter: null, is_incognito: true, use_schematized_api: true, last_backend_uuid: null,
              },
            }),
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid session cookie — re-paste __Secure-next-auth.session-token from perplexity.ai";
          } else {
            isValid = true;
          }
          break;
        }

        case "inxorastudio-web": {
          // Bearer JWT from labs.inxorastudio.com dashboard. Validate via
          // /api/auth/me which returns user data for valid tokens.
          let token = apiKey.replace(/^Bearer\s+/i, "").replace(/^cookie:\s*/i, "").trim();
          try {
            const res = await fetch("https://labs.inxorastudio.com/api/auth/me", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
                Referer: "https://labs.inxorastudio.com/dashboard",
              },
            });
            if (res.status === 401 || res.status === 403) {
              isValid = false;
              error = "Invalid or expired InxoraStudio JWT — re-copy from labs.inxorastudio.com DevTools (Authorization header).";
            } else if (!res.ok) {
              isValid = false;
              error = `InxoraStudio returned ${res.status}`;
            } else {
              const data = await res.json().catch(() => null);
              isValid = !!(data?.user?.id);
              if (!isValid) error = "Session accepted but no user data — token may be expired";
            }
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate InxoraStudio token";
          }
          break;
        }

        case "1min": {
          let token = apiKey.replace(/^Bearer\s+/i, "").replace(/^cookie:\s*/i, "").trim();
          try {
            // Prefer teamId from providerSpecificData (user-provided via auth modal).
            // Fall back to JWT payload uuid for backward compat (may be wrong for multi-team).
            let teamId = providerSpecificData?.teamId || null;
            if (!teamId) {
              const parts = token.split(".");
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
                teamId = payload?.uuid;
              }
            }
            if (!teamId) {
              isValid = false;
              error = "Team ID is required. Provide it via the auth modal or as providerSpecificData.teamId.";
              break;
            }
            const validateHeaders = {
              "x-auth-token": `Bearer ${token}`,
              "x-app-version": "1.2.3",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
              signal: AbortSignal.timeout(8000),
            };
            // Inject Cookie header if provided (Cloudflare bypass).
            const cookieStr = providerSpecificData?.cookies;
            if (cookieStr && typeof cookieStr === "string" && cookieStr.trim()) {
              validateHeaders["Cookie"] = cookieStr.trim().replace(/^cookie:\s*/i, "").trim();
            }
            const res = await fetch(`https://api.1min.ai/teams/${teamId}/credits`, {
              method: "GET",
              headers: validateHeaders,
            });
            if (res.status === 401 || res.status === 403) {
              isValid = false;
              error = "Invalid or expired 1min.ai token — re-copy from app.1min.ai DevTools (x-auth-token header).";
            } else if (!res.ok) {
              isValid = false;
              error = `1min.ai returned ${res.status}`;
            } else {
              isValid = true;
            }
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate 1min.ai token";
          }
          break;
        }

        case "agnes-web": {
          // JWT from app.agnes-ai.com cookie/token. Validate via profile endpoint.
          const agnesToken = (apiKey || "").replace(/^Bearer\s+/i, "").replace(/^token=\s*/i, "").trim();
          try {
            const res = await fetch("https://api.agnes-ai.com/api/v2/user/profile", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${agnesToken}`,
                "X-Platform": "1",
                "Content-Type": "application/json",
              },
              signal: AbortSignal.timeout(8000),
            });
            if (res.status === 401 || res.status === 403) {
              isValid = false;
              error = "Agnes token is invalid or expired — re-copy from app.agnes-ai.com.";
            } else if (!res.ok) {
              isValid = false;
              error = `Agnes returned ${res.status}`;
            } else {
              isValid = true;
            }
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate Agnes token";
          }
          break;
        }

        case "1min-api": {
          // API key from app.1min.ai → API dashboard. Custom `API-KEY` header.
          const key = (apiKey || "").replace(/^Bearer\s+/i, "").trim();
          try {
            const res = await fetch("https://api.1min.ai/api/profile", {
              method: "GET",
              headers: {
                "API-KEY": key,
                Accept: "application/json",
              },
              signal: AbortSignal.timeout(8000),
            });
            if (res.status === 401 || res.status === 403) {
              isValid = false;
              error = "1min.ai API: key rejected — check the key at app.1min.ai → API.";
            } else if (!res.ok) {
              isValid = false;
              error = `1min.ai API returned ${res.status}`;
            } else {
              // Verify the profile payload looks valid (has an id or email).
              const data = await res.json().catch(() => null);
              isValid = !!(data?.id || data?.email || data?.userId || data?.credits != null);
              if (!isValid) error = "1min.ai API: profile response missing account fields.";
            }
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate 1min.ai API key";
          }
          break;
        }

        case "deepseek-web": {
          // userToken from DeepSeek localStorage (JSON-wrapped {"value":"..."} or bare).
          let userToken = apiKey;
          try { const p = JSON.parse(apiKey); if (typeof p?.value === "string") userToken = p.value; } catch { /* bare */ }
          const res = await fetch("https://chat.deepseek.com/api/v0/users/current", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${userToken}`,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
              Origin: "https://chat.deepseek.com",
              Referer: "https://chat.deepseek.com/",
              "X-App-Version": "20241129.1",
              "X-Client-Platform": "web",
              "X-Client-Version": "1.8.0",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired userToken — re-copy from DeepSeek localStorage (chat.deepseek.com).";
          } else {
            isValid = true;
          }
          break;
        }

        case "qwen-web": {
          // Requires the FULL cookie jar from chat.qwen.ai (cna, ssxmod_itna, token=...).
          let token = apiKey;
          const tMatch = apiKey.match(/(?:^|;\s*)token=([^;\s]+)/);
          if (tMatch) token = tMatch[1];
          else if (apiKey.includes("=") || apiKey.includes(";")) token = ""; // cookies present but no token
          if (!token && (apiKey.includes("=") || apiKey.includes(";"))) {
            isValid = false;
            error = "No 'token' cookie found — copy the full Cookie header from chat.qwen.ai (must include token, cna, ssxmod_itna).";
            break;
          }
          const res = await fetch("https://chat.qwen.ai/api/v2/chats/new", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              Cookie: apiKey.startsWith("Cookie:") ? apiKey.slice(7).trim() : apiKey,
              "bx-v": "2.5.36",
              source: "web",
              version: "0.2.66",
              "x-request-id": crypto.randomUUID(),
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Origin: "https://chat.qwen.ai",
              Referer: "https://chat.qwen.ai/",
            },
            body: JSON.stringify({ title: "New Chat", models: ["qwen3.7-max"], chat_mode: "normal", chat_type: "t2t", timestamp: Date.now() }),
          });
          const ct = res.headers.get("content-type") || "";
          if (res.status === 401 || res.status === 403 || ct.includes("text/html")) {
            isValid = false;
            error = "Qwen WAF rejected the cookies — re-copy the FULL cookie string from chat.qwen.ai (cna, ssxmod_itna, token all required).";
          } else {
            isValid = true;
          }
          break;
        }

        case "kimi-web": {
          // kimi-auth JWT (bare eyJ..., or from kimi-auth= cookie pair).
          let jwt = apiKey.replace(/^Cookie:\s*/i, "").replace(/^bearer\s+/i, "");
          const m = jwt.match(/(?:^|[\s;])kimi-auth=([^;\s]+)/);
          if (m) jwt = m[1];
          const res = await fetch("https://www.kimi.com/api/auth/session", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${jwt}`,
              Cookie: `kimi-auth=${jwt}`,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Referer: "https://www.kimi.com/",
              Origin: "https://www.kimi.com",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired kimi-auth token — re-copy from www.kimi.com cookies.";
          } else {
            isValid = true;
          }
          break;
        }

        case "blackbox-web": {
          // next-auth.session-token cookie (bare value or full cookie string).
          let cookieHeader = apiKey.replace(/^Cookie:\s*/i, "");
          if (!cookieHeader.includes("=")) cookieHeader = `next-auth.session-token=${cookieHeader}`;
          const res = await fetch("https://app.blackbox.ai/api/auth/session", {
            method: "GET",
            headers: {
              Accept: "application/json",
              Cookie: cookieHeader,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            },
          });
          if (!res.ok) {
            isValid = false;
            error = "Invalid or expired session cookie — re-copy from app.blackbox.ai cookies.";
          } else {
            try {
              const data = await res.json();
              isValid = !!(data && data.user && data.user.email);
              if (!isValid) error = "Session cookie accepted but no user — cookie may be expired. Re-copy from app.blackbox.ai.";
            } catch {
              isValid = true;
            }
          }
          break;
        }

        case "t3-web": {
          // Cookie header incl. convex-session-id. Minimal chat probe.
          const res = await fetch("https://t3.chat/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: apiKey.replace(/^Cookie:\s*/i, ""),
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Referer: "https://t3.chat/",
              Origin: "https://t3.chat",
            },
            body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }], stream: false }),
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Session expired or unauthorized — re-paste your t3.chat cookies (must include convex-session-id).";
          } else {
            isValid = true;
          }
          break;
        }

        case "duckduckgo-web": {
          // Anonymous — validate reachability only (no user credential).
          const res = await fetch("https://duckduckgo.com/duckchat/v1/status", {
            method: "GET",
            headers: { "x-vqd-accept": "1", "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36" },
          });
          isValid = res.status !== 403 && res.status < 500;
          if (!isValid) error = "DuckDuckGo AI Chat is currently blocking requests — try again later.";
          break;
        }

        case "venice-web": {
          const cookie = apiKey.replace(/^Cookie:\s*/i, "");
          const res = await fetch("https://venice.ai/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Referer: "https://venice.ai/",
              Origin: "https://venice.ai",
            },
            body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "llama-3.1-405b", stream: false, max_tokens: 1 }),
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired venice.ai session cookie — re-copy from venice.ai cookies.";
          } else {
            isValid = true;
          }
          break;
        }

        case "tencent-aistudio-web": {
          const cookie = apiKey.replace(/^Cookie:\s*/i, "");
          const res = await fetch("https://aistudio.tencent.ai/api/chat/HunyuanDefault", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: "https://aistudio.tencent.ai/",
              Origin: "https://aistudio.tencent.ai",
            },
            body: JSON.stringify({ model: "HunyuanDefault", messages: [{ role: "user", content: "hi" }] }),
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired aistudio.tencent.ai session cookie — re-copy your Cookie header.";
          } else {
            isValid = true;
          }
          break;
        }

        case "doubao-web": {
          const cookie = apiKey.replace(/^Cookie:\s*/i, "");
          const res = await fetch("https://www.doubao.com/samantha/contact/list", {
            method: "GET",
            headers: {
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Referer: "https://www.doubao.com/",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired doubao.com session cookie — re-copy from doubao.com cookies.";
          } else {
            isValid = true;
          }
          break;
        }

        case "v0-vercel-web": {
          const cookie = apiKey.replace(/^Cookie:\s*/i, "");
          const res = await fetch("https://v0.dev/api/auth/session", {
            method: "GET",
            headers: {
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired v0.dev session cookie — re-copy from v0.dev cookies.";
          } else {
            isValid = true;
          }
          break;
        }

        case "poe-web": {
          // Poe sits behind Cloudflare — forward the full cookie jar (which carries
          // cf_clearance + poe-tchannel-channel) when the user pasted it; otherwise
          // fall back to a bare p-b header. p-b values may be URL-encoded (%3D → =).
          const rawCookie = apiKey.replace(/^Cookie:\s*/i, "");
          let cookieHeader;
          if (rawCookie.includes("p-b=") && rawCookie.includes(";")) {
            cookieHeader = rawCookie;
          } else {
            const pm = rawCookie.match(/p-b=([^;]+)/);
            let pb = pm ? pm[1] : rawCookie;
            try { pb = decodeURIComponent(pb); } catch { /* not encoded */ }
            cookieHeader = `p-b=${pb}`;
          }
          const res = await fetch("https://www.poe.com/api/gql_POST", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Cookie: cookieHeader,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Referer: "https://www.poe.com/",
              Origin: "https://www.poe.com",
            },
            body: JSON.stringify({
              operationName: "ChatViewQuery",
              query: "query ChatViewQuery { viewer { id } }",
              variables: {},
            }),
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired p-b cookie — re-copy the FULL cookie string from poe.com (must include cf_clearance + poe-tchannel).";
          } else {
            isValid = true;
          }
          break;
        }

        case "copilot-web": {
          // Microsoft access JWT (bare eyJ..., access_token=..., or Bearer ...).
          let token = apiKey.trim();
          const am = token.match(/access_token=([^;]+)/); if (am) token = am[1];
          const bm = token.match(/[Bb]earer\s+(.+)/); if (bm) token = bm[1].trim();
          const res = await fetch("https://copilot.microsoft.com/c/api/start", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : undefined,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
              Origin: "https://copilot.microsoft.com",
              Referer: "https://copilot.microsoft.com/",
            },
            body: JSON.stringify({ timeZone: "America/New_York", startNewConversation: true }),
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired Copilot access token — re-copy from copilot.microsoft.com.";
          } else {
            isValid = true;
          }
          break;
        }

        case "muse-spark-web": {
          // ecto_1_sess cookie (bare value or full cookie string).
          let cookie = apiKey.replace(/^Cookie:\s*/i, "").replace(/^bearer\s+/i, "");
          if (!cookie.includes("=")) cookie = `ecto_1_sess=${cookie}`;
          const res = await fetch("https://www.meta.ai/api/graphql/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Origin: "https://www.meta.ai",
              Referer: "https://www.meta.ai/",
            },
            body: JSON.stringify({ query: "{ viewer { id } }" }),
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired ecto_1_sess cookie — re-copy from meta.ai cookies.";
          } else {
            isValid = true;
          }
          break;
        }

        case "adapta-web": {
          // Clerk __client JWT (bare eyJ... or __client=... pair).
          let jwt = apiKey.trim();
          if (jwt.includes("=") && !jwt.startsWith("eyJ")) {
            jwt = jwt.slice(jwt.indexOf("=") + 1).trim();
          }
          const res = await fetch("https://clerk.agent.adapta.one/v1/client", {
            method: "GET",
            headers: {
              Cookie: `__client=${jwt}`,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Origin: "https://agent.adapta.one",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired __client cookie — re-copy from agent.adapta.one cookies.";
          } else {
            isValid = true;
          }
          break;
        }

        case "veoaifree-web": {
          // No auth — validate reachability (nonce scrape).
          const res = await fetch("https://veoaifree.com", {
            method: "GET",
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36" },
          });
          isValid = res.ok;
          if (!isValid) error = "veoaifree.com is unreachable or rate-limited.";
          break;
        }

        case "claude-web": {
          // sessionKey cookie (bare value or full cookie string).
          let cookie = apiKey.replace(/^cookie\s*:\s*/i, "");
          if (!/sessionKey\s*=/.test(cookie) && !cookie.includes("=")) cookie = `sessionKey=${cookie}`;
          const res = await fetch("https://claude.ai/api/organizations", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookie,
              "anthropic-client-platform": "web_claude_ai",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Origin: "https://claude.ai",
              Referer: "https://claude.ai/",
            },
          });
          if (res.status === 401) {
            isValid = false;
            error = "Invalid or expired sessionKey — re-copy from claude.ai cookies.";
          } else if (res.status === 403) {
            // Cloudflare block — cookie may still be valid; surface as ambiguous.
            isValid = true;
            error = "Note: Cloudflare blocked the probe (HTTP 403). Your cookie may still be valid — chat requests may also be blocked without TLS impersonation.";
          } else {
            isValid = true;
          }
          break;
        }

        case "chatgpt-web": {
          // __Secure-next-auth.session-token (bare value or full cookie string).
          let cookie = apiKey.replace(/^cookie\s*:\s*/i, "");
          if (!/__Secure-next-auth\.session-token\s*=/.test(cookie) && !cookie.includes("=")) {
            cookie = `__Secure-next-auth.session-token=${cookie}`;
          }
          const res = await fetch("https://chatgpt.com/api/auth/session", {
            method: "GET",
            headers: {
              Accept: "application/json",
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired session cookie — re-copy __Secure-next-auth.session-token from chatgpt.com cookies.";
          } else if (res.ok) {
            try {
              const data = await res.json();
              isValid = !!(data && data.accessToken);
              if (!isValid) error = "Session cookie accepted but no accessToken returned — cookie likely expired. Re-copy from chatgpt.com.";
            } catch {
              isValid = true;
            }
          } else {
            isValid = true;
          }
          break;
        }

        case "gemini-web": {
          // Requires __Secure-1PSID AND __Secure-1PSIDTS cookies.
          if (!/__Secure-1PSID\s*=/.test(apiKey) || !/__Secure-1PSIDTS\s*=/.test(apiKey)) {
            isValid = false;
            error = "Missing required Google cookies — copy the FULL cookie string from gemini.google.com (must include __Secure-1PSID and __Secure-1PSIDTS).";
            break;
          }
          const cookie = apiKey.replace(/^cookie\s*:\s*/i, "");
          const res = await fetch("https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
              Accept: "*/*",
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              Origin: "https://gemini.google.com",
              Referer: "https://gemini.google.com/app/",
            },
            body: new URLSearchParams({ "f.req": JSON.stringify([null, "[\"hi\"]"]), at: "" }).toString(),
          });
          if (res.status === 401) {
            isValid = false;
            error = "Invalid Google cookies — re-copy from gemini.google.com.";
          } else if (res.status === 403) {
            // Google anti-bot — cookie may still be valid.
            isValid = true;
            error = "Note: Google blocked the probe (HTTP 403). Your cookies may still be valid — Gemini requires a real browser fingerprint to chat.";
          } else {
            isValid = true;
          }
          break;
        }

        case "devin": {
          try {
            const res = await fetch("https://api.devin.ai/v1/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ prompt: "ping", idempotency_id: "validation-" + Date.now() }),
            });
            // 2xx = valid, 401/403 = invalid key, anything else (4xx/5xx) = unknown.
            // Do NOT treat 5xx as valid — that certifies keys when the service is
            // failing or the endpoint shape changes.
            if (res.status >= 200 && res.status < 300) {
              isValid = true;
            } else if (res.status === 401 || res.status === 403) {
              isValid = false;
              error = "Invalid Devin API key";
            } else {
              isValid = false;
              error = `Devin returned status ${res.status} — unable to verify key`;
            }
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate Devin key";
          }
          break;
        }
        case "qwencloud": {
          let cookie = apiKey.replace(/^Cookie:\s*/i, "").trim();
          if (cookie.startsWith("cookie=")) cookie = cookie.slice(7).trim();
          // Strip bx-ua/bx-umidtoken from credential for validation
          cookie = cookie.replace(/bx-ua=[^\s;]+;?\s*/g, "").replace(/bx-umidtoken=[^\s;]+;?\s*/g, "").trim();
          try {
            const res = await fetch("https://home.qwencloud.com/tool/user/info.json", {
              method: "GET",
              headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36" },
            });
            if (res.status === 401 || res.status === 403) { isValid = false; error = "Invalid or expired qwencloud.com session cookie"; }
            else if (!res.ok) { isValid = false; error = `QwenCloud returned ${res.status}`; }
            else {
              const data = await res.json().catch(() => null);
              isValid = !!(data?.data?.secToken);
              if (!isValid) error = "Session accepted but no secToken — cookie may be expired";
            }
          } catch (err) {
            isValid = false; error = err.message || "Failed to validate QwenCloud session";
          }
          break;
        }
        case "moonshot": {
          try {
            const res = await fetch("https://api.moonshot.ai/v1/models", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            isValid = res.ok;
            if (!isValid) error = "Invalid Moonshot API key";
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate Moonshot key";
          }
          break;
        }
        case "featherless": {
          try {
            const res = await fetch("https://api.featherless.ai/v1/models?per_page=1", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            isValid = res.ok;
            if (!isValid) error = "Invalid Featherless API key";
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate Featherless key";
          }
          break;
        }
        case "perplexity-agent": {
          try {
            const res = await fetch("https://api.perplexity.ai/v1/models", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            isValid = res.ok;
            if (!isValid) error = "Invalid Perplexity API key";
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate Perplexity key";
          }
          break;
        }
        case "openvecta": {
          try {
            const res = await fetch("https://openvecta.com/v1/models", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            isValid = res.ok;
            if (!isValid) error = "Invalid OpenVecta API key";
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate OpenVecta key";
          }
          break;
        }
        case "api-airforce": {
          // Session-cookie → api_key exchange. The user pastes the airforce_session
          // JWT. Validate by calling /api/me which returns account JSON if valid.
          let sessionJwt = apiKey.replace(/^Cookie:\s*/i, "").trim();
          const afMatch = sessionJwt.match(/airforce_session=([^;]+)/);
          if (afMatch) sessionJwt = afMatch[1];
          if (!sessionJwt.startsWith("eyJ")) {
            isValid = false;
            error = "Not a valid airforce_session JWT — copy the cookie value from api.airforce DevTools (starts with eyJ)";
          } else {
            try {
              const res = await fetch("https://api.airforce/api/me", {
                method: "GET",
                headers: {
                  Cookie: `airforce_session=${sessionJwt}`,
                  Accept: "application/json",
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
                  Referer: "https://api.airforce/playground/",
                },
              });
              if (res.status === 401 || res.status === 403) {
                isValid = false;
                error = "Invalid or expired airforce_session cookie";
              } else if (!res.ok) {
                isValid = false;
                error = `api.airforce returned ${res.status}`;
              } else {
                const data = await res.json().catch(() => null);
                isValid = !!(data && data.api_key && String(data.api_key).startsWith("sk-air-"));
                if (!isValid) error = "Session accepted but no api_key returned";
              }
            } catch (err) {
              isValid = false;
              error = err.message || "Failed to validate airforce session";
            }
          }
          break;
        }

        case "freebuff-web": {
          let cookie = apiKey.replace(/^Cookie:\s*/i, "").trim();
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cookie)) {
            cookie = `__Secure-next-auth.session-token=${cookie}`;
          }
          try {
            const res = await fetch("https://freebuff.com/api/auth/session", {
              method: "GET",
              headers: {
                Cookie: cookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              },
            });
            if (res.status === 401 || res.status === 403) {
              isValid = false;
              error = "Invalid or expired freebuff.com session cookie";
            } else if (!res.ok) {
              isValid = false;
              error = `FreeBuff returned ${res.status}`;
            } else {
              const data = await res.json().catch(() => null);
              isValid = !!(data && data.user);
              if (!isValid) error = "Session accepted but no user — cookie may be expired";
            }
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate FreeBuff session";
          }
          break;
        }

        case "freebuff": {
          // Freebuff (Account) — validate the authToken by opening a
          // codebuff.com free session (same check the paste flow uses).
          const token = String(apiKey || "").trim();
          if (!token) {
            isValid = false;
            error = "authToken is required";
            break;
          }
          try {
            const res = await fetch("https://codebuff.com/api/v1/freebuff/session", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
                "User-Agent": "ai-sdk/openai-compatible/0.10.7/codebuff",
                "x-freebuff-model": "deepseek/deepseek-v4-flash",
              },
              body: "{}",
            });
            if (res.status === 401 || res.status === 403) {
              isValid = false;
              error = "Invalid or expired Freebuff authToken — re-copy from freebuff.llm.pm";
            } else if (!res.ok) {
              isValid = false;
              error = `Freebuff returned ${res.status}`;
            } else {
              const data = await res.json().catch(() => null);
              isValid = !!(data && data.instanceId);
              if (!isValid) error = "Session accepted but no instanceId returned";
            }
          } catch (err) {
            isValid = false;
            error = err.message || "Failed to validate Freebuff session";
          }
          break;
        }

        case "zenmux-free": {
          const cookie = apiKey.replace(/^Cookie:\s*/i, "");
          const ctoken = (cookie.match(/ctoken=([^;]+)/) || [])[1];
          if (!ctoken) {
            isValid = false;
            error = "No ctoken found in cookies. Export ALL cookies from zenmux.ai (must include ctoken).";
            break;
          }
          const res = await fetch(`https://zenmux.ai/api/anthropic/v1/models?ctoken=${ctoken}`, {
            method: "GET",
            headers: {
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
              Origin: "https://zenmux.ai",
              Referer: "https://zenmux.ai/platform/chat",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired zenmux.ai cookies — re-export all cookies.";
          } else { isValid = true; }
          break;
        }
        case "huggingchat": {
          let cookie = apiKey.replace(/^Cookie:\s*/i, "");
          if (!cookie.includes("=")) cookie = `hf-chat=${cookie}`;
          const res = await fetch("https://huggingface.co/chat/settings", {
            method: "GET",
            headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36" },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired hf-chat cookie — re-copy from huggingface.co/chat cookies.";
          } else { isValid = true; }
          break;
        }
        case "lmarena": {
          const cookie = apiKey.replace(/^Cookie:\s*/i, "");
          const res = await fetch("https://arena.ai/api/user", {
            method: "GET",
            headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36" },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired LMArena session cookie — re-copy from arena.ai cookies.";
          } else { isValid = true; }
          break;
        }
        case "puter": {
          let token = apiKey.trim();
          const am = token.match(/puter_auth_token=([^;]+)/); if (am) token = am[1];
          const bm = token.match(/[Bb]earer\s+(.+)/); if (bm) token = bm[1].trim();
          const res = await fetch("https://api.puter.com/whoami", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired Puter auth token — re-copy from puter.com dashboard.";
          } else { isValid = true; }
          break;
        }
        case "pollinations": {
          // No-auth by default — validate reachability.
          const res = await fetch("https://gen.pollinations.ai/v1/models", {
            method: "GET",
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36" },
          });
          isValid = res.ok;
          if (!isValid) error = "Pollinations gateway is unreachable — try again later.";
          break;
        }
        case "cody": {
          // Cody personal access token (sgp_...). Probe the /whoami endpoint.
          const res = await fetch("https://sourcegraph.com/.api/llm/models", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "X-Requested-With": "Sourcegraph-Editor",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid Cody access token — re-create at sourcegraph.com/user/settings/tokens.";
          } else { isValid = true; }
          break;
        }
        case "trae": {
          // Cloud-IDE-JWT (bare token or Authorization header paste).
          let token = apiKey.trim();
          const tm = token.match(/Cloud-IDE-JWT\s+(.+)/i); if (tm) token = tm[1].trim();
          const res = await fetch("https://core-normal.trae.ai/api/remote/v1/models?functions=solo_agent_remote,solo_work_remote", {
            method: "GET",
            headers: {
              Authorization: `Cloud-IDE-JWT ${token}`,
              "Content-Type": "application/json",
              "X-Trae-Client-Type": "web",
              Referer: "https://solo.trae.ai/",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
            },
          });
          if (res.status === 401 || res.status === 403) {
            isValid = false;
            error = "Invalid or expired Cloud-IDE-JWT — re-copy from solo.trae.ai DevTools (Authorization header).";
          } else { isValid = true; }
          break;
        }
        case "windsurf": {
          // Coming Soon — but still validate the sk-ws-... token shape lightly.
          const token = apiKey.trim();
          if (token.length < 16) {
            isValid = false;
            error = "Windsurf token looks too short — copy the sk-ws-... token from the IDE 'Windsurf: Provide Auth Token' command.";
          } else {
            isValid = true;
            // Note: gRPC adapter pending; we can't fully validate without it.
          }
          break;
        }
        default: {
          // Generic probe for OpenAI-compatible providers (config-driven from PROVIDERS)
          const cfg = PROVIDERS[provider];
          if (!cfg || cfg.format !== "openai" || !cfg.baseUrl) {
            return NextResponse.json({ error: "Provider validation not supported" }, { status: 400 });
          }
          if (cfg.noAuth) {
            isValid = true;
            break;
          }
          // Build auth headers based on cfg.authHeader (default: bearer)
          const headers = { "Content-Type": "application/json", ...(cfg.headers || {}) };
          if (cfg.authHeader === "x-api-key") headers["X-API-Key"] = apiKey;
          else headers["Authorization"] = `Bearer ${apiKey}`;
          // Try /models first (fast GET), fallback to chat probe on ambiguous response
          const modelsUrl = cfg.baseUrl.replace(/\/chat\/completions$/, "/models").replace(/\/chatbot$/, "/models");
          let probeOk = null;
          try {
            const probeRes = await fetch(modelsUrl, { headers, signal: AbortSignal.timeout(8000) });
            if (probeRes.status === 401 || probeRes.status === 403) probeOk = false;
            else if (probeRes.ok) probeOk = true;
          } catch { /* fallback to chat */ }
          if (probeOk !== null) {
            isValid = probeOk;
            break;
          }
          // Fallback: minimal chat probe
          const defaultModel = getDefaultModel(provider) || "test";
          const chatRes = await fetch(cfg.baseUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ model: defaultModel, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
            signal: AbortSignal.timeout(10000),
          });
          isValid = chatRes.status !== 401 && chatRes.status !== 403;
          break;
        }
      }
    } catch (err) {
      error = err.message;
      isValid = false;
    }

    return NextResponse.json({
      valid: isValid,
      error: isValid ? null : (error || "Invalid API key"),
    });
  } catch (error) {
    console.log("Error validating API key:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
