// Who made an API key, and which keys a session may see, in one dependency-free place.
//
// Two dashboard pages list API keys (the endpoint page and the per-key usage page)
// and three routes gate access to them. They used to answer "which keys can this
// session see" and "what does the creator label say" separately, and they drifted:
// the usage page showed an API key session only its own key while the endpoint
// page also showed the keys it had handed out, so a key that created a key saw
// the child on one page and not on the other. The same wording for the creator
// then had to be kept in step by hand.
//
// No imports, so keyCreatorSelfCheck.mjs can run this under plain node.

/**
 * The creator marker for a key made from a password/OIDC/SAML dashboard session,
 * which is a person rather than another key. Kept as a literal because it is
 * already stored in existing rows and in exported backups.
 */
export const DASHBOARD_CREATOR = "dashboard";

/**
 * Which keys a session may list. An API key session sees its own key plus every
 * key it handed out itself; keys it cannot reach stay hidden, so a scoped
 * session never reads another branch's names or numbers.
 */
export function visibleApiKeys(allKeys, session) {
  if (!Array.isArray(allKeys)) return [];
  if (!session || session.role !== "apikey") return allKeys;
  return allKeys.filter(
    (k) => k && (k.key === session.apiKey || k.createdBy === session.apiKey)
  );
}

/**
 * Whether a session created this key, which is what the edit and delete routes
 * check before letting an API key session touch it. An admin session owns
 * everything except the keys that name a key as their creator.
 */
export function sessionCreatedKey(session, key) {
  if (!key) return false;
  if (!session || session.role !== "apikey") return true;
  return key.createdBy === session.apiKey;
}

/**
 * The creator label for one key: the name of the API key that made it, so a
 * chain of keys is readable instead of a row of identical "Created by API key".
 * `createdBy` holds the creator's raw key, but a key id is accepted too so a row
 * keeps resolving if the stored form ever changes.
 */
export function creatorLabelFor({ createdBy, keys = [], selfId = null } = {}) {
  const by = typeof createdBy === "string" ? createdBy.trim() : "";
  if (!by) return "";
  if (by === DASHBOARD_CREATOR) return "Created by dashboard";
  const parent = (keys || []).find(
    (k) => k && k.id !== selfId && (k.key === by || k.id === by)
  );
  if (parent) return `Created by ${parent.name || "API key"}`;
  // The creator is gone (deleted key, or a row from a restore). Say so rather
  // than implying the dashboard did it.
  return "Created by deleted API key";
}

/** Maps createdBy to the creator key's name, for payloads that never ship keys. */
export function creatorNameFor({ createdBy, keys = [] } = {}) {
  const by = typeof createdBy === "string" ? createdBy.trim() : "";
  if (!by || by === DASHBOARD_CREATOR) return "";
  const parent = (keys || []).find((k) => k && (k.key === by || k.id === by));
  return parent?.name || "";
}
