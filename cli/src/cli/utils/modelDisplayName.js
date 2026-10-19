/**
 * Human-readable display names for routed models.
 *
 * The CLI package is standalone CommonJS and cannot import
 * `src/shared/utils/modelDisplayName.js` (ESM, dashboard app), so this file is
 * the CLI's copy of the same rules. Keep the two in sync: the dashboard and the
 * CLI must write identical model names into a client's config, otherwise
 * `9router connect` and the dashboard's "Apply" produce different files.
 *
 *   modelDisplayName("claude-opus-5-5")  -> "Claude Opus 5.5"
 *   modelDisplayName("gpt-6.1-sol")      -> "GPT-6.1 Sol"
 */

/** Canonical casing for tokens that plain title-casing would get wrong. */
const BRAND_TOKENS = {
  ai: "AI",
  claude: "Claude",
  deepseek: "DeepSeek",
  gemma: "Gemma",
  gemini: "Gemini",
  glm: "GLM",
  gpt: "GPT",
  grok: "Grok",
  hf: "HF",
  kimi: "Kimi",
  llama: "Llama",
  mimo: "MiMo",
  mistral: "Mistral",
  mixtral: "Mixtral",
  moonshot: "Moonshot",
  nova: "Nova",
  oss: "OSS",
  phi: "Phi",
  qwen: "Qwen",
  stt: "STT",
  tts: "TTS",
  vl: "VL",
};

/**
 * Brands whose version number is glued on with a dash ("gpt-6.1-sol" -> "GPT-6.1 Sol").
 * Every other family separates it with a space ("Claude Opus 5.5", "GLM 5.3 Flash").
 */
const DASH_VERSION_BRANDS = new Set(["gpt"]);

/** Release-date stamps at the end of ids ("claude-3-5-sonnet-20241022"). */
const DATE_TOKEN = /^(19|20)\d{6}$/;

/** "v4.1" / "V2.6" — an explicit version marker. */
const VERSION_MARKER = /^v\d+([.\d]*)$/i;

/** Digits left over after the brand prefix ("qwen3.8" -> "qwen" + "3.8"). */
const BRANDED_VERSION = /^([A-Za-z]+)(\d[.\d]*)$/;

const capitalize = (token) => token.charAt(0).toUpperCase() + token.slice(1);

/** Last path segment: "cmc/deepseek/deepseek-v4.1-flash" -> "deepseek-v4.1-flash". */
const leafOf = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
};

function modelDisplayName(idOrSlug) {
  const leaf = leafOf(idOrSlug);
  if (!leaf) return "";

  const rawTokens = leaf.split(/[-_\s]+/).filter(Boolean);

  const tokens = [];
  for (let i = 0; i < rawTokens.length; i += 1) {
    const token = rawTokens[i];
    if (DATE_TOKEN.test(token)) continue;
    let merged = token;
    while (/^\d+$/.test(merged) && /^\d+$/.test(rawTokens[i + 1] || "") && !DATE_TOKEN.test(rawTokens[i + 1])) {
      i += 1;
      merged = `${merged}.${rawTokens[i]}`;
    }
    tokens.push(merged);
  }
  if (tokens.length === 0) return leaf;

  let out = "";
  let dashVersion = false;
  for (const token of tokens) {
    const lower = token.toLowerCase();
    const brand = BRAND_TOKENS[lower];

    if (!brand) {
      const branded = token.match(BRANDED_VERSION);
      const brandedName = branded ? BRAND_TOKENS[branded[1].toLowerCase()] : null;
      if (brandedName) {
        out = out ? `${out} ${brandedName}` : brandedName;
        out += DASH_VERSION_BRANDS.has(branded[1].toLowerCase()) ? `-${branded[2]}` : ` ${branded[2]}`;
        dashVersion = false;
        continue;
      }
    }

    let rendered;
    if (brand) {
      rendered = brand;
    } else if (VERSION_MARKER.test(token)) {
      rendered = capitalize(token);
    } else if (/^\d/.test(token)) {
      rendered = token.toUpperCase();
    } else {
      rendered = capitalize(token);
    }

    const versionish = /^\d/.test(token) || VERSION_MARKER.test(token);
    if (!out) {
      out = rendered;
    } else {
      out += dashVersion && versionish ? `-${rendered}` : ` ${rendered}`;
    }
    dashVersion = Boolean(brand) && DASH_VERSION_BRANDS.has(lower);
  }

  return out || leaf;
}

function resolveModelDisplayName(idOrSlug, explicitName) {
  const id = typeof idOrSlug === "string" ? idOrSlug.trim() : "";
  const name = typeof explicitName === "string" ? explicitName.trim() : "";
  // With no id to compare against, the name is the only thing to derive from:
  // a raw slug there still gets humanized, and an already-human name round-trips.
  if (id && name && name !== id) return name;
  return modelDisplayName(id || name);
}

module.exports = { modelDisplayName, resolveModelDisplayName };
