"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, ModelSelectModal, CardSkeleton } from "@/shared/components";
import { streamChatCompletion } from "@/shared/utils/chatStream";
import { STORAGE_KEY, buildPrompt, loadDraft, saveDraft } from "./prd_model.js";

/**
 * One textarea, one model, one call. The full PRD streams into a single
 * editable document - the earlier six-question wizard was removed because it
 * asked the user to do the structuring the model should be doing.
 */
export default function PrdBuilderClient() {
  const restored = useMemo(() => loadDraft(typeof window === "undefined" ? null : window.localStorage), []);
  const [activeApiKey, setActiveApiKey] = useState("");
  const [activeProviders, setActiveProviders] = useState([]);
  const [modelAliases, setModelAliases] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [model, setModel] = useState(restored?.model || "");
  const [prompt, setPrompt] = useState(restored?.prompt || "");
  const [document, setDocument] = useState(restored?.document || "");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(null);

  // Provider list + one API key, the same two calls Compare Models makes. The
  // request goes through /v1/chat/completions, so it counts as normal traffic:
  // provider retry, plugins, and usage tracking all apply.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/providers").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/models/alias").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/keys").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pData, aliasData, kData]) => {
        if (cancelled) return;
        setActiveProviders(pData?.connections || []);
        if (aliasData?.aliases) setModelAliases(aliasData.aliases);
        const firstActive = (kData?.keys || []).find((k) => k.isActive !== false);
        if (firstActive?.key) setActiveApiKey(firstActive.key);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave so a refresh mid-write does not lose the draft. The v1
  // section-by-section draft has a different shape; loadDraft normalises it
  // away, and the next keystroke overwrites it in this form.
  useEffect(() => {
    if (loading) return undefined;
    if (typeof window === "undefined") return undefined;
    if (!prompt.trim() && !document.trim() && !model) return undefined;
    const timer = setTimeout(() => {
      saveDraft(window.localStorage, { model, prompt, document });
    }, 600);
    return () => clearTimeout(timer);
  }, [model, prompt, document, loading]);

  const generate = useCallback(async () => {
    // Combos and custom targets are selected by bare name ("mine", no slash).
    // The gateway resolves those itself, so only an empty choice is an error.
    if (!String(model || "").trim()) {
      setError("Select a model first.");
      return;
    }
    if (!prompt.trim()) {
      setError("Describe what you want built first.");
      return;
    }

    setGenerating(true);
    setError("");
    setDocument("");

    const controller = new AbortController();
    abortRef.current = controller;
    let text = "";

    try {
      const answer = await streamChatCompletion({
        model,
        messages: [{ role: "user", content: buildPrompt(prompt) }],
        apiKey: activeApiKey,
        maxTokens: 3200,
        signal: controller.signal,
        onDelta: (chunk) => {
          text += chunk;
          setDocument(text);
        },
      });
      setDocument(answer.text || text);
    } catch (err) {
      if (err?.name === "AbortError") {
        setDocument(text);
      } else {
        setError(err?.message || "Failed to reach the model.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setGenerating(false);
    }
  }, [model, prompt, activeApiKey]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(document);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [document]);

  const downloadMarkdown = useCallback(() => {
    const slug =
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .split("-")
        .slice(0, 6)
        .join("-")
        .slice(0, 48) || "prd";
    const blob = new Blob([document], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [prompt, document]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPrompt("");
    setDocument("");
    setError("");
  }, []);

  const canGenerate = Boolean(model) && Boolean(prompt.trim()) && !generating;

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
      <div>
        <h1 className="text-lg font-semibold text-text-main">PRD Builder</h1>
        <p className="mt-1 text-sm text-text-muted">
          Describe what you want built. The selected model writes the full PRD in one pass.
        </p>
      </div>

      <Card className="flex min-w-0 flex-col gap-3" padding="sm">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-2 p-3">
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-text-muted uppercase">Model</span>
            <span className={`mt-0.5 block truncate text-sm ${model ? "text-text-main" : "text-text-muted"}`}>
              {model || "Not selected - pick one first"}
            </span>
          </div>
          <Button variant="secondary" onClick={() => setShowPicker(true)} icon="tune">
            {model ? "Change" : "Select model"}
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-sm font-medium text-text-main">What do you want to build?</label>
          <textarea
            className="min-h-[140px] w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none transition-colors focus:border-primary"
            placeholder="Example: a Telegram notification service that alerts me when a provider goes down, with per-key routing and a daily usage summary..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
          />
          <p className="text-xs text-text-muted">
            One or two paragraph is enough. Missing details become open questions in the PRD instead of guesses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {generating ? (
            <Button variant="secondary" onClick={stop} icon="stop">
              Stop
            </Button>
          ) : (
            <Button onClick={generate} disabled={!canGenerate} icon="auto_awesome">
              {document.trim() ? "Regenerate" : "Generate PRD"}
            </Button>
          )}
          {!model && <span className="text-xs text-text-muted">Select a model to continue.</span>}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
      </Card>

      {(document.trim() || generating) && (
        <Card className="flex min-w-0 flex-col gap-3" padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-main">PRD</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={copyMarkdown} icon="content_copy" disabled={generating}>
                {copied ? "Copied" : "Copy Markdown"}
              </Button>
              <Button onClick={downloadMarkdown} icon="download" disabled={generating || !document.trim()}>
                Download .md
              </Button>
              <Button variant="ghost" onClick={clearDraft} icon="delete" disabled={generating}>
                Clear draft
              </Button>
            </div>
          </div>
          <textarea
            className="min-h-[420px] w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs leading-relaxed text-text-main outline-none transition-colors focus:border-primary"
            placeholder={generating ? "Writing..." : "The PRD appears here. Edit freely."}
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            disabled={generating}
          />
        </Card>
      )}

      {showPicker && (
        <ModelSelectModal
          isOpen
          onClose={() => setShowPicker(false)}
          onSelect={(modelObj) => {
            setModel(modelObj?.value || "");
            setShowPicker(false);
          }}
          activeProviders={activeProviders}
          modelAliases={modelAliases}
          title="Select a model to write the PRD"
        />
      )}
    </div>
  );
}