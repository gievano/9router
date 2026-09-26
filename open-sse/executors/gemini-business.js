// GeminiBusinessExecutor — Google Gemini Business / Enterprise Web provider.
//
// Routes requests through Google Gemini Business (business.gemini.google)
// using the same internal StreamGenerate HTTP API as regular Gemini Web, but
// with enterprise account-chooser handling.
//
// Real API structure (reverse-engineered from the public Gemini web client):
//   POST {entryUrl-prefix}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate
//   Content-Type: application/x-www-form-urlencoded
//   Body: f.req=<JSON-encoded inner array>
//
// Auth pipeline (per request):
//   1. Extract __Secure-1PSID + __Secure-1PSIDTS cookies from credentials
//   2. Extract the enterprise entry URL (e.g. /home/cid/{CID}) from providerSpecificData
//   3. Build the StreamGenerate URL using the entry path prefix
//   4. POST form-encoded payload to the endpoint
//   5. Handle the account-chooser HTML response (explicit 403 with guidance)
//   6. Parse the wrb.fr JSON response and extract text chunks
//   7. Translate to OpenAI chat completions format
//
// Ported from OmniRoute open-sse/executors/gemini-business.ts.
// Reference: https://github.com/Sophomoresty/gemini-web2api (gemini_web2api.py)
// Reference: https://github.com/yukkcat/gemini-business2api
import { createHash, randomUUID } from "node:crypto";
import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";
import { sseChunk } from "../utils/sse.js";

const CFG = PROVIDERS["gemini-business"];

const GEMINI_BUSINESS_FETCH_TIMEOUT_MS = 60_000;
const GEMINI_BUSINESS_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

// Default entry URL — user can override via providerSpecificData.entryUrl
const DEFAULT_ENTRY_URL = "https://business.gemini.google/home";

/**
 * Model ID → StreamGenerate MODE_CATEGORY enum value. The StreamGenerate
 * inner array contains a model-id at index [79] mapping to the internal
 * MODE_CATEGORY enum (stable per model family). See gemini-web2api.py.
 */
const MODEL_CATEGORY_MAP = {
  // Gemini 3.x (enterprise)
  "gemini-3-pro": 70,
  "gemini-3-ultra": 71,
  "gemini-3-flash": 75,
  // Gemini 2.5 (enterprise)
  "gemini-2.5-pro": 53,
  "gemini-2.5-flash": 54,
  "gemini-2.5-flash-thinking": 55,
  // Gemini 2.0
  "gemini-2.0-pro": 51,
  "gemini-2.0-flash": 52,
  "gemini-2.0-flash-thinking": 56,
  // Image / video
  "gemini-3-pro-image": 76,
  "gemini-2.0-flash-image": 57,
  "veo-3.1-generate": 80,
};

const DEFAULT_MODEL = "gemini-2.5-pro";
const DEFAULT_MODEL_CATEGORY = 53;

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message, type: "upstream_error" } }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Build the StreamGenerate inner array (80 slots, protobuf-like).
 * Slot [0]  = [prompt, 0, null, null, null, null, 0]
 * Slot [1]  = ["en"]                     (language)
 * Slot [2]  = ["", "", "", null, ...]    (conversation state)
 * Slot [17] = [[thinkMode]]              (thinking depth 0-4)
 * Slot [79] = model_id (MODE_CATEGORY enum)
 * Slot [59] = UUID
 * See gemini-web2api.py: `gemini_stream_generate_iter()`
 */
function buildInnerArray(prompt, modelCategory) {
  const inner = new Array(80).fill(null);
  inner[0] = [prompt, 0, null, null, null, null, 0];
  inner[1] = ["en"];
  inner[2] = ["", "", "", null, null, null, null, null, null, ""];
  inner[6] = [0];
  inner[7] = 1;
  inner[10] = 1;
  inner[11] = 0;
  inner[17] = [[0]]; // 0 = deepest thinking
  inner[18] = 0;
  inner[27] = 1;
  inner[30] = [4];
  inner[41] = [2];
  inner[53] = 0;
  inner[59] = randomUUID();
  inner[61] = [];
  inner[68] = 1;
  inner[79] = modelCategory;
  return inner;
}

/**
 * Parse Gemini StreamGenerate response text.
 *
 * Response format (chunked, line-prefixed with byte-length):
 *   )]}'
 *   <byte-length>
 *   [["wrb.fr", null, "<JSON string>"]]
 *   <byte-length>
 *   [["wrb.fr", null, "<JSON string>"]]
 *
 * The JSON string contains a nested array: inner[4][0][1] = ["text chunks"].
 * We concatenate all text chunks from all wrb.fr lines.
 */
export function parseStreamResponse(raw) {
  const lines = raw.split("\n");
  const textChunks = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === ")]}'" || /^\d+$/.test(line)) continue;
    if (!line.includes("wrb.fr")) continue;
    try {
      const arr = JSON.parse(line);
      if (!Array.isArray(arr) || !arr[0] || arr[0][0] !== "wrb.fr") continue;
      const payload = arr[0]?.[2];
      if (typeof payload !== "string") continue;
      const inner = JSON.parse(payload);
      const responseArray = inner?.[4]?.[0]?.[1];
      if (!Array.isArray(responseArray)) continue;
      const chunkText = responseArray.filter((c) => typeof c === "string").join("");
      if (chunkText) textChunks.push(chunkText);
    } catch {
      // Skip unparseable lines (binary chunks, etc.)
    }
  }

  return textChunks.join("");
}

function buildJsonResponse(text, model) {
  const body = {
    id: `chatcmpl-${randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function buildStreamingResponse(text, model) {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  const chunks = [
    sseChunk({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
    }),
    sseChunk({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
    }),
    sseChunk({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    }),
    SSE_DONE,
  ];

  const readable = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(readable, { headers: { ...SSE_HEADERS_NO_BUFFER } });
}

function readCredentialString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function readProviderSpecificString(providerSpecificData, keys) {
  if (!providerSpecificData || typeof providerSpecificData !== "object") return "";
  for (const key of keys) {
    const v = providerSpecificData[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

export function resolveGeminiBusinessCookie(credentials) {
  if (!credentials || typeof credentials !== "object") return "";
  const directCookie =
    readCredentialString(credentials.apiKey) || readCredentialString(credentials.cookie);
  const psid = readProviderSpecificString(credentials.providerSpecificData, [
    "__Secure-1PSID",
    "cookie",
  ]);
  const psidts = readProviderSpecificString(credentials.providerSpecificData, [
    "__Secure-1PSIDTS",
  ]);
  return directCookie || [psid, psidts].filter(Boolean).join("; ");
}

function extractTextContent(content) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return typeof part.text === "string" ? part.text : "";
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function extractCookieValue(cookie, name) {
  const pairs = cookie.split(";");
  for (const pair of pairs) {
    const [k, ...rest] = pair.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

/**
 * Parse a Gemini Business entry URL into base origin + path prefix.
 * Example:
 *   entryUrl = "https://business.gemini.google/home/cid/8888a888-b6e0-..."
 *   baseOrigin = "https://business.gemini.google"
 *   pathPrefix = "/home/cid/8888a888-b6e0-..."
 *
 * Also accepts protocol-less URLs ("business.gemini.google/home/cid/...").
 */
function parseEntryUrl(entryUrl) {
  const fallback = { baseOrigin: "https://business.gemini.google", pathPrefix: "/home" };
  const trimmed = entryUrl.trim();
  if (!trimmed) return fallback;

  const normalized = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const u = new URL(normalized);
    if (!u.host) return fallback;
    return {
      baseOrigin: `${u.protocol}//${u.host}`,
      pathPrefix: u.pathname.replace(/\/$/, "") || "/",
    };
  } catch {
    return fallback;
  }
}

/**
 * Compute the SAPISID hash auth header value.
 * Format: SAPISIDHASH {epoch_seconds}_{sha1_hash}
 * The hash is sha1(epoch + " " + sapisid + " " + origin).
 */
function computeSapisidHash(sapisid, origin) {
  const epoch = Math.floor(Date.now() / 1000);
  const hashInput = `${epoch} ${sapisid} ${origin}`;
  const hash = createHash("sha1").update(hashInput).digest("hex");
  return `SAPISIDHASH ${epoch}_${hash}`;
}

export class GeminiBusinessExecutor extends BaseExecutor {
  constructor() {
    super("gemini-business", CFG);
  }

  async execute({ model, body, stream: wantStream, credentials, signal, log }) {
    const requestBody = asRecord(body);

    const cookie = resolveGeminiBusinessCookie(credentials);
    if (!cookie) {
      return {
        response: errorResponse(
          401,
          "Missing Gemini Business cookies. Set __Secure-1PSID and __Secure-1PSIDTS from your enterprise account (business.gemini.google)."
        ),
        url: DEFAULT_ENTRY_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const entryUrl =
      readProviderSpecificString(credentials?.providerSpecificData, ["entryUrl", "entry_url"]) ||
      DEFAULT_ENTRY_URL;
    const { baseOrigin, pathPrefix } = parseEntryUrl(entryUrl);

    const messages = Array.isArray(requestBody.messages) ? requestBody.messages : [];
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const prompt = extractTextContent(lastUserMsg?.content);
    if (!prompt) {
      return {
        response: errorResponse(400, "No user message found in request body."),
        url: DEFAULT_ENTRY_URL,
        headers: {},
        transformedBody: body,
      };
    }

    const requestedModel = typeof model === "string" && model ? model : DEFAULT_MODEL;
    const modelCategory = MODEL_CATEGORY_MAP[requestedModel] ?? DEFAULT_MODEL_CATEGORY;

    const innerArray = buildInnerArray(prompt, modelCategory);

    const streamUrl = `${baseOrigin}${pathPrefix}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20240619.16_p0&hl=en&_reqid=${Math.floor(Math.random() * 900000) + 100000}&rt=c`;

    const formBody = new URLSearchParams();
    formBody.set("f.req", JSON.stringify([null, JSON.stringify(innerArray)]));

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: cookie,
      "X-Same-Domain": "1",
      "User-Agent": GEMINI_BUSINESS_USER_AGENT,
      Origin: baseOrigin,
      Referer: `${baseOrigin}${pathPrefix}/`,
    };

    // SAPISID hash auth header improves reliability on enterprise accounts.
    const sapisid =
      extractCookieValue(cookie, "SAPISID") || extractCookieValue(cookie, "__Secure-3PAPISID");
    if (sapisid) {
      headers["Authorization"] = computeSapisidHash(sapisid, baseOrigin);
    }

    const timeoutSignal = AbortSignal.timeout(GEMINI_BUSINESS_FETCH_TIMEOUT_MS);
    const mergedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    let response;
    try {
      response = await fetch(streamUrl, {
        method: "POST",
        headers,
        body: formBody.toString(),
        signal: mergedSignal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "fetch failed";
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return {
        response: errorResponse(
          isTimeout ? 504 : 502,
          `Gemini Business ${isTimeout ? "request timed out" : "network error"}: ${message}`
        ),
        url: streamUrl,
        headers,
        transformedBody: body,
      };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        response: errorResponse(
          response.status,
          `Gemini Business returned HTTP ${response.status}: ${text.slice(0, 200)}`
        ),
        url: streamUrl,
        headers,
        transformedBody: body,
      };
    }

    const rawText = await response.text();

    if (rawText.includes("auth.business.gemini.google/account-chooser")) {
      return {
        response: errorResponse(
          403,
          "Gemini Business account-chooser detected. Your enterprise cookies may be stale or the entry URL is wrong. Re-extract __Secure-1PSID/PSIDTS from business.gemini.google/home/cid/{YOUR-CID} after signing in."
        ),
        url: streamUrl,
        headers,
        transformedBody: body,
      };
    }

    const text = parseStreamResponse(rawText);
    if (!text) {
      log?.warn?.("GEMINI-BUSINESS", `Empty upstream response from ${streamUrl}`);
      return {
        response: errorResponse(
          502,
          "Gemini Business returned no text. The cookie may be expired or the entry URL is wrong."
        ),
        url: streamUrl,
        headers,
        transformedBody: body,
      };
    }

    if (wantStream) {
      return {
        response: buildStreamingResponse(text, requestedModel),
        url: streamUrl,
        headers,
        transformedBody: body,
      };
    }
    return {
      response: buildJsonResponse(text, requestedModel),
      url: streamUrl,
      headers,
      transformedBody: body,
    };
  }
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export default GeminiBusinessExecutor;
