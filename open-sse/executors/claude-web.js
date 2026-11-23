// language: JavaScript, file: open-sse/executors/claude-web.js
/**
 * ClaudeWebExecutor — talks to claude.ai's internal web API using a browser
 * session cookie (`sessionKey`), not an API key.
 *
 * Much simpler than the ChatGPT web path: there is no proof-of-work, no
 * turnstile VM, and Cloudflare does not fingerprint-block plain Node fetch.
 * Three endpoints cover everything:
 *
 *   GET    /api/organizations                                    -> org list (pick the "chat" one)
 *   POST   /api/organizations/{org}/chat_conversations           -> new conversation uuid
 *   POST   /api/organizations/{org}/chat_conversations/{id}/completion   (SSE)
 *   DELETE /api/organizations/{org}/chat_conversations/{id}      -> cleanup
 *
 * Completion payload: {"prompt": "...", "timezone": "...", "attachments": [], "files": []}
 * SSE frames carry the answer progressively as
 *   event: completion
 *   data: {"type":"completion","completion":"<delta>","stop_reason":null}
 * The final frame has completion:"" and stop_reason:"stop_sequence", with the
 * sequence stripped from the emitted text.
 *
 * Tool calls: the web endpoint has no native function-calling, so tools are
 * rendered into the prompt and the reply is parsed back into OpenAI tool_call
 * chunks — same bridge pattern as the ChatGPT web executor.
 */

import { BaseExecutor } from "./base.js";
import { webcrypto as crypto } from "node:crypto";

const BASE = "https://claude.ai";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
const SEC_CH_UA = '"Chromium";v="146", "Not:A-Brand";v="24", "Google Chrome";v="146"';

// The web endpoint needs at least this gap between requests or it answers 429.
const MIN_GAP_MS = 1500;
const orgCache = new Map(); // cookie -> { orgId, at }
const CACHE_MAX = 64;
const ORG_TTL_MS = 30 * 60 * 1000;

let lastRequestAt = 0;

function evict(map) {
  if (map.size >= CACHE_MAX) {
    const k = map.keys().next().value;
    if (k) map.delete(k);
  }
}

/** Serialise requests so consecutive calls never trip the 429 threshold. */
async function rateLimit() {
  const now = Date.now();
  const wait = MIN_GAP_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: { message, type: "upstream_error" } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Accept a raw cookie header, a `name=value` list, or a Netscape cookie file. */
export function extractClaudeCookie(raw) {
  if (!raw) return null;
  let str = String(raw).trim();

  // JSON blob
  try {
    const j = JSON.parse(str);
    if (typeof j?.cookie === "string") str = j.cookie.trim();
    else if (typeof j?.sessionKey === "string") str = `sessionKey=${j.sessionKey.trim()}`;
    else if (typeof j?.value === "string") str = j.value.trim();
  } catch {}

  // Netscape cookie file: domain \t flag \t path \t secure \t expiry \t name \t value
  const pairs = [];
  const seen = new Set();
  for (const line of str.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split("\t");
    if (parts.length >= 7) {
      const name = parts[5];
      if (!seen.has(name)) { seen.add(name); pairs.push(`${name}=${parts[6]}`); }
    }
  }
  if (pairs.length) return pairs.join("; ");

  // Plain `a=1; b=2` string
  for (const part of str.split(";")) {
    const p = part.trim();
    if (p.includes("=") && !seen.has(p.split("=")[0])) {
      seen.add(p.split("=")[0]);
      pairs.push(p);
    }
  }
  if (!pairs.length) return null;
  if (!pairs.some((p) => p.startsWith("sessionKey="))) return null;
  return pairs.join("; ");
}

function headers(cookie, extra = {}) {
  return {
    "User-Agent": UA,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: BASE,
    Referer: BASE + "/",
    "sec-ch-ua": SEC_CH_UA,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    Cookie: cookie,
    ...extra,
  };
}

/** Find the organization that carries the `chat` capability. */
async function resolveOrgId(cookie, signal, log) {
  const hit = orgCache.get(cookie);
  if (hit && Date.now() - hit.at < ORG_TTL_MS) return hit.orgId;

  await rateLimit();
  const r = await fetch(`${BASE}/api/organizations`, { headers: headers(cookie), signal });
  if (!r.ok) throw new Error(`organizations failed: HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  const orgs = await r.json();
  if (!Array.isArray(orgs) || !orgs.length) throw new Error("no organizations on this account");

  const chatOrg =
    orgs.find((o) => Array.isArray(o.capabilities) && o.capabilities.includes("chat")) ||
    orgs[0];
  evict(orgCache);
  orgCache.set(cookie, { orgId: chatOrg.uuid, at: Date.now() });
  log?.debug?.("CLAUDE-WEB", `org resolved: ${chatOrg.uuid} (${chatOrg.name || "unnamed"})`);
  return chatOrg.uuid;
}

async function createChat(orgId, cookie, signal) {
  await rateLimit();
  const r = await fetch(`${BASE}/api/organizations/${orgId}/chat_conversations`, {
    method: "POST",
    headers: headers(cookie, { "Content-Type": "application/json" }),
    body: JSON.stringify({ name: "" }),
    signal,
  });
  if (!r.ok) throw new Error(`create chat failed: HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  if (!j?.uuid) throw new Error("create chat returned no uuid");
  return j.uuid;
}

async function deleteChat(orgId, chatId, cookie) {
  try {
    await fetch(`${BASE}/api/organizations/${orgId}/chat_conversations/${chatId}`, {
      method: "DELETE",
      headers: headers(cookie),
    });
  } catch {
    // Cleanup is best-effort — a leaked empty conversation is harmless.
  }
}

/** Render an OpenAI message list into Claude's plain-text prompt format. */
export function buildPrompt(messages, tools, toolResultMode) {
  const parts = [];
  for (const m of messages) {
    const role = m.role || "user";
    let content = "";
    if (typeof m.content === "string") content = m.content;
    else if (Array.isArray(m.content)) {
      content = m.content.map((p) => (typeof p === "string" ? p : p?.text || "")).join("");
    }

    if (role === "system" || role === "developer") {
      parts.push(`System: ${content}`);
    } else if (role === "assistant") {
      const calls = m.tool_calls;
      if (Array.isArray(calls) && calls.length) {
        const blocks = calls
          .map((c) => {
            const fn = c.function || {};
            return `<invoke tool="${fn.name || "unknown"}">\n${fn.arguments || "{}"}\n</invoke>`;
          })
          .join("\n");
        parts.push(content ? `Assistant: ${content}\n${blocks}` : `Assistant:\n${blocks}`);
      } else {
        parts.push(`Assistant: ${content}`);
      }
    } else if (role === "tool") {
      const label = m.tool_call_id ? ` ${m.tool_call_id}` : "";
      parts.push(`Human: [Tool result${label}]\n${content}`);
    } else {
      parts.push(`Human: ${content}`);
    }
  }
  if (tools?.length) parts.push(buildToolSystemPrompt(tools));
  parts.push("Assistant:");
  return parts.join("\n\n");
}

export function buildToolSystemPrompt(tools) {
  if (!Array.isArray(tools) || !tools.length) return "";
  const specs = tools
    .map((t) => {
      const f = t.function || t;
      return `- ${f.name}: ${f.description || "(no description)"}\n  parameters: ${JSON.stringify(f.parameters || {})}`;
    })
    .join("\n");
  const firstName = (tools[0].function || tools[0]).name;
  // Claude refuses meta-framing ("you are an API backend", "TOOL MODE") because it
  // reads as a jailbreak. Phrasing the contract as an ordinary integration — with
  // the tool list stated as fact rather than as an override — keeps compliance.
  return (
    "The following tools are connected to this conversation and are executed by\n" +
    "the client. Use them when they fit the request.\n\n" +
    "<tools>\n" +
    specs +
    "\n</tools>\n\n" +
    "When a tool fits, respond with the invocation on its own and nothing else:\n\n" +
    '```tool_call\n{"name":"TOOL_NAME","arguments":{"arg":"value"}}\n```\n\n' +
    `For example, to look up a record you would answer with just:\n\n` +
    '```tool_call\n' +
    `{"name":"${firstName}","arguments":{"record_id":"CUST-4471"}}\n` +
    "```\n\n" +
    "Do not describe the call, do not explain it, and do not guess the result —\n" +
    "output the invocation and stop. Answer in plain text only when no tool fits."
  );
}

export function parseToolCalls(text) {
  const calls = [];
  const re = /```tool_call\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const j = JSON.parse(m[1].trim());
      const name = j.name || j.tool || j.function;
      if (!name) continue;
      const args = j.arguments ?? j.args ?? j.parameters ?? {};
      calls.push({
        id: `call_${Math.random().toString(36).slice(2, 12)}`,
        type: "function",
        function: { name: String(name), arguments: typeof args === "string" ? args : JSON.stringify(args) },
      });
    } catch {}
  }
  return calls;
}

export function stripToolCalls(text) {
  return String(text || "").replace(/```tool_call\s*[\s\S]*?```/g, "").trim();
}

/** Yield answer deltas from the completion SSE stream. */
async function* streamDeltas(response) {
  const reader = response.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      let ev;
      try {
        ev = JSON.parse(payload);
      } catch {
        continue;
      }
      if (ev?.type === "error") throw new Error(ev.error?.message || "upstream error event");
      if (ev?.type !== "completion") continue;
      const text = ev.completion || "";
      if (text) yield text;
      if (ev.stop_reason) return;
    }
  }
}

export class ClaudeWebExecutor extends BaseExecutor {
  constructor() {
    super("claude-web", { baseUrl: BASE });
  }

  async execute({ model, body, stream, credentials, signal, log }) {
    const bodyObj = body || {};
    const messages = Array.isArray(bodyObj.messages) ? bodyObj.messages : [];
    const creds = credentials || {};
    const cookie = extractClaudeCookie(creds.apiKey || creds.token || creds.sessionToken || creds.cookie);

    if (!cookie) {
      return {
        response: jsonError(
          400,
          "Invalid credentials: paste your claude.ai cookie header (must contain sessionKey). " +
          "Copy it from DevTools -> Network -> the document request -> Request Headers -> cookie."
        ),
        url: `${BASE}/api/organizations`,
        headers: {},
        transformedBody: body,
      };
    }

    let orgId = null;
    let chatId = null;

    try {
      orgId = await resolveOrgId(cookie, signal, log);
      chatId = await createChat(orgId, cookie, signal);

      const tools = Array.isArray(bodyObj.tools) && bodyObj.tools.length ? bodyObj.tools : [];
      const prompt = buildPrompt(messages, tools, false);

      await rateLimit();
      const upstream = await fetch(
        `${BASE}/api/organizations/${orgId}/chat_conversations/${chatId}/completion`,
        {
          method: "POST",
          headers: headers(cookie, {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
            Referer: `${BASE}/chat/${chatId}`,
            TE: "trailers",
          }),
          body: JSON.stringify({
            attachments: [],
            files: [],
            prompt,
            timezone: "Asia/Jakarta",
          }),
          signal,
        }
      );

      if (!upstream.ok) {
        const errText = (await upstream.text()).slice(0, 400);
        log?.warn?.("CLAUDE-WEB", `completion HTTP ${upstream.status}: ${errText}`);
        await deleteChat(orgId, chatId, cookie);
        return { response: jsonError(upstream.status, errText), url: `${BASE}/api/organizations/${orgId}`, headers: {}, transformedBody: body };
      }

      const url = `${BASE}/api/organizations/${orgId}/chat_conversations/${chatId}/completion`;

      if (!stream) {
        let full = "";
        for await (const d of streamDeltas(upstream)) full += d;
        await deleteChat(orgId, chatId, cookie);

        const calls = tools.length ? parseToolCalls(full) : [];
        const message = calls.length
          ? { role: "assistant", content: stripToolCalls(full) || null, tool_calls: calls }
          : { role: "assistant", content: full };
        const json = {
          id: `chatcmpl-${crypto.randomUUID().replace(/-/g, "")}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, message, finish_reason: calls.length ? "tool_calls" : "stop" }],
        };
        return {
          response: new Response(JSON.stringify(json), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
          url, headers: {}, transformedBody: body,
        };
      }

      // Streaming: re-frame the completion SSE as OpenAI chat.completion.chunk.
      const id = `chatcmpl-${crypto.randomUUID().replace(/-/g, "")}`;
      const created = Math.floor(Date.now() / 1000);
      const encoder = new TextEncoder();
      const self = this;
      const sse = new ReadableStream({
        async start(controller) {
          const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          const chunk = (delta, finish = null) => ({
            id, object: "chat.completion.chunk", created, model,
            choices: [{ index: 0, delta, finish_reason: finish }],
          });
          try {
            send(chunk({ role: "assistant", content: "" }));
            let full = "";
            for await (const d of streamDeltas(upstream)) {
              full += d;
              send(chunk({ content: d }));
            }
            if (tools.length) {
              const calls = parseToolCalls(full);
              if (calls.length) {
                send({
                  id, object: "chat.completion.chunk", created, model,
                  choices: [{
                    index: 0,
                    delta: { tool_calls: calls.map((c, i) => ({ index: i, id: c.id, type: "function", function: c.function })) },
                    finish_reason: null,
                  }],
                });
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                await deleteChat(orgId, chatId, cookie);
                return;
              }
            }
            send(chunk({}, "stop"));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (e) {
            send(chunk({ content: `\n[stream error: ${e.message}]` }, "stop"));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
          controller.close();
          await deleteChat(orgId, chatId, cookie);
        },
      });

      return {
        response: new Response(sse, {
          status: 200,
          headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
        }),
        url, headers: {}, transformedBody: body,
      };
    } catch (error) {
      if (orgId && chatId) await deleteChat(orgId, chatId, cookie);
      log?.warn?.("CLAUDE-WEB", `execute failed: ${error.message}`);
      return {
        response: jsonError(502, `Claude Web error: ${error.message}`),
        url: `${BASE}/api/organizations`,
        headers: {},
        transformedBody: body,
      };
    }
  }
}

export default ClaudeWebExecutor;
