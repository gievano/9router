/**
 * Notion AI Web — thread session continuity (OpenAI multi-turn → one Notion chat).
 * Ported from OmniRoute open-sse/services/notionThreadSessions.ts.
 *
 * Binds an OpenAI-style multi-turn conversation to a single Notion `threadId`
 * instead of minting a fresh Notion chat on every request:
 * - Space-keyed sticky root cache plus history-prefix fallbacks, backed by an
 *   on-disk snapshot under DATA_DIR so continuity survives restarts.
 * - Sticky root binding written *before* the upstream call so error retries
 *   never mint a second Notion chat for the same conversation.
 * - Optional client-supplied continuity via body (`notion_thread_id`/`thread_id`)
 *   or the `X-Notion-Thread-Id` header.
 */
import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DATA_DIR } from "@/lib/dataDir.js";

/**
 * Normalize OpenAI-style message content to a plain string.
 * Accepts a string or content-parts array (`{ type:"text", text }` / `{ text }`).
 */
export function extractNotionMessageText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const p of content) {
    if (typeof p === "string") {
      if (p) parts.push(p);
      continue;
    }
    if (!p || typeof p !== "object") continue;
    const o = p;
    if (typeof o.text === "string" && o.text) parts.push(o.text);
    else if (typeof o.content === "string" && o.content) parts.push(o.content);
  }
  return parts.join("\n");
}

const THREAD_SESSION_MAX_AGE_MS = 7 * 24 * 3600_000; // 7d
const THREAD_SESSION_MAX_ENTRIES = 500;

/** In-memory map: conversation key → Notion threadId. Backed by DATA_DIR when available. */
const threadSessionCache = new Map();
let threadStoreLoaded = false;
let threadStoreDirty = false;
let threadStoreTimer = null;

function getThreadStorePath() {
  try {
    if (!DATA_DIR) return null;
    return join(DATA_DIR, "notion-web-thread-sessions.json");
  } catch {
    return null;
  }
}

function loadThreadStoreFromDisk() {
  if (threadStoreLoaded) return;
  threadStoreLoaded = true;
  const path = getThreadStorePath();
  if (!path || !existsSync(path)) return;
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed || {})) {
      if (!v?.threadId || typeof v.ts !== "number") continue;
      if (now - v.ts > THREAD_SESSION_MAX_AGE_MS) continue;
      threadSessionCache.set(k, v);
    }
  } catch {
    // corrupt store — start fresh
  }
}

function scheduleThreadStoreFlush() {
  threadStoreDirty = true;
  if (threadStoreTimer) return;
  threadStoreTimer = setTimeout(() => {
    threadStoreTimer = null;
    flushThreadStoreToDisk();
  }, 250);
  // Don't keep the process alive solely for the flush.
  if (typeof threadStoreTimer === "object" && threadStoreTimer && "unref" in threadStoreTimer) {
    try {
      threadStoreTimer.unref();
    } catch {
      /* ignore */
    }
  }
}

function flushThreadStoreToDisk() {
  if (!threadStoreDirty) return;
  const path = getThreadStorePath();
  if (!path) return;
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [k, v] of threadSessionCache) obj[k] = v;
    writeFileSync(path, JSON.stringify(obj), "utf8");
    threadStoreDirty = false;
  } catch {
    // best-effort persistence
  }
}

/** Exported for unit tests. */
export function __resetNotionThreadSessionsForTests() {
  threadSessionCache.clear();
  threadStoreLoaded = true; // skip disk reload in tests
  threadStoreDirty = false;
  if (threadStoreTimer) {
    clearTimeout(threadStoreTimer);
    threadStoreTimer = null;
  }
}

/**
 * Normalize user/assistant text for thread-cache hashing.
 * Agentic conversion may rewrite the last user turn (UREW pin with
 * "My current task: …") — without normalization, turn-2 lookup never matches
 * turn-1 store → createThread:true every request (new Notion chat each time).
 */
export function normalizeNotionContentForHash(content) {
  let text = extractNotionMessageText(content).replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  // Agentic / UREW pin: keep only the stable task suffix when present.
  const taskMarkers = ["My current task:", "my current task:"];
  for (const marker of taskMarkers) {
    const idx = text.lastIndexOf(marker);
    if (idx >= 0) {
      text = text.slice(idx + marker.length).trim();
      break;
    }
  }

  // Drop other common agentic preamble fingerprints if the whole pin leaked in.
  if (text.includes("local workflow automation tool") || text.includes("clipboard parser")) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) text = lines[lines.length - 1];
  }

  return text.replace(/\s+/g, " ").trim();
}

/** FNV-1a style hash of spaceId + normalized message list (conversation prefix). */
export function hashNotionConversation(spaceId, msgs) {
  const parts = [
    `space:${spaceId}`,
    ...msgs.map((h) => `${(h.role || "").toLowerCase()}:${normalizeNotionContentForHash(h.content)}`),
  ];
  const raw = parts.join("\n");
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Everything before the last user message (empty ⇒ first user turn / new thread). */
export function conversationPrefixBeforeLastUser(messages) {
  if (!messages.length) return [];
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = (messages[i]?.role || "").toLowerCase();
    if (role === "user" || role === "human") {
      lastUser = i;
      break;
    }
  }
  if (lastUser <= 0) return [];
  return messages.slice(0, lastUser);
}

function readThreadSessionEntry(key) {
  loadThreadStoreFromDisk();
  const entry = threadSessionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > THREAD_SESSION_MAX_AGE_MS) {
    threadSessionCache.delete(key);
    scheduleThreadStoreFlush();
    return null;
  }
  return entry;
}

function readThreadSession(key) {
  return readThreadSessionEntry(key)?.threadId ?? null;
}

function putThreadSession(key, threadId, flags = {}) {
  loadThreadStoreFromDisk();
  const prev = threadSessionCache.get(key);
  threadSessionCache.set(key, {
    threadId,
    ts: Date.now(),
    confirmed: flags.confirmed ?? prev?.confirmed ?? false,
    createAttempted: flags.createAttempted ?? prev?.createAttempted ?? false,
  });
  // Evict oldest if over cap
  if (threadSessionCache.size > THREAD_SESSION_MAX_ENTRIES) {
    let oldestKey = null;
    let oldestTs = Infinity;
    for (const [k, v] of threadSessionCache) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestKey = k;
      }
    }
    if (oldestKey) threadSessionCache.delete(oldestKey);
  }
  scheduleThreadStoreFlush();
}

/**
 * Root sticky key for web-provider continuity. Scope the root binding to the
 * caller namespace prepared by the executor (`caller:<cookieHash>|<spaceId>|wf:<id>`)
 * so normal prompts reuse one active Notion thread unless the client explicitly
 * pins a different `notion_thread_id` / `X-Notion-Thread-Id`.
 */
export function notionThreadRootKey(spaceKey, messages) {
  void messages;
  return spaceKey ? `root:space:${spaceKey}` : null;
}

/**
 * Resolve which Notion thread to use and whether to mint a new one.
 *
 * Continuity rules (order matters):
 * 1. Client-supplied thread id (body/header pin) → always follow-up.
 * 2. Exact conversation-prefix hash → multi-turn OpenAI history (most specific).
 * 3. Sticky root (first-user-message key):
 *    - Multi-turn history present → reuse (UREW-resilient when prefix hash misses).
 *    - First turn + createAttempted && !confirmed → error-retry stickiness.
 *    - First turn + confirmed → NEW session with the same opener text.
 * 4. Otherwise mint createThread:true and bind optimistically.
 */
export function resolveNotionThreadBinding(spaceKey, messages, clientThreadId) {
  loadThreadStoreFromDisk();
  const rootKey = notionThreadRootKey(spaceKey, messages);
  const hasHistory = conversationHasAssistant(messages);

  if (clientThreadId && clientThreadId.trim()) {
    const id = clientThreadId.trim();
    if (rootKey) putThreadSession(rootKey, id, { createAttempted: true });
    return { threadId: id, createThread: false, rootKey };
  }

  // Exact prefix match first (full history before last user) — most specific
  // multi-turn continuity.
  const prefix = conversationPrefixBeforeLastUser(messages);
  if (prefix.length > 0) {
    const exactId = readThreadSession(hashNotionConversation(spaceKey, prefix));
    if (exactId) {
      if (rootKey) putThreadSession(rootKey, exactId, { createAttempted: true, confirmed: true });
      return { threadId: exactId, createThread: false, rootKey };
    }
  }

  // Sticky root (first user turn hash) — UREW + error-retry continuity
  if (rootKey) {
    const sticky = readThreadSessionEntry(rootKey);
    if (sticky?.threadId) {
      // Multi-turn OpenAI history → continue the sticky Notion chat
      if (hasHistory) {
        putThreadSession(rootKey, sticky.threadId, {
          confirmed: sticky.confirmed,
          createAttempted: sticky.createAttempted,
        });
        return {
          threadId: sticky.threadId,
          createThread: false,
          rootKey,
        };
      }

      // First-turn error retry: keep the same threadId, do not create again.
      if (sticky.createAttempted && !sticky.confirmed) {
        putThreadSession(rootKey, sticky.threadId, {
          confirmed: false,
          createAttempted: true,
        });
        return {
          threadId: sticky.threadId,
          createThread: false,
          rootKey,
        };
      }

      // First-turn + confirmed sticky: a *new* client session that happens to
      // start with the same first user text. Fall through and mint — never fork.
      if (!sticky.createAttempted && !sticky.confirmed) {
        putThreadSession(rootKey, sticky.threadId, {
          confirmed: false,
          createAttempted: false,
        });
        return {
          threadId: sticky.threadId,
          createThread: true,
          rootKey,
        };
      }
    }
  }

  // Mint a new thread id and bind it immediately (optimistic) so concurrent /
  // failed retries reuse the same id instead of spam-creating Notion chats.
  const threadId = randomUUID();
  if (rootKey) {
    putThreadSession(rootKey, threadId, {
      createAttempted: false,
      confirmed: false,
    });
  }
  return { threadId, createThread: true, rootKey };
}

/** Mark that we sent createThread:true for this root (even if the body errored). */
export function notionThreadMarkCreateAttempted(rootKey, threadId) {
  if (!rootKey || !threadId) return;
  putThreadSession(rootKey, threadId, { createAttempted: true });
}

/** Mark successful inference on this thread. */
export function notionThreadMarkConfirmed(rootKey, threadId) {
  if (!rootKey || !threadId) return;
  putThreadSession(rootKey, threadId, { createAttempted: true, confirmed: true });
}

function conversationHasAssistant(messages) {
  return messages.some((m) => {
    const role = (m?.role || "").toLowerCase();
    return role === "assistant" || role === "ai" || role === "model";
  });
}

/** Lookup-only (does not mint). Used by tests and diagnostics. */
export function notionThreadSessionLookup(spaceId, messages) {
  loadThreadStoreFromDisk();
  const rootKey = notionThreadRootKey(spaceId, messages);
  if (rootKey) {
    const sticky = readThreadSession(rootKey);
    if (sticky) return sticky;
  }
  const prefix = conversationPrefixBeforeLastUser(messages);
  if (prefix.length === 0) return null;
  return readThreadSession(hashNotionConversation(spaceId, prefix));
}

/**
 * After a successful turn, remember threadId under the completed conversation
 * (request messages + this assistant reply) so the next OpenAI multi-turn request
 * whose prefix matches that history reuses the same Notion chat.
 */
export function notionThreadSessionStore(spaceId, messages, assistantText, threadId) {
  if (!threadId || !spaceId) return;
  const full = [...messages, { role: "assistant", content: assistantText }];
  putThreadSession(hashNotionConversation(spaceId, full), threadId, {
    confirmed: true,
    createAttempted: true,
  });

  // Root key for agent multi-turn clients that keep original user wording.
  const rootKey = notionThreadRootKey(spaceId, messages);
  if (rootKey) {
    putThreadSession(rootKey, threadId, { confirmed: true, createAttempted: true });
  }
  void assistantText;
}

/**
 * A Notion page/thread id is a UUID (32 hex chars, dashed or undashed). Reject
 * anything else so a client cannot pin/poison the session cache with an arbitrary
 * string (defense against cross-tenant thread-id injection — #7900 review).
 */
export function isValidNotionThreadId(id) {
  const t = id.trim().replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(t);
}

export function readClientThreadId(body, headers) {
  const fromBody =
    (typeof body.notion_thread_id === "string" && body.notion_thread_id.trim()) ||
    (typeof body.thread_id === "string" && body.thread_id.trim()) ||
    "";
  if (fromBody) return isValidNotionThreadId(fromBody) ? fromBody : "";
  if (!headers) return "";
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "x-notion-thread-id" && typeof v === "string" && v.trim()) {
      const h = v.trim();
      return isValidNotionThreadId(h) ? h : "";
    }
  }
  return "";
}

/**
 * Short SHA-256 prefix of a caller's Notion cookie, used to namespace the
 * thread-session cache PER CALLER (cross-tenant IDOR defense — #7900 review).
 * The raw cookie is never stored — only this non-reversible digest.
 */
export function hashNotionCallerCookie(cookie) {
  const raw = (cookie || "").trim();
  if (!raw) return "anon";
  // SHA-256 (128-bit prefix): this hash is a SECURITY boundary (per-caller cache
  // isolation), so it must be collision-resistant — a 32-bit space is
  // birthday-crackable. The raw cookie is never stored.
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
