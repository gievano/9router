const PSID_NAME = "__Secure-1PSID";
const PSIDTS_NAME = "__Secure-1PSIDTS";

function stripQuotes(value) {
  return String(value ?? "").replace(/^["']+/, "").replace(/["']+$/, "").trim();
}

function stripWrapper(raw) {
  let text = String(raw ?? "").trim();
  if (/^cookie\s*:/i.test(text)) text = text.replace(/^cookie\s*:/i, "").trim();
  if (text.length > 1) {
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      text = text.slice(1, -1).trim();
    }
  }
  return text;
}

function isNamedPair(pair) {
  const eq = pair.indexOf("=");
  return eq > 0;
}

/**
 * Split a pasted Google cookie into the two values the dashboard asks for.
 *
 * `extra` keeps every other pair the paste carried (`SAPISID`, `__Secure-3PSID`,
 * …). The executor signs `Authorization` from SAPISID, so recomposing the cookie
 * from just PSID + PSIDTS would silently drop a stronger credential than the one
 * being edited.
 */
export function splitGeminiCookie(raw) {
  const text = stripWrapper(raw);
  const out = { psid: "", psidts: "", extra: "" };
  if (!text) return out;

  if (!text.includes("=")) {
    out.psid = stripQuotes(text);
    return out;
  }

  const extras = [];
  for (const chunk of text.split(";")) {
    const pair = chunk.trim();
    if (!pair || !isNamedPair(pair)) {
      if (pair) extras.push(pair);
      continue;
    }
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq).trim().toLowerCase();
    const value = stripQuotes(pair.slice(eq + 1));
    if (name === PSID_NAME.toLowerCase()) out.psid = value;
    else if (name === PSIDTS_NAME.toLowerCase()) out.psidts = value;
    else extras.push(`${pair.slice(0, eq).trim()}=${value}`);
  }

  out.extra = extras.join("; ");
  return out;
}

/** Build the cookie header the executor expects: PSID first, PSIDTS optional. */
export function composeGeminiCookie({ psid = "", psidts = "", extra = "" } = {}) {
  const parts = [];
  const cleanPsid = stripQuotes(psid);
  const cleanPsidts = stripQuotes(psidts);
  if (cleanPsid) parts.push(`${PSID_NAME}=${cleanPsid}`);
  if (cleanPsidts) parts.push(`${PSIDTS_NAME}=${cleanPsidts}`);
  const rest = String(extra || "").trim();
  if (rest) parts.push(rest);
  return parts.join("; ");
}

/**
 * Rewrite only the named parts of a stored cookie.
 *
 * `undefined` / `""` means "keep what is stored" — the edit form cannot read the
 * secret back, so a blank field must not wipe a working session. `null` removes
 * PSIDTS, which is the only way to express "I want to drop the timestamp".
 */
export function mergeGeminiCookie(existing, { psid, psidts } = {}) {
  const pairs = [];
  for (const chunk of stripWrapper(existing).split(";")) {
    const pair = chunk.trim();
    if (pair) pairs.push(pair);
  }

  const setNamed = (name, value, { remove = false } = {}) => {
    const lower = name.toLowerCase();
    const idx = pairs.findIndex((pair) => {
      const eq = pair.indexOf("=");
      return eq > 0 && pair.slice(0, eq).trim().toLowerCase() === lower;
    });
    if (remove) {
      if (idx !== -1) pairs.splice(idx, 1);
      return;
    }
    const clean = stripQuotes(value);
    if (!clean) return;
    const pair = `${name}=${clean}`;
    if (idx === -1) pairs.push(pair);
    else pairs[idx] = pair;
  };

  if (psid === null) setNamed(PSID_NAME, "", { remove: true });
  else if (psid !== undefined) setNamed(PSID_NAME, psid);
  if (psidts === null) setNamed(PSIDTS_NAME, "", { remove: true });
  else if (psidts !== undefined) setNamed(PSIDTS_NAME, psidts);

  return pairs.join("; ");
}

/**
 * Decide what to persist when an edit submits a cookie.
 *
 * A paste that carries its own PSID is a wholesale replacement; a PSIDTS-only entry is a
 * timestamp refresh and must keep the stored PSID, otherwise saving "only the timestamp"
 * would write a cookie that cannot authenticate at all.
 */
export function resolveGeminiCookieUpdate(stored, incoming) {
  const next = splitGeminiCookie(incoming);
  if (next.psid) {
    return composeGeminiCookie({ psid: next.psid, psidts: next.psidts, extra: next.extra });
  }
  const current = splitGeminiCookie(stored);
  return composeGeminiCookie({
    psid: current.psid,
    psidts: next.psidts || current.psidts,
    extra: next.extra || current.extra,
  });
}
