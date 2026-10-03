"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Input, ModelSelectModal, CardSkeleton } from "@/shared/components";
import { streamChatCompletion } from "@/shared/utils/chatStream";
import {
  SECTIONS,
  QUESTIONS,
  STORAGE_KEY,
  loadDraft,
  saveDraft,
  buildMarkdown,
  countDone,
  splitModel,
} from "./prd_model.js";

/**
 * Instruction sent to the chosen model for one section.
 *
 * Sections are generated one at a time on purpose: a single "write the whole
 * PRD" call gives no chance to course-correct, and a per-section call lets the
 * user regenerate only the part that reads badly. The prompt asks the model to
 * match the user's language rather than hard-coding a locale, so an Indonesian
 * UI still produces an English PRD for an English-speaking user.
 */
function buildInstruction(sectionId, answers, sections) {
  const section = SECTIONS.find((s) => s.id === sectionId);
  const guide =
    sectionId === "background"
      ? "Jelaskan masalah yang diselesaikan, siapa yang mengalaminya, dan kenapa solusi ini perlu dibuat. Kutip bukti dari jawaban user bila ada."
      : sectionId === "goals"
        ? "Tulis 3-5 tujuan yang terukur. Setiap tujuan harus bisa dicek tercapai atau tidak."
        : sectionId === "users"
          ? "Siapa yang memakai, dalam situasi apa, dan tooling apa yang mereka gunakan sekarang."
          : sectionId === "features"
            ? "Rinci tiap fitur sebagai daftar bertingkat. Tandai prioritas (Wajib / Seharusnya / Opsional) per fitur."
            : sectionId === "nonGoals"
              ? "Sebutkan eksplisit apa yang TIDAK dikerjakan di ruang lingkup ini, dan alasannya."
              : "Daftar checkbox yang bisa diuji. Setiap butir harus bisa diverifikasi orang lain tanpa bertanya ke pembuatnya.";

  const answersSummary = Object.entries(answers)
    .filter(([, v]) => String(v || "").trim())
    .map(([k, v]) => `- ${k}: ${v}`);

  const existing = SECTIONS.filter((s) => String(sections[s.id] || "").trim()).map(
    (s) => `### ${s.prompt}\n${sections[s.id].trim()}`,
  );

  return [
    `Anda menulis SATU bagian dari sebuah PRD (Product Requirements Document): "${section?.prompt || sectionId}".`,
    guide,
    "",
    "Kaidah output:",
    "- Tulis HANYA isi bagian ini. Jangan menulis judul bagian, jangan mengulang bagian lain.",
    "- Pakai Bahasa yang sama dengan input user di bawah.",
    "- Tulis dalam markdown. Boleh pakai heading kecil, daftar, dan tabel pipe.",
    "- Tanpa basa-basi pembuka. Langsung isi.",
    "- Maksimal 350 kata.",
    "",
    "Jawaban user:",
    ...(answersSummary.length ? answersSummary : ["- (user tidak menjawab)"]),
    "",
    "Bagian PRD yang sudah jadi (jika ada):",
    ...(existing.length ? existing : ["- (belum ada bagian yang jadi)"]),
  ].join("\n");
}

export default function PrdBuilderClient() {
  const restored = useMemo(() => loadDraft(typeof window === "undefined" ? null : window.localStorage), []);
  const [activeApiKey, setActiveApiKey] = useState("");
  const [activeProviders, setActiveProviders] = useState([]);
  const [modelAliases, setModelAliases] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [model, setModel] = useState(restored?.model || "");
  const [answers, setAnswers] = useState(restored?.answers || {});
  const [sections, setSections] = useState(restored?.sections || {});
  const [phase, setPhase] = useState(restored && countDone(restored.sections) > 0 ? "write" : "setup");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);
  const abortRef = useRef({});

  // Provider list + one API key, the same two calls Compare Models makes. The
  // request goes through /v1/chat/completions, so it counts as normal traffic:
  // provider retry, plugins, and usage tracking all apply. A hand-rolled server
  // route would bypass all three and report nothing in Usage.
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

  // Autosave so a refresh mid-draft does not lose the work. Debounced because
  // every keystroke in a section would otherwise serialize the whole document.
  useEffect(() => {
    if (loading) return undefined;
    if (typeof window === "undefined") return undefined;
    const hasContent =
      Object.values(answers).some((v) => String(v || "").trim()) || countDone(sections) > 0 || model;
    if (!hasContent) return undefined;
    const timer = setTimeout(() => {
      saveDraft(window.localStorage, { model, answers, sections });
    }, 600);
    return () => clearTimeout(timer);
  }, [model, answers, sections, loading]);

  const generateSection = useCallback(
    async (sectionId, { force = false } = {}) => {
      const { provider, model: modelName } = splitModel(model);
      if (!provider || !modelName) {
        setErrors((prev) => ({ ...prev, [sectionId]: "Pilih model dulu." }));
        return;
      }
      const existing = String(sections[sectionId] || "").trim();
      if (existing && !force) return;

      setBusy((prev) => ({ ...prev, [sectionId]: true }));
      setErrors((prev) => ({ ...prev, [sectionId]: "" }));

      const controller = new AbortController();
      abortRef.current[sectionId] = controller;
      let text = "";

      try {
        const answer = await streamChatCompletion({
          model,
          messages: [{ role: "user", content: buildInstruction(sectionId, answers, sections) }],
          apiKey: activeApiKey,
          maxTokens: 1400,
          signal: controller.signal,
          onDelta: (chunk) => {
            text += chunk;
            setSections((prev) => ({ ...prev, [sectionId]: text }));
          },
        });
        setSections((prev) => ({ ...prev, [sectionId]: answer.text || text }));
      } catch (err) {
        if (err?.name === "AbortError") {
          setSections((prev) => ({ ...prev, [sectionId]: text }));
        } else {
          setErrors((prev) => ({ ...prev, [sectionId]: err?.message || "Gagal memanggil model." }));
        }
      } finally {
        if (abortRef.current[sectionId] === controller) delete abortRef.current[sectionId];
        setBusy((prev) => ({ ...prev, [sectionId]: false }));
      }
    },
    [model, answers, sections, activeApiKey],
  );

  const stopSection = useCallback((sectionId) => {
    abortRef.current[sectionId]?.abort();
  }, []);

  const stopAll = useCallback(() => {
    for (const controller of Object.values(abortRef.current)) controller.abort();
  }, []);

  /** Fill only the sections still empty, in order, so each one sees the last. */
  const generateAll = useCallback(async () => {
    for (const section of SECTIONS) {
      if (String(sections[section.id] || "").trim()) continue;
      // Sequential by design: later sections read the earlier ones for context.
      // eslint-disable-next-line no-await-in-loop
      await generateSection(section.id);
      if (abortRef.current === undefined) break;
    }
  }, [sections, generateSection]);

  const copyMarkdown = useCallback(async () => {
    const md = buildMarkdown(model, answers, sections);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [model, answers, sections]);

  const downloadMarkdown = useCallback(() => {
    const md = buildMarkdown(model, answers, sections);
    const slug =
      String(answers.feature || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "prd";
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [model, answers, sections]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setAnswers({});
    setSections({});
    setPhase("setup");
  }, []);

  const doneCount = countDone(sections);
  const canStart = Boolean(model) && Boolean(String(answers.feature || "").trim());

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {phase === "setup" && (
        <Card className="flex min-w-0 flex-col gap-4" padding="sm">
          <div>
            <h1 className="text-lg font-semibold text-text-main">PRD Builder</h1>
            <p className="mt-1 text-sm text-text-muted">
              Jawab beberapa pertanyaan, lalu model yang kamu pilih menulis PRD-nya satu bagian per satu. Draft disimpan di
              browser ini saja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-2 p-3">
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-text-muted uppercase">Model untuk menulis PRD</span>
              <span className={`mt-0.5 block truncate text-sm ${model ? "text-text-main" : "text-text-muted"}`}>
                {model || "Belum dipilih — wajib pilih satu"}
              </span>
            </div>
            <Button variant="secondary" onClick={() => setShowPicker(true)} icon="tune">
              {model ? "Ganti" : "Pilih model"}
            </Button>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {QUESTIONS.map((q) => (
              <div key={q.id} className="flex min-w-0 flex-col gap-1.5">
                <label className="text-sm font-medium text-text-main">{q.label}</label>
                {q.multiline ? (
                  <textarea
                    className="min-h-[72px] w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none transition-colors focus:border-primary"
                    placeholder={q.placeholder}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                ) : (
                  <Input
                    placeholder={q.placeholder}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setPhase("write")} disabled={!canStart} icon="auto_awesome">
              Buat PRD
            </Button>
            {!canStart && (
              <span className="text-xs text-text-muted">
                {model ? "Isi pertanyaan fitur dulu." : "Pilih model dulu."}
              </span>
            )}
          </div>
        </Card>
      )}

      {phase === "write" && (
        <>
          <Card className="flex min-w-0 flex-col gap-3" padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-text-main">PRD Builder</h1>
                <p className="mt-0.5 text-sm text-text-muted">
                  {doneCount}/{SECTIONS.length} bagian jadi · model <code className="text-primary">{model}</code>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => setShowPicker(true)} icon="tune">
                  Ganti model
                </Button>
                <Button variant="secondary" onClick={stopAll} icon="stop" disabled={Object.keys(busy).length === 0}>
                  Stop
                </Button>
                <Button onClick={generateAll} icon="auto_awesome" disabled={!model || Object.values(busy).some(Boolean)}>
                  Lanjutkan yang kosong
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-3">
            {SECTIONS.map((section) => {
              const value = sections[section.id] || "";
              const isBusy = Boolean(busy[section.id]);
              const error = errors[section.id];
              return (
                <Card key={section.id} className="flex min-w-0 flex-col gap-2" padding="sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-text-main">{section.label}</h2>
                      <p className="text-xs text-text-muted">{section.hint}</p>
                    </div>
                    {isBusy ? (
                      <Button variant="secondary" onClick={() => stopSection(section.id)} icon="stop">
                        Stop
                      </Button>
                    ) : (
                      <Button
                        variant={value.trim() ? "secondary" : "primary"}
                        onClick={() => generateSection(section.id, { force: Boolean(value.trim()) })}
                        icon={value.trim() ? "refresh" : "auto_awesome"}
                      >
                        {value.trim() ? "Regenerate" : "Generate"}
                      </Button>
                    )}
                  </div>

                  <textarea
                    className="min-h-[120px] w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none transition-colors focus:border-primary"
                    placeholder={isBusy ? "Model sedang menulis..." : "Bagian ini kosong. Isi manual atau tekan Generate."}
                    value={value}
                    onChange={(e) => setSections((prev) => ({ ...prev, [section.id]: e.target.value }))}
                    disabled={isBusy}
                  />

                  {error && <p className="text-xs text-danger">{error}</p>}
                </Card>
              );
            })}
          </div>

          <Card className="flex min-w-0 flex-col gap-3" padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-text-main">Dokumen Final</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={copyMarkdown} icon="content_copy">
                  {copied ? "Tersalin" : "Copy Markdown"}
                </Button>
                <Button onClick={downloadMarkdown} icon="download">
                  Unduh .md
                </Button>
                <Button variant="ghost" onClick={clearDraft} icon="delete">
                  Hapus draft
                </Button>
              </div>
            </div>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg border border-border-subtle bg-surface-2 p-3 text-xs text-text-main">
              {buildMarkdown(model, answers, sections)}
            </pre>
          </Card>
        </>
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
          title="Pilih model untuk menulis PRD"
        />
      )}
    </div>
  );
}