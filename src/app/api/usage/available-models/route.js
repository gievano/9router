import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/dashboardPermissions";
import { filterModelsByAllowedModels, worstModelStatus } from "@/lib/usage/availableModels.js";
import { AI_MODELS } from "@/shared/constants/config";
import { FREE_PROVIDERS, getProviderAlias, resolveProviderId } from "@/shared/constants/providers";
import { getDisabledModels } from "@/lib/disabledModelsDb";
import { getCapabilitiesForModel } from "open-sse/providers/capabilities.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { CUSTOM_PLUGIN_KEYS } from "@/shared/constants/models";

export const dynamic = "force-dynamic";

function isDisabled(disabled, provider, model) {
  const alias = getProviderAlias(provider) || provider;
  const list = disabled[alias] || disabled[provider] || [];
  return Array.isArray(list) && list.includes(model);
}

// Plugin marks for a row.
//
// /api/models marks a model by setting flags on its caps, but this route builds
// its own rows and had no plugin logic at all, so the Usage and API-key views
// showed nothing even for a model with a plugin clearly active. The same rules
// are applied here from the same stored settings, keyed by every shape a row can
// be addressed by (its full id, the routed id, the bare id, and the combo name).
async function pluginMarkResolver() {
  const settings = await getSettings().catch(() => ({}));
  const plugins = settings?.customPlugins || {};
  const sources = CUSTOM_PLUGIN_KEYS.map((key) => [
    key,
    Boolean(plugins[key]?.enabled),
    new Set(plugins[key]?.models || []),
  ]).filter(([, enabled]) => enabled);

  if (!sources.length) return () => [];

  return (ids) => {
    const candidates = ids.filter(Boolean).map(String);
    return sources
      .filter(([, , models]) => candidates.some((id) => models.has(id)))
      .map(([key]) => key);
  };
}

// A connection locked for every model it serves reports "__all"; anything
// else names the bare model id after `modelLock_`.
function activeLocks(connection) {
  const now = Date.now();
  const out = [];
  for (const [key, value] of Object.entries(connection || {})) {
    if (!key.startsWith("modelLock_") || !value) continue;
    if (new Date(value).getTime() <= now) continue;
    out.push(key.slice("modelLock_".length) || "__all");
  }
  return out;
}

// GET /api/usage/available-models — read-only catalog for the signing-in key.
// A key session that holds only viewUsage cannot open /api/models or
// /api/combos, so this endpoint rebuilds that same catalog server side and
// narrows it to the session's allowedModels before answering. No writes.
export async function GET() {
  try {
    const ctx = await getSessionContext();
    if (!ctx.session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allowedModelsRaw = ctx.allowedModels || "*";
    const isApiKey = ctx.session.role === "apikey";

    const [modelAliases, disabled, customModels, combos, connections, studioModels] = await Promise.all([
      import("@/models").then((m) => m.getModelAliases().catch(() => ({}))),
      getDisabledModels().catch(() => ({})),
      import("@/lib/localDb").then((m) => m.getCustomModels().catch(() => [])),
      import("@/lib/localDb").then((m) => m.getCombos().catch(() => [])),
      import("@/lib/localDb").then((m) => m.getProviderConnections().catch(() => [])),
      import("@/lib/db/repos/modelEditorRepo.js").then((m) => m.getStudioModels().catch(() => [])),
    ]);

    const entries = [];

    for (const m of AI_MODELS || []) {
      if (!m?.provider || !m?.model) continue;
      if (isDisabled(disabled, m.provider, m.model)) continue;
      const fullModel = `${m.provider}/${m.model}`;
      const providerAlias = getProviderAlias(m.provider) || m.provider;
      entries.push({
        name: m.name || m.model,
        model: m.model,
        provider: providerAlias,
        fullModel,
        routedModel: `${providerAlias}/${m.model}`,
        alias: (modelAliases || {})[fullModel] || m.model,
        origin: "provider",
      });
    }

    const seenFull = new Set(entries.map((e) => e.fullModel));
    for (const m of customModels || []) {
      if (!m?.id || (m.kind || m.type || "llm") !== "llm") continue;
      const fullModel = `${m.providerAlias}/${m.id}`;
      if (seenFull.has(fullModel)) continue;
      seenFull.add(fullModel);
      entries.push({
        name: m.name || m.id,
        model: m.id,
        provider: m.providerAlias,
        fullModel,
        routedModel: fullModel,
        alias: (modelAliases || {})[fullModel] || m.id,
        origin: "custom",
      });
    }

    for (const s of studioModels || []) {
      if (!s?.callName || !s?.provider || !s?.model) continue;
      entries.push({
        name: s.displayName || s.callName,
        model: s.callName,
        provider: s.provider,
        fullModel: `${s.provider}/${s.callName}`,
        routedModel: s.callName,
        alias: s.callName,
        origin: "studio",
      });
    }

    const comboMembers = {};
    for (const combo of combos || []) {
      if (!combo?.name) continue;
      const members = Array.isArray(combo.models) ? combo.models : [];
      comboMembers[combo.name] = members;
      entries.push({
        name: combo.name,
        model: combo.name,
        provider: "combo",
        fullModel: combo.name,
        routedModel: combo.name,
        alias: combo.name,
        origin: "combo",
      });
    }

    // Per-provider health from live connections: a provider with no active
    // connection is reported unavailable, one whose models are all locked
    // cooling down. Combos roll up the worst of their members.
    const activeByProvider = new Map();
    const locksByProvider = new Map();
    for (const conn of connections || []) {
      if (!conn?.provider) continue;
      if (conn.isActive === false) continue;
      const key = String(conn.provider).toLowerCase();
      const rec = activeByProvider.get(key) || { active: 0, unavailable: 0 };
      if (conn.testStatus === "unavailable") rec.unavailable += 1;
      else rec.active += 1;
      activeByProvider.set(key, rec);
      for (const lock of activeLocks(conn)) {
        const arr = locksByProvider.get(key) || [];
        arr.push(String(lock).toLowerCase());
        locksByProvider.set(key, arr);
      }
    }

    // Connection rows are keyed by provider id while catalog entries carry the
    // alias, so compare both spellings before calling a provider unknown.
    const providerKeys = (provider) => {
      const keys = new Set();
      for (const cand of [provider, getProviderAlias(provider), resolveProviderId(provider)]) {
        const s = String(cand || "").trim().toLowerCase();
        if (s) keys.add(s);
      }
      return [...keys];
    };

    const providerStatus = (provider) => {
      let found = false;
      let active = 0;
      for (const key of providerKeys(provider)) {
        const rec = activeByProvider.get(key);
        if (!rec) continue;
        found = true;
        active += rec.active;
      }
      if (!found) {
        // Credential-free providers serve without a connection row.
        try {
          const id = resolveProviderId(provider);
          if (id && FREE_PROVIDERS[id]?.noAuth) return "ready";
        } catch {
          /* fall through */
        }
        return "ready";
      }
      return active > 0 ? "ready" : "unavailable";
    };

    const modelLockStatus = (provider, bareModel) => {
      const locks = [];
      for (const key of providerKeys(provider)) {
        locks.push(...(locksByProvider.get(key) || []));
      }
      if (locks.length === 0) return "ready";
      const bare = String(bareModel || "").toLowerCase();
      if (locks.includes("__all")) return "cooldown";
      if (bare && locks.includes(bare)) return "cooldown";
      return "limited";
    };

    const memberStatus = (member, seen) => {
      const s = String(member || "").trim();
      if (!s) return "ready";
      if (comboMembers[s]) {
        if (seen.has(s)) return "ready";
        seen.add(s);
        const nested = comboMembers[s].map((m) => memberStatus(m, seen));
        seen.delete(s);
        return nested.length ? worstModelStatus(nested) : "ready";
      }
      const slash = s.indexOf("/");
      if (slash > 0) {
        const provider = s.slice(0, slash);
        const bare = s.slice(slash + 1);
        return worstModelStatus([providerStatus(provider), modelLockStatus(provider, bare)]);
      }
      return "ready";
    };

    // Context window per entry, read from the same capability table the runtime
    // uses. A combo reports the smallest window among its members: routing can
    // land on any member, so the smallest is the limit the caller must plan
    // against. A model the table does not know reports null rather than a guess -
    // a wrong window is worse than an absent one.
    const lookupContext = (provider, bareModel) => {
      try {
        const caps = getCapabilitiesForModel(provider, bareModel);
        const win = Number(caps?.contextWindow);
        return Number.isFinite(win) && win > 0 ? win : null;
      } catch {
        return null;
      }
    };
    const comboContext = (name, depth = 0) => {
      if (depth > 4) return null;
      const members = comboMembers[name] || [];
      const windows = [];
      for (const member of members) {
        const value = String(member || "").trim();
        if (!value) continue;
        if (comboMembers[value]) {
          const nested = comboContext(value, depth + 1);
          if (nested) windows.push(nested);
          continue;
        }
        const slash = value.indexOf("/");
        // A bare member id still resolves: capability lookup matches patterns
        // with or without a provider prefix.
        const win =
          slash > 0
            ? lookupContext(value.slice(0, slash), value.slice(slash + 1))
            : lookupContext("", value);
        if (win) windows.push(win);
      }
      return windows.length ? Math.min(...windows) : null;
    };

    const resolvePluginMarks = await pluginMarkResolver();

    const withStatus = entries.map((entry) => {
      let status = "ready";
      if (entry.origin === "combo") {
        const members = comboMembers[entry.model] || [];
        status = members.length
          ? worstModelStatus(members.map((m) => memberStatus(m, new Set([entry.model]))))
          : "ready";
      } else {
        status = worstModelStatus([
          providerStatus(entry.provider),
          modelLockStatus(entry.provider, entry.model),
        ]);
      }
      let contextWindow = null;
      if (entry.origin === "combo") {
        contextWindow = comboContext(entry.model);
      } else {
        contextWindow = lookupContext(entry.provider, entry.model);
      }
      // A row is reachable as its full id, its bare model id, and — for a
      // combo — the combo name, so all of them are offered to the resolver. A
      // combo inherits the marks of its members, matching /api/models.
      const markIds =
        entry.origin === "combo"
          ? [entry.model, `combo/${entry.model}`, ...(comboMembers[entry.model] || [])]
          : [
              `${entry.provider}/${entry.model}`,
              entry.fullModel,
              entry.routedModel,
              entry.model,
            ];
      const pluginMarks = resolvePluginMarks(markIds);
      return { ...entry, status, contextWindow, pluginMarks };
    });

    // Deliberately NOT de-duplicated here: two rows sharing a bare model id
    // but sitting behind different provider connections are different call
    // paths, and both must stay. The card disambiguates the label instead.
    // Collapse rows that are the SAME call path. The catalog can list one
    // model twice under one provider (a marketing variant with the same id),
    // and that really is a duplicate the operator sees as "one model twice".
    // Two rows behind DIFFERENT connections are NOT duplicates and stay.
    const seenCallPath = new Set();
    const distinct = [];
    for (const entry of withStatus) {
      const callPath =
        `${String(entry.provider || "").trim().toLowerCase()}\u0000` +
        `${String(entry.model || entry.name || "").trim().toLowerCase()}`;
      if (seenCallPath.has(callPath)) continue;
      seenCallPath.add(callPath);
      distinct.push(entry);
    }

    const models = filterModelsByAllowedModels(distinct, allowedModelsRaw);
    models.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    return NextResponse.json(
      {
        models,
        total: withStatus.length,
        keyName: isApiKey ? ctx.session.keyName || "API Key" : null,
        tokenLimit: isApiKey ? ctx.session.tokenLimit || 0 : 0,
        allowedModels: allowedModelsRaw,
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[API] Failed to get available models:", error);
    return NextResponse.json({ error: "Failed to fetch available models" }, { status: 500 });
  }
}
