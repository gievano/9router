/**
 * HyperAgentExecutor — hyperagent.com agent chat (Unofficial/Experimental)
 *
 * Reverse-engineered from SPA captures (2026-07-21, hyperagent/*.txt):
 *   - New thread: GET /threads/new (Next.js) → redirect /thread/{cuid}
 *   - Chat: POST /api/threads/{threadId}/chat  (SSE data: lines)
 *   - First turn: sessionId=null → session_start event yields sessionId
 *   - Follow-up: same threadId + sessionId in body
 *   - Stream events: text / thinking / session_start / session_end / done / [DONE]
 *   - Auth: browser Cookie header
 *
 * OpenAI multi-turn is preserved via sticky thread+session cache.
 *
 * Ported from OmniRoute open-sse/executors/hyperagent.ts. Uses plain `fetch`
 * (not proxyAwareFetch) — consistent with the other web-cookie executors.
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { DATA_DIR } from "@/lib/dataDir.js";
import {
  HYPERAGENT_FALLBACK_MODELS,
  clientFacingHyperAgentModelId,
  wireHyperAgentModelId,
  wireHyperAgentRuntimeId,
  wireHyperAgentSubagentModelId,
} from "../services/hyperagentModels.js";
import { SSE_DONE, SSE_HEADERS_NO_BUFFER } from "../utils/sseConstants.js";

const ORIGIN = "https://hyperagent.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
const THREAD_CACHE_MAX = 200;

const CFG = PROVIDERS["hyperagent"];

// ─── Credential helpers ─────────────────────────────────────────────────────

function readStr(v) {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return t.length ? t : "";
}

function readPs(data, keys) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const rec = data;
  for (const k of keys) {
    const v = readStr(rec[k]);
    if (v) return v;
  }
  return "";
}

/** Normalize pasted cookie: full Cookie header or bare value. */
export function normalizeHyperAgentCookie(raw) {
  const t = (raw || "").trim();
  if (!t) return "";
  // Strip accidental "Cookie: " prefix
  return t.replace(/^Cookie:\s*/i, "").trim();
}

export function resolveHyperAgentCredentials(credentials) {
  const direct =
    readStr(credentials?.apiKey) ||
    readStr(credentials?.cookie) ||
    readStr(credentials?.accessToken);
  const ps = credentials?.providerSpecificData;
  const cookie = normalizeHyperAgentCookie(
    direct || readPs(ps, ["cookie", "sessionCookie", "authCookie", "Cookie"])
  );
  return { cookie };
}

// ─── Message helpers ────────────────────────────────────────────────────────

/**
 * Flatten message content for chat + fingerprints.
 * Handles OpenAI string/parts and Anthropic content blocks (tool_use / tool_result).
 * Without tool_result extraction, Claude Code multi-turn sends empty lastUserText
 * and HyperAgent drops the tool output entirely.
 */
export function extractMessageText(content) {
  if (typeof content === "string") return content;
  if (content == null) return "";
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object") return "";
        const p = part;
        const type = typeof p.type === "string" ? p.type.toLowerCase() : "";

        // Anthropic tool_result — content may be string or nested parts
        if (type === "tool_result" || type === "function_result") {
          const name = typeof p.name === "string" ? p.name : "tool";
          const body = extractMessageText(p.content ?? p.output ?? p.result ?? "");
          return body ? `[tool result ${name}]\n${body}` : `[tool result ${name}]`;
        }

        // Anthropic tool_use — include so fingerprints / observations stay non-empty
        if (type === "tool_use" || type === "function_call" || type === "tool_call") {
          const name = typeof p.name === "string" ? p.name : "tool";
          let args = "";
          if (p.input != null) {
            try {
              args = typeof p.input === "string" ? p.input : JSON.stringify(p.input);
            } catch {
              args = String(p.input);
            }
          } else if (typeof p.arguments === "string") {
            args = p.arguments;
          }
          return args ? `[tool call ${name}] ${args}` : `[tool call ${name}]`;
        }

        if (typeof p.text === "string") return p.text;
        if (typeof p.content === "string") return p.content;
        if (p.content != null && typeof p.content !== "string") {
          return extractMessageText(p.content);
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") {
    const o = content;
    if (typeof o.text === "string") return o.text;
    if (typeof o.content === "string") return o.content;
  }
  return "";
}

function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = (messages[i]?.role || "").toLowerCase();
    if (role === "user" || role === "human" || role === "tool" || role === "function") {
      return extractMessageText(messages[i].content).trim();
    }
  }
  return "";
}

// ─── Sticky thread cache ────────────────────────────────────────────────────

const memoryThreads = new Map();

function threadCachePath() {
  try {
    if (!DATA_DIR) return null;
    return join(DATA_DIR, "hyperagent-thread-sessions.json");
  } catch {
    return null;
  }
}

function loadThreadDisk() {
  const p = threadCachePath();
  if (!p || !existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

function saveThreadDisk(map) {
  const p = threadCachePath();
  if (!p) return;
  try {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(map), "utf8");
  } catch {
    /* best-effort */
  }
}

function getThreadBinding(key) {
  if (!key) return null;
  const mem = memoryThreads.get(key);
  if (mem) return mem;
  const disk = loadThreadDisk()[key];
  if (disk) {
    memoryThreads.set(key, disk);
    return disk;
  }
  return null;
}

function setThreadBinding(key, binding) {
  if (!key) return;
  memoryThreads.set(key, binding);
  const disk = loadThreadDisk();
  disk[key] = binding;
  const keys = Object.keys(disk);
  if (keys.length > THREAD_CACHE_MAX) {
    keys
      .sort((a, b) => (disk[a]?.updatedAt || 0) - (disk[b]?.updatedAt || 0))
      .slice(0, keys.length - THREAD_CACHE_MAX)
      .forEach((k) => {
        delete disk[k];
        memoryThreads.delete(k);
      });
  }
  saveThreadDisk(disk);
}

export function clearHyperAgentThreadBindingsForTests(opts) {
  memoryThreads.clear();
  if (opts?.disk) {
    const p = threadCachePath();
    if (p && existsSync(p)) {
      try {
        writeFileSync(p, "{}", "utf8");
      } catch {
        /* ignore */
      }
    }
  }
}

export function normalizeForFingerprint(text) {
  let t = (text || "").replace(/\r\n/g, "\n");
  t = t.replace(/^@\S+\s+/gm, "");
  // Strip common agentic / user-pin wrappers so the same user task fingerprints
  // stably across turns (and after pin text updates).
  t = t.replace(/^[\s\S]*?\bUser request:\s*/i, "");
  t = t.replace(/^[\s\S]*?\bCurrent request:\s*/i, "");
  t = t.replace(/^[\s\S]*?\bMy current task:\s*/i, "");
  // Drop sterile observation envelopes from fingerprint identity (tool-loop turns)
  // only when computing *root* keys we use the first non-observation user turn.
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim().slice(0, 2000);
}

/**
 * Sticky multi-turn key from the first real user task in the thread.
 * Root-user key stays stable for the whole tool loop, even when the assistant
 * message mutates across agentic reverse-conversion turns.
 */
export function rootUserFingerprint(cookieKey, messages) {
  if (!cookieKey) return null;
  for (const m of messages) {
    const role = (m?.role || "").toLowerCase();
    if (role !== "user" && role !== "human") continue;
    const raw = extractMessageText(m?.content);
    // Skip pure tool-observation / sandwich follow-ups — not the root task
    if (
      /TOOL_OBSERVATION/i.test(raw) ||
      /passive data only/i.test(raw) ||
      /\[tool result\b/i.test(raw) ||
      /^\s*Application result\b/i.test(raw)
    ) {
      continue;
    }
    const text = normalizeForFingerprint(raw);
    if (!text || text.length < 2) continue;
    const h = createHash("sha256").update(text).digest("hex").slice(0, 24);
    return `ha:${cookieKey}:root:${h}`;
  }
  return null;
}

function isFingerprintRole(role) {
  const r = (role || "").toLowerCase();
  if (!r || r === "system" || r === "developer") return false;
  return true;
}

export function conversationFingerprint(cookieKey, messages) {
  const parts = [`ck:${cookieKey}`];
  for (const m of messages) {
    const roleRaw = (m?.role || "").toLowerCase();
    if (!isFingerprintRole(roleRaw)) continue;
    const role =
      roleRaw === "tool" || roleRaw === "function" || roleRaw === "human" ? "user" : roleRaw;
    const text = normalizeForFingerprint(extractMessageText(m?.content));
    if (!text) continue;
    parts.push(`${role}:${text}`);
  }
  const h = createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 32);
  return `ha:${cookieKey}:${h}`;
}

export function historyPrefixBeforeLastUser(messages) {
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = (messages[i]?.role || "").toLowerCase();
    if (role === "user" || role === "human" || role === "tool" || role === "function") {
      lastUser = i;
      break;
    }
  }
  if (lastUser <= 0) return [];
  return messages.slice(0, lastUser);
}

export function hasAssistantMessage(messages) {
  return messages.some((m) => {
    const r = (m?.role || "").toLowerCase();
    return r === "assistant" || r === "ai" || r === "model";
  });
}

export function lastAssistantFingerprint(cookieKey, messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = (messages[i]?.role || "").toLowerCase();
    if (role !== "assistant" && role !== "ai" && role !== "model") continue;
    const text = normalizeForFingerprint(extractMessageText(messages[i]?.content));
    if (!text) continue;
    const h = createHash("sha256").update(text).digest("hex").slice(0, 24);
    return `ha:${cookieKey}:asst:${h}`;
  }
  return null;
}

/** Short stable key from cookie for cache isolation (not the full secret). */
export function cookieFingerprint(cookie) {
  return createHash("sha256")
    .update(cookie || "")
    .digest("hex")
    .slice(0, 16);
}

export function readClientThreadIds(body, headers) {
  const fromBodyThread = readStr(body.hyperagent_thread_id) || readStr(body.thread_id);
  const fromBodySession = readStr(body.hyperagent_session_id) || readStr(body.session_id);
  if (!headers) return { threadId: fromBodyThread, sessionId: fromBodySession };
  const lower = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = String(v ?? "");
  const threadId =
    fromBodyThread ||
    readStr(lower["x-hyperagent-thread-id"]) ||
    readStr(lower["x-thread-id"]) ||
    "";
  const sessionId =
    fromBodySession ||
    readStr(lower["x-hyperagent-session-id"]) ||
    readStr(lower["x-session-id"]) ||
    "";
  return { threadId, sessionId };
}

export function resolveHyperAgentThreadBinding(
  cookieKey,
  messages,
  clientThreadId,
  clientSessionId
) {
  const clientId = (clientThreadId || "").trim();
  const clientSess = (clientSessionId || "").trim();
  const prefix = historyPrefixBeforeLastUser(messages);
  const prefixKey =
    prefix.length > 0 && hasAssistantMessage(prefix)
      ? conversationFingerprint(cookieKey, prefix)
      : null;
  const rootKey = rootUserFingerprint(cookieKey, messages);

  if (clientId) {
    return {
      threadId: clientId,
      sessionId: clientSess,
      isFollowUp: true,
      prefixKey: prefixKey || rootKey,
    };
  }

  // 1) Exact history prefix (works when assistant text is unchanged across turns)
  if (prefixKey) {
    const cached = getThreadBinding(prefixKey);
    if (cached?.threadId && cached.projectKey === cookieKey) {
      return {
        threadId: cached.threadId,
        sessionId: cached.sessionId || clientSess,
        isFollowUp: true,
        prefixKey,
      };
    }
  }

  // 2) Root user task (stable across agentic tool_calls reverse-convert + tool loops)
  if (rootKey && hasAssistantMessage(messages)) {
    const cached = getThreadBinding(rootKey);
    if (cached?.threadId && cached.projectKey === cookieKey) {
      return {
        threadId: cached.threadId,
        sessionId: cached.sessionId || clientSess,
        isFollowUp: true,
        prefixKey: rootKey,
      };
    }
  }

  // 3) Last assistant text (legacy; may miss when reverse conversion rewrote the turn)
  if (hasAssistantMessage(messages)) {
    const asstKey = lastAssistantFingerprint(cookieKey, prefix.length ? prefix : messages);
    if (asstKey) {
      const cached = getThreadBinding(asstKey);
      if (cached?.threadId && cached.projectKey === cookieKey) {
        return {
          threadId: cached.threadId,
          sessionId: cached.sessionId || clientSess,
          isFollowUp: true,
          prefixKey: asstKey,
        };
      }
    }
  }

  return { threadId: "", sessionId: "", isFollowUp: false, prefixKey: null };
}

export function storeHyperAgentThreadAfterTurn(
  cookieKey,
  messages,
  assistantText,
  threadId,
  sessionId
) {
  if (!cookieKey || !threadId) return null;
  const full = [...messages, { role: "assistant", content: assistantText || "" }];
  if (
    !hasAssistantMessage(full) ||
    !messages.some((m) => {
      const r = (m.role || "").toLowerCase();
      return r === "user" || r === "human" || r === "tool" || r === "function";
    })
  ) {
    return null;
  }
  const binding = {
    threadId,
    sessionId: sessionId || "",
    projectKey: cookieKey,
    updatedAt: Date.now(),
  };
  const key = conversationFingerprint(cookieKey, full);
  setThreadBinding(key, binding);
  const prefix = historyPrefixBeforeLastUser(messages);
  if (prefix.length > 0 && hasAssistantMessage(prefix)) {
    setThreadBinding(conversationFingerprint(cookieKey, prefix), binding);
  }
  const asstKey = lastAssistantFingerprint(cookieKey, full);
  if (asstKey) setThreadBinding(asstKey, binding);
  // Always pin root user task → thread so tool-loop follow-ups (mutated assistant
  // content after Agentic reverse conversion) still hit the same HyperAgent thread.
  const rootKey = rootUserFingerprint(cookieKey, messages);
  if (rootKey) setThreadBinding(rootKey, binding);
  return key;
}

// ─── HTTP helpers ───────────────────────────────────────────────────────────

function browserHeaders(cookie, extra) {
  return {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    cookie,
    origin: ORIGIN,
    referer: `${ORIGIN}/`,
    "user-agent": USER_AGENT,
    ...extra,
  };
}

/**
 * Create a new HyperAgent thread id.
 * Primary (live-validated): POST /api/threads → { id }.
 * Fallback: GET /threads/new (Next RSC) and parse Location / body.
 */
export async function createHyperAgentThread(cookie, signal) {
  try {
    const res = await fetch(`${ORIGIN}/api/threads`, {
      method: "POST",
      headers: browserHeaders(cookie, {
        "content-type": "application/json",
        "x-request-id": randomUUID(),
      }),
      body: JSON.stringify({}),
      signal: signal ?? undefined,
      redirect: "manual",
    });
    const loc = res.headers.get("location") || res.headers.get("Location") || "";
    const fromLoc = extractThreadIdFromUrl(loc);
    if (fromLoc) return fromLoc;
    if (res.ok) {
      const text = await res.text();
      try {
        const j = JSON.parse(text);
        const id =
          readStr(j.id) ||
          readStr(j.threadId) ||
          readStr(j.thread_id) ||
          (j.thread && typeof j.thread === "object" ? readStr(j.thread.id) : "");
        if (id) return id;
      } catch {
        const m = text.match(/cm[a-z0-9]{20,}/i);
        if (m) return m[0];
      }
    }
  } catch {
    /* fall through */
  }

  const res2 = await fetch(`${ORIGIN}/threads/new`, {
    method: "GET",
    headers: browserHeaders(cookie, {
      rsc: "1",
      "next-url": "/",
      "x-request-id": randomUUID(),
    }),
    signal: signal ?? undefined,
    redirect: "manual",
  });
  const loc2 =
    res2.headers.get("location") ||
    res2.headers.get("Location") ||
    res2.headers.get("x-middleware-rewrite") ||
    "";
  const fromLoc2 = extractThreadIdFromUrl(loc2);
  if (fromLoc2) return fromLoc2;

  if (res2.status >= 200 && res2.status < 400) {
    const text = await res2.text().catch(() => "");
    const m = text.match(/\/thread\/(cm[a-z0-9]{20,})/i) || text.match(/"?(cm[a-z0-9]{20,})"?/i);
    if (m) return m[1];
  }

  throw new Error(
    `Could not create HyperAgent thread (HTTP ${res2.status}). Ensure the session Cookie is valid and not expired.`
  );
}

/**
 * Apply model + execution settings on a thread (live SPA does this before chat).
 * Chat body must NOT carry modelId (API returns model_unknown for bare pricing keys).
 */
export async function configureHyperAgentThread(cookie, threadId, opts, signal) {
  const body = {
    modelId: opts.modelId,
    defaultSubagentModel: opts.subagentModelId,
    runtimeId: opts.runtimeId || "claude-agents-sdk",
  };
  // "auto" = execution-style agent loop (validated). null clears. Never "plan".
  if (opts.executionMode === "auto") body.executionMode = "auto";
  else if (opts.executionMode === null) body.executionMode = null;

  const res = await fetch(`${ORIGIN}/api/threads/${encodeURIComponent(threadId)}`, {
    method: "PATCH",
    headers: browserHeaders(cookie, {
      "content-type": "application/json",
      "x-request-id": randomUUID(),
      referer: `${ORIGIN}/thread/${threadId}`,
    }),
    body: JSON.stringify(body),
    signal: signal ?? undefined,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `HyperAgent configure thread HTTP ${res.status}: ${errText.slice(0, 300) || res.statusText}`
    );
  }
}

export function extractThreadIdFromUrl(url) {
  if (!url) return "";
  const m = url.match(/\/thread\/([A-Za-z0-9_-]{10,})/i) || url.match(/(cm[a-z0-9]{20,})/i);
  return m ? m[1] : "";
}

/**
 * Default feature flags from live SPA **execution-mode** chat body.
 * - Do NOT set injectPlanMode (plan mode). Execution omits the field entirely.
 * - Do NOT put modelId/model here — model is PATCH'd onto the thread first.
 */
export function buildHyperAgentChatBody(opts) {
  return {
    sessionId: opts.sessionId,
    unifiedStream: true,
    searchMode: "exa",
    enableExecuteScript: false,
    enablePersistentSandbox: true,
    enableWebpage: true,
    enableSlides: true,
    tablesEnabled: true,
    enableWebSearch: true,
    enableBrowser: true,
    enableImageGeneration: true,
    enableVideoGeneration: true,
    enableAudioGeneration: true,
    enableTranscription: true,
    enableAvatarVideo: true,
    enableExaFindSimilar: true,
    enableExaAnswer: true,
    enableExaResearch: true,
    enableExaWebsets: true,
    enableGeoTools: true,
    hyperAppsEnabled: false,
    documentsEnabled: true,
    enableThreadSearch: true,
    residentialProxyEnabled: false,
    solveCaptchasEnabled: true,
    content: opts.content,
    debug: false,
    // No connectors — empty list (SPA execution capture).
    enabledIntegrations: [],
    integrationMode: "open",
    globalTablesEnabled: true,
    // NO injectPlanMode → execution mode (plan mode was injectPlanMode:true).
    // NO modelId / model → set via configureHyperAgentThread PATCH.
  };
}

/**
 * Parse HyperAgent SSE stream into assistant text (+ sessionId).
 * Accumulates `type:"text"` content; ignores thinking for the OpenAI body.
 */
export async function parseHyperAgentSseStream(response) {
  if (!response.body) {
    throw new Error("Empty HyperAgent stream body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let sessionId = "";
  let modelId = "";
  let events = 0;

  const handleData = (payload) => {
    const trimmed = payload.trim();
    if (!trimmed || trimmed === "[DONE]") return;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return;
    }
    events += 1;
    const type = readStr(obj.type);
    if (type === "text") {
      text += typeof obj.content === "string" ? obj.content : "";
    } else if (type === "session_start") {
      const sid = readStr(obj.sessionId);
      if (sid) sessionId = sid;
    } else if (type === "thread_runtime_latched") {
      const mid = readStr(obj.modelId);
      if (mid) modelId = mid;
    } else if (type === "error" || type === "stream_error") {
      const msg =
        readStr(obj.content) ||
        readStr(obj.message) ||
        readStr(obj.error) ||
        "HyperAgent stream error";
      throw new Error(msg);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Split SSE frames
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      const t = line.trimEnd();
      if (t.startsWith("data:")) {
        handleData(t.slice(5).trimStart());
      }
    }
  }
  if (buffer.trim()) {
    const t = buffer.trim();
    if (t.startsWith("data:")) handleData(t.slice(5).trimStart());
  }

  return { text, sessionId, modelId, events };
}

// ─── OpenAI response helpers ────────────────────────────────────────────────

function estimateUsage(messages, content) {
  const prompt = (messages || []).map((m) => extractMessageText(m.content)).join("\n");
  const prompt_tokens = Math.max(1, Math.ceil(prompt.length / 4));
  const completion_tokens = Math.max(1, Math.ceil(content.length / 4));
  return {
    prompt_tokens,
    completion_tokens,
    total_tokens: prompt_tokens + completion_tokens,
    estimated: true,
  };
}

function chatCompletionResponse(content, model, messages, threadId, sessionId) {
  const id = threadId ? `chatcmpl-ha-${threadId}` : `chatcmpl-ha-${Date.now()}`;
  return new Response(
    JSON.stringify({
      id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: estimateUsage(messages, content),
      hyperagent_thread_id: threadId || undefined,
      hyperagent_session_id: sessionId || undefined,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...(threadId ? { "X-HyperAgent-Thread-Id": threadId } : {}),
        ...(sessionId ? { "X-HyperAgent-Session-Id": sessionId } : {}),
      },
    }
  );
}

function pseudoStreamResponse(content, model, threadId, sessionId) {
  const encoder = new TextEncoder();
  const id = threadId ? `chatcmpl-ha-${threadId}` : `chatcmpl-ha-${Date.now()}`;
  const chunk = (delta, finishReason) => ({
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: delta ? { content: delta } : {}, finish_reason: finishReason }],
  });
  const readable = new ReadableStream({
    start(controller) {
      const parts = content.match(/\S+\s*/g) || [content];
      let buf = "";
      for (const p of parts) {
        buf += p;
        if (buf.length >= 40) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk(buf, null))}\n\n`));
          buf = "";
        }
      }
      if (buf) controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk(buf, null))}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk("", "stop"))}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...(threadId ? { "X-HyperAgent-Thread-Id": threadId } : {}),
      ...(sessionId ? { "X-HyperAgent-Session-Id": sessionId } : {}),
    },
  });
}

// ─── Error helper (with path sanitization) ──────────────────────────────────

// Length cap protects against pathological inputs even before tokenization.
const MAX_ERROR_LEN = 4096;
const SOURCE_EXT = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

function looksLikeAbsolutePath(tok) {
  if (tok.length < 4 || tok.length > 2048) return false;
  const isPosix = tok.charCodeAt(0) === 0x2f; // '/'
  const isWindows = tok.length > 2 && tok.charCodeAt(1) === 0x3a && /[A-Za-z]/.test(tok[0]);
  if (!isPosix && !isWindows) return false;
  const dot = tok.lastIndexOf(".");
  if (dot <= 0 || dot === tok.length - 1) return false;
  const ext = tok
    .slice(dot + 1)
    .split(":", 1)[0]
    .toLowerCase();
  return SOURCE_EXT.includes(ext);
}

/** Strip stack-trace tail and absolute source paths from error messages. */
function sanitizeErrorMessage(message) {
  let str = typeof message === "string" ? message : String(message ?? "");
  if (str.length > MAX_ERROR_LEN) str = str.slice(0, MAX_ERROR_LEN);
  const nl = str.indexOf("\n");
  const firstLine = nl >= 0 ? str.slice(0, nl) : str;
  const parts = firstLine.split(/(\s+)/);
  for (let i = 0; i < parts.length; i++) {
    if (looksLikeAbsolutePath(parts[i])) parts[i] = "<path>";
  }
  return parts.join("");
}

function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message: sanitizeErrorMessage(message), type: "upstream_error", code: `HTTP_${status}` } }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function makeErrorResult(status, message, extra, url) {
  return {
    response: errorResponse(status, message),
    url: url ?? `${ORIGIN}/api/threads`,
    headers: {},
    transformedBody: extra ?? {},
  };
}

// ─── Executor ───────────────────────────────────────────────────────────────

export class HyperAgentExecutor extends BaseExecutor {
  constructor() {
    super("hyperagent", CFG);
  }

  async execute(input) {
    const { model, body, stream: wantStream, credentials, signal } = input;
    const requestBody = (body || {}) || {};
    const { cookie } = resolveHyperAgentCredentials(credentials);

    if (!cookie) {
      return makeErrorResult(
        401,
        "Missing HyperAgent session cookie — paste the full Cookie header from hyperagent.com (DevTools → Network → any document request → Request Headers → Cookie)",
        body,
        `${ORIGIN}/api/threads`
      );
    }

    const messages = requestBody.messages || [];
    const userText = lastUserText(messages);
    if (!userText) {
      return makeErrorResult(400, "No user message found", body, `${ORIGIN}/api/threads`);
    }

    const clientFacing = clientFacingHyperAgentModelId(model || requestBody.model);
    const wireModel = wireHyperAgentModelId(model || requestBody.model);
    const subagentModel = wireHyperAgentSubagentModelId(model || requestBody.model);
    const runtimeId = wireHyperAgentRuntimeId(model || requestBody.model);
    const cookieKey = cookieFingerprint(cookie);

    const inboundHeaders = input.clientHeaders ?? input.headers;
    const clientIds = readClientThreadIds(requestBody, inboundHeaders ?? undefined);
    const binding = resolveHyperAgentThreadBinding(
      cookieKey,
      messages,
      clientIds.threadId,
      clientIds.sessionId
    );

    let threadId = binding.threadId;
    let sessionId = binding.sessionId || null;

    try {
      if (!binding.isFollowUp || !threadId) {
        threadId = await createHyperAgentThread(cookie, signal);
        sessionId = null;
      }

      // Always apply model + execution settings on the thread (SPA does this
      // before /chat). Chat body must not carry modelId.
      await configureHyperAgentThread(
        cookie,
        threadId,
        {
          modelId: wireModel,
          subagentModelId: subagentModel,
          runtimeId,
          executionMode: "auto",
        },
        signal
      );

      const chatUrl = `${ORIGIN}/api/threads/${encodeURIComponent(threadId)}/chat`;
      const chatBody = buildHyperAgentChatBody({
        content: userText,
        sessionId,
      });

      const res = await fetch(chatUrl, {
        method: "POST",
        headers: browserHeaders(cookie, {
          "content-type": "application/json",
          referer: `${ORIGIN}/thread/${threadId}`,
          "x-request-id": randomUUID(),
        }),
        body: JSON.stringify(chatBody),
        signal: signal ?? undefined,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // Stale thread → create once, reconfigure, retry
        if (res.status === 404 || /not found|unknown thread/i.test(errText)) {
          threadId = await createHyperAgentThread(cookie, signal);
          sessionId = null;
          await configureHyperAgentThread(
            cookie,
            threadId,
            {
              modelId: wireModel,
              subagentModelId: subagentModel,
              runtimeId,
              executionMode: "auto",
            },
            signal
          );
          const retryUrl = `${ORIGIN}/api/threads/${encodeURIComponent(threadId)}/chat`;
          const retryBody = buildHyperAgentChatBody({
            content: userText,
            sessionId: null,
          });
          const res2 = await fetch(retryUrl, {
            method: "POST",
            headers: browserHeaders(cookie, {
              "content-type": "application/json",
              referer: `${ORIGIN}/thread/${threadId}`,
              "x-request-id": randomUUID(),
            }),
            body: JSON.stringify(retryBody),
            signal: signal ?? undefined,
          });
          if (!res2.ok) {
            const t2 = await res2.text().catch(() => "");
            return makeErrorResult(
              res2.status >= 400 && res2.status < 600 ? res2.status : 502,
              `HyperAgent chat HTTP ${res2.status}: ${t2.slice(0, 300)}`,
              body,
              retryUrl
            );
          }
          const parsed2 = await parseHyperAgentSseStream(res2);
          return finalize(parsed2, messages, clientFacing, threadId, cookieKey, wantStream);
        }
        return makeErrorResult(
          res.status >= 400 && res.status < 600 ? res.status : 502,
          `HyperAgent chat HTTP ${res.status}: ${errText.slice(0, 300)}`,
          body,
          chatUrl
        );
      }

      const parsed = await parseHyperAgentSseStream(res);
      // Prefer session from stream; keep prior if stream omitted on follow-up
      if (!parsed.sessionId && sessionId) parsed.sessionId = sessionId;
      return finalize(parsed, messages, clientFacing, threadId, cookieKey, wantStream);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = /cookie|401|unauthor/i.test(msg) ? 401 : /timeout/i.test(msg) ? 504 : 502;
      return makeErrorResult(status, `HyperAgent: ${msg}`, body, `${ORIGIN}/api/threads`);
    }
  }
}

function finalize(parsed, messages, clientFacing, threadId, cookieKey, wantStream) {
  const text = (parsed.text || "").trim();
  if (!text) {
    return makeErrorResult(
      502,
      `HyperAgent returned empty content (events=${parsed.events})`,
      undefined,
      `${ORIGIN}/api/threads`
    );
  }
  storeHyperAgentThreadAfterTurn(cookieKey, messages, text, threadId, parsed.sessionId || "");
  const modelOut = parsed.modelId || clientFacing;
  const response = wantStream
    ? pseudoStreamResponse(text, modelOut, threadId, parsed.sessionId)
    : chatCompletionResponse(text, modelOut, messages, threadId, parsed.sessionId);
  return {
    response,
    url: `${ORIGIN}/api/threads/${threadId}/chat`,
    headers: { Cookie: "***" },
    transformedBody: {
      threadId,
      sessionId: parsed.sessionId || null,
      model: modelOut,
    },
  };
}

export { HYPERAGENT_FALLBACK_MODELS, ORIGIN as HYPERAGENT_ORIGIN };

export default HyperAgentExecutor;
