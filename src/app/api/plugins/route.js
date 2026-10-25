import { NextResponse } from "next/server";
import { CUSTOM_PLUGIN_KEYS } from "@/shared/constants/pluginKeys";
import { getSettings, updateSettings } from "@/lib/localDb";
import { clearPluginCache } from "@/lib/plugins/customPluginsRuntime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    const stored = settings.customPlugins || {};
    const customPlugins = {};
    for (const key of CUSTOM_PLUGIN_KEYS) {
      const entry = stored[key];
      customPlugins[key] = {
        enabled: Boolean(entry?.enabled),
        models: Array.isArray(entry?.models) ? entry.models.filter(Boolean) : [],
      };
    }
    return NextResponse.json({ customPlugins }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error getting custom plugins:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { customPlugins } = body;
    if (!customPlugins || typeof customPlugins !== "object") {
      return NextResponse.json({ error: "Invalid customPlugins payload" }, { status: 400 });
    }

    const merged = {};
    for (const key of CUSTOM_PLUGIN_KEYS) {
      const entry = customPlugins[key];
      merged[key] = {
        enabled: Boolean(entry?.enabled),
        models: Array.isArray(entry?.models) ? entry.models.filter(Boolean) : [],
      };
    }

    await updateSettings({ customPlugins: merged });
    clearPluginCache();
    return NextResponse.json({ success: true, customPlugins: merged });
  } catch (error) {
    console.error("Error updating custom plugins:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
