import * as crypto from "node:crypto";
import * as os from "node:os";
import { DefaultExecutor } from "./default.js";
import { PROVIDERS } from "../config/providers.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

/**
 * Mimocode — free-tier Xiaomi MiMo via bootstrap JWT auth (no API key).
 *
 * Flow (from the official MiMo-Code repo):
 *   1. Generate a device fingerprint from hostname + OS + arch + CPU + username
 *   2. POST /api/free-ai/bootstrap with the fingerprint → JWT
 *   3. Use the JWT as Bearer for chat on the custom endpoint
 *      /api/free-ai/openai/chat (not /v1/chat/completions), with the
 *      X-Mimo-Source header.
 *
 * Only `mimo-auto` is supported (1M context, 128K output). This is a
 * simplified single-account port of OmniRoute's MimocodeExecutor: the JWT is
 * cached (re-bootstrapped on 401/403) instead of maintaining a multi-account
 * round-robin pool.
 *
 * The upstream `/api/free-ai/openai/chat` returns 403 "Illegal access" unless
 * the body carries a recognized MiMoCode prompt signature as a substring of a
 * system message — we inject the canonical CLI opener (byte-for-byte).
 */

const BOOTSTRAP_PATH = "/api/free-ai/bootstrap";
const CHAT_PATH = "/api/free-ai/openai/chat";
const JWT_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const BOOTSTRAP_TIMEOUT_MS = 15_000;

const MIMO_SOURCE = "mimocode-cli-free";

export const MIMO_SYSTEM_MARKER =
  "You are MiMoCode, an interactive CLI tool that helps users with software engineering tasks.";

export function generateFingerprint() {
  let username = "unknown-user";
  try {
    username = os.userInfo().username;
  } catch {
    // ignore
  }
  let cpu = "unknown-cpu";
  try {
    const cpus = os.cpus();
    if (cpus.length > 0 && cpus[0].model) cpu = cpus[0].model.trim();
  } catch {
    // ignore
  }
  return crypto
    .createHash("sha256")
    .update(`${os.hostname()}|${os.platform()}|${os.arch()}|${cpu}|${username}`)
    .digest("hex");
}

function parseJwtExp(jwt) {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return Date.now() + 50 * 60 * 1000;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return (payload.exp ?? Math.floor(Date.now() / 1000) + 3000) * 1000;
  } catch {
    return Date.now() + 50 * 60 * 1000;
  }
}

function injectSystemMarker(body) {
  if (!body || typeof body !== "object") return body;
  const messages = body.messages;
  if (!Array.isArray(messages)) return body;
  const hasMarker = messages.some(
    (m) =>
      m && typeof m === "object" &&
      m.role === "system" && typeof m.content === "string" &&
      m.content.includes(MIMO_SYSTEM_MARKER)
  );
  if (hasMarker) return body;
  return { ...body, messages: [{ role: "system", content: MIMO_SYSTEM_MARKER }, ...messages] };
}

export class MimocodeExecutor extends DefaultExecutor {
  constructor(provider = "mimocode") {
    super(provider, PROVIDERS[provider] || PROVIDERS.openai);
    this.fingerprint = generateFingerprint();
    this.jwt = null;
    this.jwtExpiresAt = 0;
    this.bootstrapInflight = null;
  }

  async ensureJwt(proxyOptions) {
    if (this.jwt && this.jwtExpiresAt - Date.now() > JWT_REFRESH_BUFFER_MS) return this.jwt;
    if (this.bootstrapInflight) return this.bootstrapInflight;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("mimocode bootstrap timeout")), BOOTSTRAP_TIMEOUT_MS);
    this.bootstrapInflight = (async () => {
      try {
        const resp = await proxyAwareFetch(
          `${this.config.baseUrl}${BOOTSTRAP_PATH}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client: this.fingerprint }),
            signal: controller.signal,
          },
          proxyOptions
        );
        if (!resp.ok) {
          const bodyText = await resp.text().catch(() => "");
          throw new Error(`Bootstrap failed: ${resp.status} ${bodyText.slice(0, 200)}`);
        }
        const data = await resp.json().catch(() => ({}));
        if (!data.jwt) throw new Error("Bootstrap response missing jwt field");
        this.jwt = data.jwt;
        this.jwtExpiresAt = parseJwtExp(data.jwt);
        return this.jwt;
      } finally {
        clearTimeout(timer);
        this.bootstrapInflight = null;
      }
    })();
    return this.bootstrapInflight;
  }

  async execute(input) {
    const { body, signal, log, proxyOptions } = input;
    const baseUrl = input.credentials?.providerSpecificData?.baseUrl || this.config.baseUrl;
    const chatUrl = `${baseUrl}${CHAT_PATH}`;
    const model = body?.model || input.model || "mimo-auto";
    const chatBody = injectSystemMarker({ ...body, model });

    let jwt = await this.ensureJwt(proxyOptions);

    const doFetch = async (token) => proxyAwareFetch(
      chatUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mimo-Source": MIMO_SOURCE,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(chatBody),
        signal,
      },
      proxyOptions
    );

    let upstream = await doFetch(jwt);

    // JWT expired/revoked → re-bootstrap once and retry.
    if (upstream.status === 401 || upstream.status === 403) {
      this.jwt = null;
      this.jwtExpiresAt = 0;
      log?.debug?.("MIMOCODE", `JWT rejected (${upstream.status}), re-bootstrapping…`);
      jwt = await this.ensureJwt(proxyOptions);
      upstream = await doFetch(jwt);
    }

    return { response: upstream, url: chatUrl, headers: {}, transformedBody: chatBody };
  }
}

export default MimocodeExecutor;
