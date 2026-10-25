"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Badge,
  Toggle,
  ModelSelectModal,
  CapacityBadges,
} from "@/shared/components";
import { useModelCaps } from "@/shared/hooks/useModelCaps";
import { useNotificationStore } from "@/store/notificationStore";
import PluginMark from "@/shared/components/PluginMark";
import { CUSTOM_PLUGIN_KEYS } from "@/shared/constants/pluginKeys";

const PLUGINS = [
  {
    key: "adaptiveThinking",
    title: "Adaptive Thinking & Cognitive Architecture",
    description:
      "A synthesized cognitive stack uniting Depth Protocol v2.0, Adversaria Dialectic Crucible, First Principles Decomposition, and Superpowers. Blocks premature closure, demands root problem reframing, explores 3 distinct hypothesis branches, mounts adversarial stress-tests, and verifies failure envelopes before answering.",
  },
  {
    key: "imageVision",
    title: "OCR Auto Image-to-Text",
    description:
      "Automatically extracts and transcribes visual text, charts, diagrams, and metadata from images via intelligent OCR scripting. Converts image payloads into structured text blocks so that non-vision models (or vision models needing precise OCR) can process image contents accurately.",
  },
];

function defaultPluginsFrom(stored) {
  const out = {};
  for (const key of CUSTOM_PLUGIN_KEYS) {
    const entry = stored?.[key];
    out[key] = {
      enabled: Boolean(entry?.enabled),
      models: Array.isArray(entry?.models) ? entry.models.filter(Boolean) : [],
    };
  }
  return out;
}

const DEFAULT_PLUGINS_STATE = defaultPluginsFrom(null);

function formatModelName(modelVal) {
  if (!modelVal) return "";
  return modelVal.includes("/")
    ? modelVal.split("/").slice(1).join("/")
    : modelVal;
}

export default function PluginsPage() {
  const [customPlugins, setCustomPlugins] = useState(DEFAULT_PLUGINS_STATE);
  const [activeProviders, setActiveProviders] = useState([]);
  const [pickerPlugin, setPickerPlugin] = useState(null);
  const { getCaps } = useModelCaps();
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    async function loadData() {
      try {
        const [pluginsRes, providersRes] = await Promise.all([
          fetch("/api/plugins", { cache: "no-store" }),
          fetch("/api/providers", { cache: "no-store" }),
        ]);

        if (pluginsRes.ok) {
          const data = await pluginsRes.json();
          if (data.customPlugins) {
            // Derived from CUSTOM_PLUGIN_KEYS rather than spelled out again:
            // a hand-written literal had drifted to five keys while the plugin
            // table has six, so openaiToolBridge always came back undefined and
            // its toggle rendered OFF after every reload.
            setCustomPlugins(defaultPluginsFrom(data.customPlugins));
          }
        }

        if (providersRes.ok) {
          const provData = await providersRes.json();
          setActiveProviders(provData.connections || []);
        }
      } catch (err) {
        console.error("Failed to load plugin data:", err);
      }
    }

    loadData();
  }, []);

  const savePlugins = useCallback(
    async (updatedPlugins) => {
      try {
        const res = await fetch("/api/plugins", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customPlugins: updatedPlugins }),
        });
        if (res.ok) {
          window.dispatchEvent(new Event("customModelChanged"));
        }
      } catch (err) {
        console.error("Failed to save plugins:", err);
      }
    },
    []
  );

  const handleToggle = useCallback(
    (pluginKey, enabled) => {
      setCustomPlugins((prev) => {
        const updated = {
          ...prev,
          [pluginKey]: {
            ...prev[pluginKey],
            enabled,
          },
        };
        savePlugins(updated);
        return updated;
      });
    },
    [savePlugins]
  );

  const handleAddModel = useCallback(
    (pluginKey, model) => {
      const modelVal =
        typeof model === "string"
          ? model
          : model?.value || model?.name || model?.id || "";
      if (!modelVal || !pluginKey) return;

      setCustomPlugins((prev) => {
        const currentModels = prev[pluginKey]?.models || [];
        if (currentModels.includes(modelVal)) return prev;

        const updated = {
          ...prev,
          [pluginKey]: {
            ...prev[pluginKey],
            models: [...currentModels, modelVal],
          },
        };
        savePlugins(updated);
        return updated;
      });
    },
    [savePlugins]
  );

  const handleRemoveModel = useCallback(
    (pluginKey, model) => {
      const modelVal =
        typeof model === "string"
          ? model
          : model?.value || model?.name || model?.id || "";
      if (!modelVal || !pluginKey) return;

      setCustomPlugins((prev) => {
        const currentModels = prev[pluginKey]?.models || [];
        if (!currentModels.includes(modelVal)) return prev;

        const updated = {
          ...prev,
          [pluginKey]: {
            ...prev[pluginKey],
            models: currentModels.filter((m) => m !== modelVal),
          },
        };
        savePlugins(updated);
        return updated;
      });
    },
    [savePlugins]
  );

  const activePickerConfig = PLUGINS.find((p) => p.key === pickerPlugin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Custom Plugins</h1>
        <p className="text-sm text-text-muted mt-1">
          Extend model capabilities with plugins
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {PLUGINS.map((plugin) => {
          const config = customPlugins[plugin.key] || {
            enabled: false,
            models: [],
          };
          const isEnabled = config.enabled;
          const selectedModels = config.models || [];

          return (
            <Card key={plugin.key} className="flex flex-col h-full">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  {/* One tile, one mark, one ink for all seven cards. The marks
                      used to be seven pictograms in seven saturated hues, which
                      read as seven unrelated brands rather than one plugin
                      system; they are monograms in the theme accent now, and the
                      letters are what tell them apart. The tile is the only
                      thing that changes with state - the ring says enabled, the
                      glyph stays the same either way. */}
                  <div
                    className={`size-11 rounded-xl flex items-center justify-center border shrink-0 border-border-subtle ${
                      isEnabled
                        ? "bg-primary/10 text-primary ring-1 ring-primary/50 shadow-[var(--shadow-elev)]"
                        : "bg-surface text-text-muted"
                    }`}
                  >
                    <PluginMark name={plugin.key} size={24} strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-base text-text-main">
                    {plugin.title}
                  </h3>
                </div>
                <Toggle
                  checked={isEnabled}
                  onChange={(val) => handleToggle(plugin.key, val)}
                />
              </div>

              <p className="text-sm text-text-muted leading-relaxed mb-5">
                {plugin.description}
              </p>

              {isEnabled && (
                <div className="mt-auto pt-4 border-t border-border-subtle">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Selected Models
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="add"
                      onClick={() => setPickerPlugin(plugin.key)}
                    >
                      Add Models
                    </Button>
                  </div>

                  {selectedModels.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border-subtle bg-surface-2/30 text-center">
                      <p className="text-xs text-text-muted">
                        Select models to apply this plugin
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedModels.map((modelVal) => (
                        <Badge
                          key={modelVal}
                          variant="default"
                          size="md"
                          className="font-medium bg-surface-2 text-text-main border border-border-subtle"
                        >
                          <span className="truncate max-w-[180px]">
                            {formatModelName(modelVal)}
                          </span>
                          <CapacityBadges caps={getCaps(modelVal)} />
                          <button
                            type="button"
                            onClick={() => handleRemoveModel(plugin.key, modelVal)}
                            className="text-text-muted hover:text-red-500 transition-colors cursor-pointer leading-none ml-0.5"
                            title="Remove model"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              close
                            </span>
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {pickerPlugin && (
        <ModelSelectModal
          isOpen={Boolean(pickerPlugin)}
          onClose={() => setPickerPlugin(null)}
          onSelect={(m) => handleAddModel(pickerPlugin, m)}
          onDeselect={(m) => handleRemoveModel(pickerPlugin, m)}
          activeProviders={activeProviders}
          title={`Select Models - ${activePickerConfig?.title || "Plugin"}`}
          addedModelValues={customPlugins[pickerPlugin]?.models || []}
          closeOnSelect={false}
        />
      )}
    </div>
  );
}
