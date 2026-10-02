import { NextResponse } from "next/server";
import { getModelAliases, setModelAlias, getCustomModels } from "@/models";
import { getDisabledModels } from "@/lib/disabledModelsDb";
import { getSettings } from "@/lib/localDb";
import { AI_MODELS } from "@/shared/constants/config";
import { getProviderAlias } from "@/shared/constants/providers";
import { getCapabilitiesForModel } from "open-sse/providers/capabilities.js";
import { fetchSuggestedModelsServer } from "@/app/api/providers/suggested-models/filters.js";
import { FREE_PROVIDERS as FREE_PROVIDER_REGISTRY } from "@/shared/constants/providers.js";

// GET /api/models - Get models with aliases. Always dynamic: plugin badges
// (vision/thinkDeeper/jsonGuard/...) come from settings, which a prerendered
// response would freeze at whatever the settings were during the build.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const modelAliases = await getModelAliases();
    const disabled = await getDisabledModels();
    const settings = await getSettings().catch(() => ({}));
    const customPlugins = settings?.customPlugins || {};
    const ivEnabled = Boolean(customPlugins.imageVision?.enabled);
    const ivModels = new Set(customPlugins.imageVision?.models || []);
    const tdEnabled = Boolean(customPlugins.thinkDeeper?.enabled);
    const tdModels = new Set(customPlugins.thinkDeeper?.models || []);
    const smEnabled = Boolean(customPlugins.speedMode?.enabled);
    const smModels = new Set(customPlugins.speedMode?.models || []);
    const jgEnabled = Boolean(customPlugins.jsonGuard?.enabled);
    const jgModels = new Set(customPlugins.jsonGuard?.models || []);
    const csEnabled = Boolean(customPlugins.contextSqueezer?.enabled);
    const csModels = new Set(customPlugins.contextSqueezer?.models || []);

    const models = AI_MODELS
      .filter((m) => {
        const alias = getProviderAlias(m.provider) || m.provider;
        const list = disabled[alias] || disabled[m.provider] || [];
        return !list.includes(m.model);
      })
      .map((m) => {
        const fullModel = `${m.provider}/${m.model}`;
        const providerAlias = getProviderAlias(m.provider) || m.provider;
        const routedModel = `${providerAlias}/${m.model}`;
        const c = getCapabilitiesForModel(m.provider, m.model);
        const caps = {
          vision: c.vision,
          search: c.search,
          reasoning: c.reasoning,
          contextWindow: c.contextWindow,
          maxOutput: c.maxOutput,
        };
        if (ivEnabled && (ivModels.has(fullModel) || ivModels.has(routedModel) || ivModels.has(m.model))) {
          caps.vision = true;
        }
        if (tdEnabled && (tdModels.has(fullModel) || tdModels.has(routedModel) || tdModels.has(m.model))) {
          caps.reasoning = true;
          caps.thinkDeeper = true;
        }
        if (smEnabled && (smModels.has(fullModel) || smModels.has(routedModel) || smModels.has(m.model))) {
          caps.speedMode = true;
        }
        if (jgEnabled && (jgModels.has(fullModel) || jgModels.has(routedModel) || jgModels.has(m.model))) {
          caps.jsonGuard = true;
        }
        if (csEnabled && (csModels.has(fullModel) || csModels.has(routedModel) || csModels.has(m.model))) {
          caps.contextSqueezer = true;
        }
        return {
          ...m,
          fullModel,
          routedModel,
          alias: modelAliases[fullModel] || m.model,
          caps,
        };
      });

    // Custom-model ids and live-catalogue ids both live in this set.
    const seenFull = new Set(models.map((m) => m.fullModel));

    // Free no-auth providers publish a live catalogue (OpenCode Free moves weekly).
    // Registry entries above are curated, so anything upstream adds is merged in
    // here; without this the picker would only ever show what the build captured.
    const liveFree = await Promise.all(
      Object.entries(FREE_PROVIDER_REGISTRY)
        .filter(([, p]) => p.noAuth && !p.hidden && p.modelsFetcher)
        .map(async ([id, p]) => [p.alias || id, p.modelsFetcher, await fetchSuggestedModelsServer(p.modelsFetcher)])
    );
    const addedLive = [];
    for (const [alias, , liveModels] of liveFree) {
      for (const live of liveModels) {
        const fullModel = `${alias}/${live.id}`;
        if (seenFull.has(fullModel)) continue;
        seenFull.add(fullModel);
        const c = getCapabilitiesForModel(alias, live.id);
        const caps = {
          vision: c.vision,
          search: c.search,
          reasoning: c.reasoning,
          contextWindow: c.contextWindow ?? live.contextLength,
          maxOutput: c.maxOutput,
        };
        if (ivEnabled && (ivModels.has(fullModel) || ivModels.has(live.id))) {
          caps.vision = true;
        }
        if (tdEnabled && (tdModels.has(fullModel) || tdModels.has(live.id))) {
          caps.reasoning = true;
          caps.thinkDeeper = true;
        }
        if (smEnabled && (smModels.has(fullModel) || smModels.has(live.id))) {
          caps.speedMode = true;
        }
        if (jgEnabled && (jgModels.has(fullModel) || jgModels.has(live.id))) {
          caps.jsonGuard = true;
        }
        if (csEnabled && (csModels.has(fullModel) || csModels.has(live.id))) {
          caps.contextSqueezer = true;
        }
        const entry = {
          provider: alias,
          model: live.id,
          name: live.name || live.id,
          fullModel,
          routedModel: fullModel,
          alias: modelAliases[fullModel] || live.id,
          caps,
          liveSuggested: true,
        };
        models.push(entry);
        addedLive.push(entry);
      }
    }

    // Custom models ride along; their stored caps override the name heuristic
    const customModels = (await getCustomModels()).filter((m) => {
      if (!m?.id || (m.kind || m.type || "llm") !== "llm") return false;
      return !seenFull.has(`${m.providerAlias}/${m.id}`);
    });
    for (const m of customModels) {
      const fullModel = `${m.providerAlias}/${m.id}`;
      const c = getCapabilitiesForModel(m.providerAlias, m.id);
      const caps = {
        vision: c.vision,
        search: c.search,
        reasoning: c.reasoning,
        contextWindow: c.contextWindow,
        maxOutput: c.maxOutput,
        ...(m.caps || {}),
      };
      if (ivEnabled && (ivModels.has(fullModel) || ivModels.has(m.id))) {
        caps.vision = true;
      }
      if (tdEnabled && (tdModels.has(fullModel) || tdModels.has(m.id))) {
        caps.reasoning = true;
        caps.thinkDeeper = true;
      }
      if (smEnabled && (smModels.has(fullModel) || smModels.has(m.id))) {
        caps.speedMode = true;
      }
      if (jgEnabled && (jgModels.has(fullModel) || jgModels.has(m.id))) {
        caps.jsonGuard = true;
      }
      if (csEnabled && (csModels.has(fullModel) || csModels.has(m.id))) {
        caps.contextSqueezer = true;
      }
      models.push({
        provider: m.providerAlias,
        model: m.id,
        name: m.name || m.id,
        fullModel,
        routedModel: fullModel,
        alias: modelAliases[fullModel] || m.id,
        caps,
      });
    }

    // Studio (Custom Models) entries: the callable name is the key clients use,
    // so the plugin badge lookup must answer for the bare callName as well.
    const { getStudioModels } = await import("@/lib/db/repos/modelEditorRepo.js");
    let studioModels = [];
    try {
      studioModels = await getStudioModels();
    } catch {
      studioModels = [];
    }
    for (const s of studioModels) {
      const c = getCapabilitiesForModel(s.provider, s.model);
      const targetFull = `${s.provider}/${s.model}`;
      const caps = {
        vision: c.vision,
        search: c.search,
        reasoning: c.reasoning,
        contextWindow: c.contextWindow,
        maxOutput: c.maxOutput,
      };
      // A plugin applies when it names the studio name OR the model it calls.
      const names = [s.callName, targetFull, s.model];
      if (ivEnabled && names.some((n) => ivModels.has(n))) {
        caps.vision = true;
      }
      if (tdEnabled && names.some((n) => tdModels.has(n))) {
        caps.reasoning = true;
        caps.thinkDeeper = true;
      }
      if (smEnabled && names.some((n) => smModels.has(n))) {
        caps.speedMode = true;
      }
      if (jgEnabled && names.some((n) => jgModels.has(n))) {
        caps.jsonGuard = true;
      }
      if (csEnabled && names.some((n) => csModels.has(n))) {
        caps.contextSqueezer = true;
      }
      models.push({
        provider: s.provider,
        model: s.callName,
        name: s.displayName || s.callName,
        fullModel: `${s.provider}/${s.callName}`,
        routedModel: s.callName,
        alias: s.callName,
        caps,
        isStudio: true,
      });
    }

    // Combos: aggregate the caps of their member models so a combo chip answers for
    // its badge and its window too. The same aggregator the public models list uses,
    // so a combo never reports a different window in two places.
    const { getCombos } = await import("@/lib/localDb");
    const { aggregateComboCapabilities } = await import("open-sse/providers/capabilities.js");
    let combos = [];
    try {
      combos = await getCombos();
    } catch {
      combos = [];
    }
    const comboByName = {};
    for (const combo of combos) {
      if (Array.isArray(combo.models) && combo.models.length) comboByName[combo.name] = combo.models;
    }
    for (const combo of combos) {
      const members = Array.isArray(combo.models) ? combo.models : [];
      if (members.length === 0) continue;
      const aggregated = aggregateComboCapabilities(members, comboByName, 0, Number(combo.contextWindow) || 0);
      if (!aggregated) continue;
      const comboCaps = { ...aggregated };
      if (ivEnabled && (ivModels.has(combo.name) || ivModels.has(`combo/${combo.name}`) || members.some((m) => ivModels.has(m)))) {
        comboCaps.vision = true;
      }
      if (tdEnabled && (tdModels.has(combo.name) || tdModels.has(`combo/${combo.name}`) || members.some((m) => tdModels.has(m)))) {
        comboCaps.reasoning = true;
        comboCaps.thinkDeeper = true;
      }
      if (smEnabled && (smModels.has(combo.name) || smModels.has(`combo/${combo.name}`) || members.some((m) => smModels.has(m)))) {
        comboCaps.speedMode = true;
      }
      if (jgEnabled && (jgModels.has(combo.name) || jgModels.has(`combo/${combo.name}`) || members.some((m) => jgModels.has(m)))) {
        comboCaps.jsonGuard = true;
      }
      if (csEnabled && (csModels.has(combo.name) || csModels.has(`combo/${combo.name}`) || members.some((m) => csModels.has(m)))) {
        comboCaps.contextSqueezer = true;
      }
      models.push({
        provider: "combo",
        model: combo.name,
        name: combo.name,
        fullModel: combo.name,
        routedModel: combo.name,
        alias: combo.name,
        caps: comboCaps,
        isCombo: true,
      });
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.log("Error fetching models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

// PUT /api/models - Update model alias
export async function PUT(request) {
  try {
    const body = await request.json();
    const { model, alias } = body;

    if (!model || !alias) {
      return NextResponse.json({ error: "Model and alias required" }, { status: 400 });
    }

    const modelAliases = await getModelAliases();

    // Check if alias already exists for different model
    const existingModel = Object.entries(modelAliases).find(
      ([key, val]) => val === alias && key !== model
    );

    if (existingModel) {
      return NextResponse.json({ error: "Alias already in use" }, { status: 400 });
    }

    // Update alias
    await setModelAlias(model, alias);

    return NextResponse.json({ success: true, model, alias });
  } catch (error) {
    console.log("Error updating alias:", error);
    return NextResponse.json({ error: "Failed to update alias" }, { status: 500 });
  }
}
