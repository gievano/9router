/**
 * Pure logic behind the PRD Builder: the section/question schema, draft
 * persistence, and final markdown assembly.
 *
 * Kept out of the JSX component so the test suite can import it directly —
 * vitest in this repo runs without a JSX transform, so anything defined inside
 * a .js component file is untestable. It also documents the storage contract
 * in one place instead of spreading it across effects.
 */

export const SECTIONS = [
  {
    id: "background",
    label: "Latar Belakang",
    prompt: "Latar Belakang",
    hint: "Masalah, siapa yang mengalaminya, kenapa perlu dibangun.",
  },
  { id: "goals", label: "Tujuan", prompt: "Tujuan", hint: "3-5 target yang bisa diukur berhasil atau tidak." },
  { id: "users", label: "Pengguna Sasaran", prompt: "Pengguna Sasaran", hint: "Siapa yang memakai dan dalam situasi apa." },
  { id: "features", label: "Fitur", prompt: "Fitur", hint: "Rincian fitur dengan prioritas Wajib / Seharusnya / Opsional." },
  { id: "nonGoals", label: "Batasan", prompt: "Batasan (Non-Goals)", hint: "Apa yang sengaja TIDAK dikerjakan di lingkup ini." },
  { id: "criteria", label: "Kriteria Selesai", prompt: "Kriteria Selesai", hint: "Checklist yang bisa diuji orang lain tanpa bertanya." },
];

export const QUESTIONS = [
  { id: "feature", label: "Fitur apa yang mau dibuat?", placeholder: "Contoh: notifikasi Telegram kalau provider error", multiline: false },
  { id: "problem", label: "Untuk siapa, dan masalah apa yang diselesaikan?", placeholder: "Contoh: buat saya yang perlu tahu kalau quota free habis", multiline: true },
  { id: "mustHave", label: "Wajib ada fitur apa saja?", placeholder: "Contoh: kirim pesan, atur jadwal, tampilkan log error", multiline: true },
  { id: "nonGoals", label: "Yang TIDAK mau dikerjakan apa?", placeholder: "Contoh: tanpa dashboard, tanpa integrasi database", multiline: true },
  { id: "constraints", label: "Batasan teknis?", placeholder: "Contoh: Next.js 14, SQLite, tanpa server baru, harus jalan di mobile", multiline: true },
  { id: "done", label: "Kapan dianggap selesai?", placeholder: "Contoh: semua bisa dites manual dari dashboard", multiline: true },
];

export const STORAGE_KEY = "prd-builder-draft-v1";

/**
 * Read a draft from localStorage. Any malformed or absent value returns null
 * rather than throwing — a corrupted draft must never stop the page from
 * opening, and clearing it is the user's call, not ours.
 */
export function loadDraft(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      model: typeof parsed.model === "string" ? parsed.model : "",
      answers: parsed.answers && typeof parsed.answers === "object" && !Array.isArray(parsed.answers) ? parsed.answers : {},
      sections: parsed.sections && typeof parsed.sections === "object" && !Array.isArray(parsed.sections) ? parsed.sections : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

/** Serialize the current editor state for storage. */
export function saveDraft(storage, state) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    // Quota exceeded or storage blocked: autosave is best effort.
    return false;
  }
}

/**
 * Assemble the final document.
 *
 * Sections that were never filled render as an explicit "skipped" marker
 * rather than silently disappearing, so a reader can tell a deliberate
 * omission from a lost one. Empty answers are dropped from the raw list.
 */
export function buildMarkdown(model, answers = {}, sections = {}) {
  const title = String(answers.feature || "").trim() || "PRD";
  const lines = [`# ${title}`, "", `> Dibuat dengan model: \`${model || "tidak ditentukan"}\``, ""];

  for (const section of SECTIONS) {
    const body = String(sections[section.id] || "").trim();
    lines.push(`## ${section.prompt}`, "");
    lines.push(body || "_Bagian ini dilewati._", "");
  }

  const extra = [];
  for (const q of QUESTIONS) {
    const value = String(answers[q.id] || "").trim();
    if (value) extra.push(`- **${q.label}** ${value}`);
  }
  if (extra.length > 0) lines.push("## Jawaban Mentah", "", ...extra, "");

  lines.push("---", "", "Status: Draft");
  return lines.join("\n");
}

/** Progress meter shown in the header. */
export function countDone(sections = {}) {
  return SECTIONS.filter((s) => String(sections[s.id] || "").trim()).length;
}

/**
 * Split `provider/model` into its parts. The picker hands back a combined id
 * (for example `opencode/glm-4.7-free`), and a missing slash means we cannot
 * address the provider at all — call that out instead of guessing.
 */
export function splitModel(value) {
  const str = String(value || "");
  const firstSlash = str.indexOf("/");
  if (firstSlash === -1) return { provider: null, model: str };
  return { provider: str.slice(0, firstSlash), model: str.slice(firstSlash + 1) };
}