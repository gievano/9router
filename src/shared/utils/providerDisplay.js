// A compatible provider node is stored under a generated id such as
// `openai-compatible-chat-b5bca155-fc33-4899-a868-2ff3d7891e3c`. That id is a
// database key, never a label: it turns up as a group heading in the model
// picker whenever a node record is not at hand to name the group.
//
// The picker resolves names from two sources that do not always agree - the
// static provider registry and the node list fetched from /api/provider-nodes -
// so this module is the one place that decides what a provider is called, and
// what happens when neither source knows it.

const COMPAT_API_TYPES = new Set(["chat", "responses"]);

const COMPAT_FAMILY = {
  openai: "OpenAI Compatible",
  anthropic: "Anthropic Compatible",
  custom: "Custom Compatible",
};

/**
 * Readable label for a compatible provider id, or "" when the id is not one.
 * Callers use the empty string to fall through to their own default.
 *
 * The uuid is deliberately dropped: a label is what the user reads, and
 * `openai-compatible-chat-330688af` in any casing - full id or `(330688af)`
 * suffix - is still the database key, not a name. Distinct nodes that would
 * collide on the same label are told apart by `dedupeLabels`, not by printing
 * part of their id.
 */
export function humanizeCompatId(providerId) {
  if (typeof providerId !== "string" || !providerId) return "";
  const words = providerId.split("-").filter(Boolean);
  if (words.length < 3) return "";
  // The id is `<family>-compatible-<apiType>-<uuid>`, so the api type is the
  // word after "compatible", not the second word.
  const compatibleAt = words.findIndex((w) => w.toLowerCase() === "compatible");
  if (compatibleAt === -1) return "";
  const apiType = (words[compatibleAt + 1] || "").toLowerCase();
  const familyLabel = COMPAT_FAMILY[(words[0] || "").toLowerCase()] || "";
  if (!COMPAT_API_TYPES.has(apiType)) {
    // An api type we have never seen still gets its family name: printing the
    // id is worse than printing a slightly generic label.
    return familyLabel || "Compatible provider";
  }
  return familyLabel || "Compatible provider";
}

/**
 * Map provider id -> label with a numeric suffix for every collision.
 *
 * `pairs` is a list of `{ id, label }` in the order the caller wants them
 * numbered. Only colliding labels are numbered (`OpenAI Compatible`,
 * `OpenAI Compatible 2`), so the common single-node case stays clean.
 */
export function dedupeLabels(pairs) {
  const counts = new Map();
  for (const { label } of pairs) counts.set(label, (counts.get(label) || 0) + 1);
  const seen = new Map();
  const out = new Map();
  for (const { id, label } of pairs) {
    if (!counts.get(label) || counts.get(label) === 1) {
      out.set(id, label);
      continue;
    }
    const n = (seen.get(label) || 0) + 1;
    seen.set(label, n);
    out.set(id, `${label} ${n}`);
  }
  return out;
}

/**
 * Label for a provider id, never the id itself.
 *
 * `node` and `connection` are the records carrying a user-chosen name; the
 * static registry entry is next; a compatible id that reached all the way here
 * is named by its family plus a short disambiguator. A non-compatible id we know
 * nothing about is returned unchanged, because a plain alias like `deepseek` is
 * already a label.
 */
export function resolveProviderName(providerId, { node, connection, registry } = {}) {
  const chosen = node?.name || connection?.name || registry?.name;
  if (chosen && chosen !== providerId) return chosen;
  return humanizeCompatId(providerId) || chosen || "";
}

/**
 * Which existing group already speaks for `providerAlias`, or null when the
 * alias needs a group of its own.
 *
 * A custom model records the node id, but a compatible group is keyed by that
 * same id while storing the node prefix as its display alias. Matching on the
 * alias alone therefore never matches, and the model opens a second group under
 * a raw generated id. The id has to be tried as well.
 */
export function findOwningGroupId(groups, aliasIndex, providerAlias) {
  if (typeof providerAlias !== "string" || !providerAlias) return null;
  const byAlias = aliasIndex?.get?.(providerAlias.toLowerCase());
  if (byAlias && groups[byAlias]) return byAlias;
  if (Object.prototype.hasOwnProperty.call(groups, providerAlias)) return providerAlias;
  return null;
}
