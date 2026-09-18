/**
 * Admin Knowledge Base — folder-based content manager.
 *
 * Level 1  →  Grade levels (all grades as cards)
 * Level 2  →  Subjects inside a grade
 * Level 3  →  Files inside a subject + upload modal
 *
 * Route: /admin/knowledge-base
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  SIMPLE_LEVELS, SECTION_LEVELS,
  getSubjectsForNiveauSection, getNiveauLabel, getSectionLabel, isSectionLevel,
} from "@/lib/educationConfig";
import {
  Folder, FolderOpen, ChevronRight, ChevronLeft,
  Upload, FileText, FileImage, Trash2, X, Plus,
  BookOpen, AlertCircle, CheckCircle2, Loader2, ExternalLink,
  RefreshCw, Eye, SendHorizonal, RotateCcw, Hash, Layers, Zap, PenLine,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { apiFetch, apiFetchArray } from "@/lib/api";

const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

/**
 * Convert a raw storage path stored in the DB to a URL that the browser can open.
 *
 *   /local/uuid.pdf        → {API}/storage/local/uuid.pdf
 *   /objects/path/file     → {API}/storage/objects/path/file
 *   https://…              → returned as-is (GCS signed URL or CDN)
 *
 * Auth: the session cookie is SameSite=None in prod (included cross-origin) and
 * SameSite=Lax in dev (included for top-level navigation).  Opening via a
 * Blob URL avoids any cross-origin cookie concern entirely.
 */
async function openStorageFile(fileUrl: string): Promise<void> {
  let apiUrl: string;

  if (fileUrl.startsWith("/local/")) {
    const filename = fileUrl.slice("/local/".length);
    apiUrl = `${API}/api/storage/local/${encodeURIComponent(filename)}`;
  } else if (fileUrl.startsWith("/objects/")) {
    const path = fileUrl.slice("/objects/".length);
    apiUrl = `${API}/api/storage/objects/${path}`;
  } else if (fileUrl.startsWith("/neon/")) {
    const path = fileUrl.slice("/neon/".length);
    apiUrl = `${API}/api/storage/neon/${path}`;
  } else {
    // Already an absolute URL (GCS signed URL, CDN, etc.) — open directly
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const res = await fetch(apiUrl, { credentials: "include" });
    if (!res.ok) {
      alert(`Impossible d'ouvrir le fichier (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    // Revoke after a short delay so the new tab has time to start loading it
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  } catch {
    alert("Impossible d'ouvrir le fichier — vérifiez votre connexion");
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

type FolderSummaryRow = {
  gradeLevel: string;
  sectionKey: string | null;
  subject: string;
  total: number;
  processed: number;
};

type KBFile = {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  subject: string;
  gradeLevel: string;
  sectionKey: string | null;
  topic: string;
  contentType: string;
  // Status lifecycle:
  //   processing → AI extraction running
  //   pending_ai → waiting for Gemini quota / next startup retry
  //   ready      → AI done, questions are draft — admin must publish
  //   processed  → admin published all content
  //   error      → processing failed
  status: "processing" | "pending_ai" | "ready" | "processed" | "error";
  errorMessage: string | null;
  questionsCount: number;
  flashcardsCount: number;
  notionsCount: number;
  annalesCount: number;
  createdAt: string;
  processedAt: string | null;
};

type Level = "grades" | "subjects" | "files";

type GradeFolder = {
  gradeLevel: string;
  sectionKey: string | null;
  label: string;
};

// ── Grade level list ─────────────────────────────────────────────────────────

const GRADE_FOLDERS: GradeFolder[] = [
  // Collège & 1ère secondaire (tronc commun)
  { gradeLevel: "7eme",            sectionKey: null,                         label: "7ème année de base" },
  { gradeLevel: "8eme",            sectionKey: null,                         label: "8ème année de base" },
  { gradeLevel: "9eme",            sectionKey: null,                         label: "9ème année de base" },
  { gradeLevel: "1ere_secondaire", sectionKey: null,                         label: "1ère Secondaire" },
  // 2ème — 4 orientations (مسلك)
  { gradeLevel: "2eme",            sectionKey: "lettres",                    label: "2ème — Lettres" },
  { gradeLevel: "2eme",            sectionKey: "sciences",                   label: "2ème — Sciences" },
  { gradeLevel: "2eme",            sectionKey: "economie_services",          label: "2ème — Économie et Services" },
  { gradeLevel: "2eme",            sectionKey: "technologie_informatique",   label: "2ème — Technologie de l'Informatique" },
  // 3ème — 6 sections (شعبة)
  { gradeLevel: "3eme",            sectionKey: "lettres",                    label: "3ème — Lettres" },
  { gradeLevel: "3eme",            sectionKey: "mathematiques",              label: "3ème — Mathématiques" },
  { gradeLevel: "3eme",            sectionKey: "sciences_experimentales",    label: "3ème — Sciences Expérimentales" },
  { gradeLevel: "3eme",            sectionKey: "sciences_techniques",        label: "3ème — Sciences Techniques" },
  { gradeLevel: "3eme",            sectionKey: "economie_gestion",           label: "3ème — Économie et Gestion" },
  { gradeLevel: "3eme",            sectionKey: "sciences_informatique",      label: "3ème — Sciences de l'Informatique" },
  // Bac — 6 sections (شعبة)
  { gradeLevel: "bac",             sectionKey: "lettres",                    label: "Bac — Lettres" },
  { gradeLevel: "bac",             sectionKey: "mathematiques",              label: "Bac — Mathématiques" },
  { gradeLevel: "bac",             sectionKey: "sciences_experimentales",    label: "Bac — Sciences Expérimentales" },
  { gradeLevel: "bac",             sectionKey: "sciences_techniques",        label: "Bac — Sciences Techniques" },
  { gradeLevel: "bac",             sectionKey: "economie_gestion",           label: "Bac — Économie et Gestion" },
  { gradeLevel: "bac",             sectionKey: "sciences_informatique",      label: "Bac — Sciences de l'Informatique" },
];

const CONTENT_TYPES = [
  { value: "cours",     label: "Cours / Leçon" },
  { value: "examen",    label: "Examen / Contrôle" },
  { value: "exercices", label: "Exercices" },
  { value: "annale",    label: "Annale officielle" },
  { value: "resume",    label: "Résumé / Fiche" },
  { value: "manuel",    label: "Manuel scolaire" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fileIcon(name: string | null | undefined, mime?: string | null) {
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (mime?.includes("pdf") || ext === "pdf")   return <FileText className="w-4 h-4 text-red-500" />;
  if (ext === "txt")                             return <FileText className="w-4 h-4 text-gray-500" />;
  if (ext === "pptx")                            return <FileText className="w-4 h-4 text-orange-500" />;
  if (mime?.includes("image") || ["jpg","jpeg","png"].includes(ext))
                                                 return <FileImage className="w-4 h-4 text-blue-500" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

function StatusBadge({ status }: { status: KBFile["status"] | "pending_ai" }) {
  if (status === "processing") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <Loader2 className="w-3 h-3 animate-spin" /> En traitement
    </span>
  );
  if (status === "pending_ai") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      <Zap className="w-3 h-3" /> En attente IA
    </span>
  );
  if (status === "ready") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      <Eye className="w-3 h-3" /> À réviser
    </span>
  );
  if (status === "processed") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <CheckCircle2 className="w-3 h-3" /> Publié
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <AlertCircle className="w-3 h-3" /> Erreur
    </span>
  );
}

// ── Upload Modal ─────────────────────────────────────────────────────────────

type ManualContentType = "question" | "flashcard" | "exam";

interface ExamQ {
  question: string;
  answer: string;
  markScheme: string;
  points: string;
  difficulty: "facile" | "moyen" | "difficile";
}

const MANUAL_TYPES: { id: ManualContentType; label: string; desc: string; icon: any; activeClass: string; comingSoon?: boolean }[] = [
  {
    id: "question",
    label: "Banque de questions",
    desc: "Question avec corrigé",
    icon: BookOpen,
    activeClass: "border-primary bg-primary/5 text-primary",
  },
  {
    id: "flashcard",
    label: "Flashcards",
    desc: "Bientôt disponible",
    icon: Layers,
    activeClass: "border-border",
    comingSoon: true,
  },
  {
    id: "exam",
    label: "Examen pratique",
    desc: "Bientôt disponible",
    icon: FileText,
    activeClass: "border-border",
    comingSoon: true,
  },
];

const _DIFFICULTIES = [
  { value: "facile" as const,    label: "Facile" },
  { value: "moyen" as const,     label: "Moyen" },
  { value: "difficile" as const, label: "Difficile" },
];

function UploadModal({
  gradeFolder,
  subject,
  onClose,
  onUploaded,
}: {
  gradeFolder: GradeFolder;
  subject: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all";
  const selectCls = "w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all";

  // Shared
  const [contentType, setContentType] = useState<ManualContentType | null>(null);
  const [topic, setTopic]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  // Question form
  const [questionText, setQuestionText] = useState("");
  const [answer, setAnswer]             = useState("");
  const [points, setPoints]             = useState("");
  const [difficulty, setDifficulty]     = useState<"facile" | "moyen" | "difficile">("moyen");

  // Flashcard form
  const [front, setFront] = useState("");
  const [back, setBack]   = useState("");

  // Exam form
  const [examQuestions, setExamQuestions] = useState<ExamQ[]>([
    { question: "", answer: "", markScheme: "", points: "", difficulty: "moyen" },
  ]);
  const totalExamPoints = examQuestions.reduce((s, q) => s + (Number(q.points) || 0), 0);

  function addExamQ() {
    setExamQuestions(q => [...q, { question: "", answer: "", markScheme: "", points: "", difficulty: "moyen" }]);
  }
  function removeExamQ(i: number) {
    setExamQuestions(q => q.filter((_, j) => j !== i));
  }
  function updateExamQ<K extends keyof ExamQ>(i: number, field: K, val: ExamQ[K]) {
    setExamQuestions(q => q.map((x, j) => j === i ? { ...x, [field]: val } : x));
  }

  const canSubmit = !saving && !!topic && !!contentType && (
    contentType === "question"  ? !!questionText :
    contentType === "flashcard" ? !!(front && back) :
    contentType === "exam"      ? examQuestions.length > 0 && examQuestions.every(q => q.question) :
    false
  );

  async function handleSubmit() {
    if (!canSubmit || !contentType) return;
    setSaving(true);
    setError("");
    const base = {
      subject,
      gradeLevel: gradeFolder.gradeLevel,
      sectionKey: gradeFolder.sectionKey ?? null,
      topic,
    };
    try {
      let saved: { id: number } | null = null;

      if (contentType === "question") {
        saved = await apiFetch<{ id: number }>(`${SUPABASE_FN}/admin-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...base,
            type: "Exercice",
            difficulty,
            questionText,
            totalMarks: points ? Number(points) : null,
            parts: [],
            markScheme: answer ? [{ partLabel: "a", answer }] : [],
          }),
        });
      }

      if (saved === null) {
        // apiFetch already logged the HTTP error to console
        setError("Échec de l'enregistrement — ouvrez la console (F12) pour voir le détail de l'erreur.");
        return;
      }

      onUploaded();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  // File upload code preserved for future AI extraction feature (not shown in UI yet)
  const _uploadCodeReserved = {
    CONTENT_TYPES,
    handleFileUpload: async (_files: File[], _uploadContentType: string, _notes: string) => {
      const fd = new FormData();
      _files.forEach(f => fd.append("files", f));
      fd.append("subject",      subject);
      fd.append("grade_level",  gradeFolder.gradeLevel);
      if (gradeFolder.sectionKey) fd.append("section_key", gradeFolder.sectionKey);
      fd.append("topic",        topic);
      fd.append("content_type", _uploadContentType);
      if (_notes) fd.append("notes", _notes);
      const result = await apiFetch(`${API}/api/kb/upload`, { method: "POST", body: fd as any });
      if (result === null) throw new Error("Envoi échoué — vérifiez votre connexion");
    },
  };
  void _uploadCodeReserved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold">Ajouter des ressources</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{gradeFolder.label} → {subject}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Content type picker */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Type de contenu *</p>
            <div className="grid grid-cols-3 gap-2">
              {MANUAL_TYPES.map(t => {
                const Icon = t.icon;
                const isActive = contentType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={t.comingSoon}
                    onClick={() => !t.comingSoon && setContentType(t.id)}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all",
                      t.comingSoon
                        ? "border-border text-muted-foreground/50 cursor-not-allowed opacity-60"
                        : isActive
                          ? t.activeClass
                          : "border-border text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold leading-tight">{t.label}</span>
                    </div>
                    <span className="text-[11px] opacity-70">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic — shared by all types */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Chapitre / Thème *</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="ex. Fonctions affines, La cellule, La Révolution..."
              className={inputCls}
            />
          </div>

          {/* ── Question form ── */}
          {contentType === "question" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Énoncé de la question *</label>
                <textarea
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  rows={4}
                  placeholder="Tapez l'énoncé de la question..."
                  className={cn(inputCls, "resize-none")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Corrigé / Réponse *</label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  rows={3}
                  placeholder="Réponse attendue et éléments de correction..."
                  className={cn(inputCls, "resize-none")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Points (optionnel)</label>
                  <input
                    type="number"
                    min="0"
                    value={points}
                    onChange={e => setPoints(e.target.value)}
                    placeholder="ex. 4"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Difficulté (optionnel)</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as typeof difficulty)}
                    className={selectCls}
                  >
                    {_DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Flashcard form ── */}
          {contentType === "flashcard" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-blue-600">R</span>
                  </div>
                  <span className="text-sm font-bold">Recto — Question / Titre *</span>
                </div>
                <textarea
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  rows={5}
                  placeholder="Ce qui s'affiche en premier sur la carte..."
                  className={cn(inputCls, "resize-none")}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-green-600">V</span>
                  </div>
                  <span className="text-sm font-bold">Verso — Notes / Explication *</span>
                </div>
                <textarea
                  value={back}
                  onChange={e => setBack(e.target.value)}
                  rows={5}
                  placeholder="La réponse, la définition, l'explication..."
                  className={cn(inputCls, "resize-none")}
                />
              </div>
            </div>
          )}

          {/* ── Exam form ── */}
          {contentType === "exam" && (
            <div className="space-y-4">
              {examQuestions.map((q, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold">Question {i + 1}</span>
                    </div>
                    {examQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExamQ(i)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={q.question}
                    onChange={e => updateExamQ(i, "question", e.target.value)}
                    placeholder="Énoncé de la question *"
                    className={cn(inputCls, "resize-none")}
                  />
                  <textarea
                    rows={2}
                    value={q.answer}
                    onChange={e => updateExamQ(i, "answer", e.target.value)}
                    placeholder="Corrigé / Réponse attendue..."
                    className={cn(inputCls, "resize-none")}
                  />
                  <textarea
                    rows={2}
                    value={q.markScheme}
                    onChange={e => updateExamQ(i, "markScheme", e.target.value)}
                    placeholder="Barème / critères de notation (optionnel)..."
                    className={cn(inputCls, "resize-none")}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Points</label>
                      <input
                        type="number"
                        min="0"
                        value={q.points}
                        onChange={e => updateExamQ(i, "points", e.target.value)}
                        placeholder="ex. 4"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Difficulté</label>
                      <select
                        value={q.difficulty}
                        onChange={e => updateExamQ(i, "difficulty", e.target.value as ExamQ["difficulty"])}
                        className={selectCls}
                      >
                        {_DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addExamQ}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter une question
              </button>

              {totalExamPoints > 0 && (
                <p className="text-sm text-right text-muted-foreground">
                  Total calculé : <span className="font-bold text-foreground">{totalExamPoints} point{totalExamPoints > 1 ? "s" : ""}</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
              : <><CheckCircle2 className="w-4 h-4" /> Publier</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review & Publish Modal ───────────────────────────────────────────────────

type KBFileDetail = {
  file: KBFile;
  questions: { id: number; questionText: string; difficulty: string; type: string; topic: string; totalMarks: number | null; status: string }[];
  flashcards: { id: number; front: string; back: string }[];
  notions: { id: number; title: string }[];
  annales: { id: number; topic: string; year: number | null }[];
};

function ReviewModal({
  file,
  onClose,
  onPublished,
}: {
  file: KBFile;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [detail, setDetail]       = useState<KBFileDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    apiFetch(`${API}/api/kb/files/${file.id}`)
      .then((d: any) => setDetail(d))
      .catch(() => setError("Impossible de charger le contenu"))
      .finally(() => setLoading(false));
  }, [file.id]);

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    try {
      const result = await apiFetch(`${API}/api/kb/files/${file.id}/publish`, { method: "POST" });
      if (result === null) throw new Error("Échec de la publication");
      onPublished();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const draftCount = detail?.questions.filter(q => q.status === "draft").length ?? 0;
  const pubCount   = detail?.questions.filter(q => q.status === "published").length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold">Révision du contenu généré</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-sm">{file.fileName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && detail && (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Questions",   value: detail.questions.length, icon: Hash },
                  { label: "Flashcards",  value: detail.flashcards.length, icon: Layers },
                  { label: "Notions",     value: detail.notions.length, icon: BookOpen },
                  { label: "Annales",     value: detail.annales.length, icon: FileText },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-border bg-muted/20 p-4 text-center">
                    <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* Draft / published status */}
              {(draftCount > 0 || pubCount > 0) && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
                  <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-blue-800 dark:text-blue-300">
                      {draftCount > 0
                        ? `${draftCount} question${draftCount > 1 ? "s" : ""} en attente de publication`
                        : `${pubCount} question${pubCount > 1 ? "s" : ""} déjà publiée${pubCount > 1 ? "s" : ""}`}
                    </span>
                    {draftCount > 0 && (
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        Les flashcards et notions sont déjà visibles par les élèves.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Questions preview */}
              {detail.questions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Aperçu des questions ({detail.questions.length})
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {detail.questions.slice(0, 20).map((q, i) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20 text-sm">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground line-clamp-2">{q.questionText}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                              q.difficulty === "facile"    ? "bg-green-100 text-green-700" :
                              q.difficulty === "moyen"     ? "bg-amber-100 text-amber-700" :
                                                             "bg-red-100 text-red-700"
                            )}>
                              {q.difficulty}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{q.type}</span>
                            {q.totalMarks && (
                              <span className="text-[10px] text-muted-foreground">{q.totalMarks} pt{q.totalMarks > 1 ? "s" : ""}</span>
                            )}
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto",
                              q.status === "published"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            )}>
                              {q.status === "published" ? "Publié" : "Brouillon"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {detail.questions.length > 20 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        … et {detail.questions.length - 20} autres questions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Annales preview */}
              {detail.annales.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Examens / Annales générés ({detail.annales.length})
                  </p>
                  <div className="space-y-1.5">
                    {detail.annales.map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20 text-sm">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="flex-1 truncate">{a.topic}</span>
                        {a.year && <span className="text-xs text-muted-foreground">{a.year}</span>}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Publié</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            Fermer
          </button>
          {draftCount > 0 && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {publishing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication...</>
                : <><SendHorizonal className="w-4 h-4" /> Publier {draftCount} question{draftCount > 1 ? "s" : ""}</>}
            </button>
          )}
          {draftCount === 0 && pubCount > 0 && (
            <div className="flex-1 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-semibold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Tout est publié
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminKnowledgeBase() {
  const [level, setLevel]             = useState<Level>("grades");
  const [selGrade, setSelGrade]       = useState<GradeFolder | null>(null);
  const [selSubject, setSelSubject]   = useState<string | null>(null);
  const [summary, setSummary]         = useState<FolderSummaryRow[]>([]);
  const [files, setFiles]             = useState<KBFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [showUpload, setShowUpload]   = useState(false);
  const [reviewFile, setReviewFile]   = useState<KBFile | null>(null);
  const [pollingIds, setPollingIds]   = useState<number[]>([]);
  const [refresh, setRefresh]         = useState(0);

  // Load folder summary — always results in an array; never reaches .filter() as non-array
  useEffect(() => {
    apiFetchArray<FolderSummaryRow>(`${API}/api/kb/folder-summary`)
      .then(data => setSummary(Array.isArray(data) ? data : []));
  }, [refresh]);

  // Load files when inside a subject
  useEffect(() => {
    if (!selGrade || !selSubject) return;
    setFilesLoading(true);
    const params = new URLSearchParams({
      gradeLevel: selGrade.gradeLevel,
      subject:    selSubject,
      ...(selGrade.sectionKey ? { sectionKey: selGrade.sectionKey } : {}),
    });
    apiFetchArray<KBFile>(`${API}/api/kb/files?${params}`)
      .then(data => {
        const safeData = Array.isArray(data) ? data : [];
        setFiles(safeData);
        // Poll until no files are actively processing or pending_ai
        setPollingIds(safeData.filter(f => f.status === "processing" || f.status === "pending_ai").map(f => f.id));
      })
      .finally(() => setFilesLoading(false));
  }, [selGrade, selSubject, refresh]);

  // Poll processing files
  useEffect(() => {
    if (pollingIds.length === 0) return;
    const interval = setInterval(async () => {
      const raw = await apiFetchArray<KBFile>(
        `${API}/api/kb/files/status?ids=${pollingIds.join(",")}`,
      );
      const data = Array.isArray(raw) ? raw : [];
      setFiles(prev => (Array.isArray(prev) ? prev : []).map(f => data.find(d => d.id === f.id) ?? f));
      const still = data.filter(d => d.status === "processing" || d.status === "pending_ai").map(d => d.id);
      setPollingIds(still);
      if (still.length === 0) setRefresh(r => r + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingIds]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function countForGrade(g: GradeFolder) {
    const safe = Array.isArray(summary) ? summary : [];
    return safe.filter(
      r => r.gradeLevel === g.gradeLevel && r.sectionKey === g.sectionKey
    ).reduce((s, r) => s + r.total, 0);
  }

  function countForSubject(g: GradeFolder, sub: string) {
    const safe = Array.isArray(summary) ? summary : [];
    return safe.find(
      r => r.gradeLevel === g.gradeLevel && r.sectionKey === g.sectionKey && r.subject === sub
    )?.total ?? 0;
  }

  function getSubjectsForGrade(g: GradeFolder): string[] {
    return getSubjectsForNiveauSection(g.gradeLevel, g.sectionKey) as string[];
  }

  async function deleteFile(id: number) {
    if (!confirm("Supprimer ce fichier et tout son contenu généré ?")) return;
    await apiFetch(`${API}/api/kb/files/${id}`, { method: "DELETE" });
    setFiles(prev => prev.filter(f => f.id !== id));
    setRefresh(r => r + 1);
  }

  async function reprocessFile(id: number) {
    if (!confirm("Relancer le traitement IA pour ce fichier ? Le contenu généré précédemment sera supprimé.")) return;
    await apiFetch(`${API}/api/kb/files/${id}/reprocess`, { method: "POST" });
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "processing" as const } : f));
    setPollingIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }

  // ── Breadcrumb ───────────────────────────────────────────────────────────

  function Breadcrumb() {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <button
          onClick={() => { setLevel("grades"); setSelGrade(null); setSelSubject(null); }}
          className={cn("hover:text-foreground transition-colors", level === "grades" && "text-foreground font-semibold")}
        >
          Base de Connaissances
        </button>
        {selGrade && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <button
              onClick={() => { setLevel("subjects"); setSelSubject(null); }}
              className={cn("hover:text-foreground transition-colors", level === "subjects" && "text-foreground font-semibold")}
            >
              {selGrade.label}
            </button>
          </>
        )}
        {selSubject && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-semibold">{selSubject}</span>
          </>
        )}
      </div>
    );
  }

  // ── Level 1: Grade cards ─────────────────────────────────────────────────

  function GradeLevel() {
    const [aiRunning,       setAiRunning]       = useState(false);
    const [publishRunning,  setPublishRunning]  = useState(false);
    const [aiMsg,           setAiMsg]           = useState<string | null>(null);

    async function launchAi() {
      if (!confirm("Lancer le traitement IA sur tous les fichiers en attente ? Cela peut prendre plusieurs minutes.")) return;
      setAiRunning(true);
      setAiMsg(null);
      try {
        const data = await apiFetch<{ queued: number; message?: string }>(`${API}/api/kb/reprocess-all`, { method: "POST" });
        if (!data) {
          setAiMsg("Erreur lors du lancement du traitement IA.");
          return;
        }
        if (data.queued === 0) {
          setAiMsg("Aucun fichier en attente — tout est déjà traité ou en cours.");
        } else {
          setAiMsg(`${data.queued} fichier(s) mis en file d'attente. Le traitement démarre en arrière-plan (env. ${data.queued * 8}s).`);
          setTimeout(() => setRefresh(r => r + 1), data.queued * 8000 + 5000);
        }
      } catch {
        setAiMsg("Erreur lors du lancement du traitement IA.");
      } finally {
        setAiRunning(false);
      }
    }

    async function publishAll() {
      if (!confirm("Publier toutes les questions générées (statut « À réviser ») ? Elles seront immédiatement visibles par les élèves.")) return;
      setPublishRunning(true);
      setAiMsg(null);
      try {
        const data = await apiFetch<{ published: number; files: number; message?: string }>(`${API}/api/kb/publish-all-ready`, { method: "POST" });
        if (!data) {
          setAiMsg("Erreur lors de la publication.");
          return;
        }
        setAiMsg(data.message ?? `${data.published} question(s) publiées.`);
        setRefresh(r => r + 1);
      } catch {
        setAiMsg("Erreur lors de la publication.");
      } finally {
        setPublishRunning(false);
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Base de Connaissances</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sélectionner un niveau pour gérer son contenu.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin/manual-question">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                <PenLine className="w-4 h-4" />
                Saisie manuelle
              </button>
            </Link>
            <button
              onClick={publishAll}
              disabled={publishRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              <SendHorizonal className="w-4 h-4" />
              {publishRunning ? "Publication…" : "Publier tout"}
            </button>
            <button
              onClick={launchAi}
              disabled={aiRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {aiRunning ? "Traitement en cours…" : "Générer avec l'IA"}
            </button>
          </div>
        </div>
        {/* Manual entry banner — always visible */}
        <Link href="/admin/manual-question">
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <PenLine className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-primary">Saisie manuelle de contenu</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ajouter des questions, flashcards ou examens pratiques — publiés immédiatement sans IA</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary/60 shrink-0" />
          </div>
        </Link>

        {aiMsg && (
          <p className="text-sm px-4 py-3 rounded-xl bg-muted border border-border text-muted-foreground">{aiMsg}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {GRADE_FOLDERS.map(g => {
            const count = countForGrade(g);
            const key   = `${g.gradeLevel}_${g.sectionKey ?? ""}`;
            return (
              <button
                key={key}
                onClick={() => { setSelGrade(g); setLevel("subjects"); }}
                className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-background hover:bg-muted/40 hover:border-primary/30 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Folder className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{g.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {count > 0 ? `${count} fichier${count > 1 ? "s" : ""}` : "Vide"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }


  // ── Level 2: Subject folders ─────────────────────────────────────────────

  function SubjectLevel() {
    if (!selGrade) return null;
    const subjects = getSubjectsForGrade(selGrade);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLevel("grades"); setSelGrade(null); }}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{selGrade.label}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Sélectionner une matière.</p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune matière pour ce niveau.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {subjects.map(sub => {
              const count = countForSubject(selGrade, sub);
              return (
                <button
                  key={sub}
                  onClick={() => { setSelSubject(sub); setLevel("files"); }}
                  className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-background hover:bg-muted/40 hover:border-primary/30 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{sub}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count > 0 ? `${count} fichier${count > 1 ? "s" : ""}` : "Vide"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Level 3: Files in subject ────────────────────────────────────────────

  function FilesLevel() {
    if (!selGrade || !selSubject) return null;
    // Hard guard: never pass a non-array into .filter() / .map()
    const safeFiles = Array.isArray(files) ? files : [];

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setLevel("subjects"); setSelSubject(null); }}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{selSubject}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{selGrade.label}</p>
          </div>
          <button
            onClick={() => setRefresh(r => r + 1)}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter des ressources
          </button>
        </div>

        {/* Stats row */}
        {safeFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Fichiers",    value: safeFiles.length },
              { label: "Traités",     value: safeFiles.filter(f => f.status === "processed").length },
              { label: "Erreurs",     value: safeFiles.filter(f => f.status === "error").length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-border bg-muted/20 p-4 text-center">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* File list */}
        {filesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : safeFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
            <div>
              <p className="font-semibold">Aucune ressource</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cliquez sur « Ajouter des ressources » pour importer du contenu.
              </p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fichier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chapitre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Généré</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {safeFiles.map(f => (
                  <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {fileIcon(f.fileName, f.fileType)}
                        <span className="font-medium truncate max-w-[180px]">{f.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[140px]">
                      <span className="truncate block">{f.topic}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                        {CONTENT_TYPES.find(c => c.value === f.contentType)?.label ?? f.contentType}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(f.status === "ready" || f.status === "processed")
                        ? (
                          <span>
                            {f.questionsCount}q · {f.flashcardsCount}fc · {f.notionsCount}n
                            {f.annalesCount > 0 ? ` · ${f.annalesCount} ann.` : ""}
                          </span>
                        )
                        : f.status === "error"
                        ? <span className="text-red-500 text-xs" title={f.errorMessage ?? ""}>{f.errorMessage?.slice(0, 50) ?? "Traitement échoué"}</span>
                        : f.status === "pending_ai"
                        ? <span className="text-purple-600 text-xs">En attente de crédits IA</span>
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(f.createdAt).toLocaleDateString("fr-TN", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Review & Publish — shown for 'ready' files */}
                        {f.status === "ready" && (
                          <button
                            onClick={() => setReviewFile(f)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
                            title="Réviser et publier"
                          >
                            <Eye className="w-3 h-3" /> Réviser
                          </button>
                        )}
                        {/* View content — shown for published files */}
                        {f.status === "processed" && (
                          <button
                            onClick={() => setReviewFile(f)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Voir le contenu généré"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Reprocess — shown for error or pending_ai files */}
                        {(f.status === "error" || f.status === "pending_ai") && (
                          <button
                            onClick={() => reprocessFile(f.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="Relancer le traitement"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {f.fileUrl && (
                          <button
                            onClick={() => openStorageFile(f.fileUrl)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Ouvrir le fichier"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteFile(f.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Content by level */}
        {level === "grades"   && <GradeLevel />}
        {level === "subjects" && <SubjectLevel />}
        {level === "files"    && <FilesLevel />}
      </div>

      {/* Upload modal */}
      {showUpload && selGrade && selSubject && (
        <UploadModal
          gradeFolder={selGrade}
          subject={selSubject}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setRefresh(r => r + 1); }}
        />
      )}

      {/* Review & Publish modal */}
      {reviewFile && (
        <ReviewModal
          file={reviewFile}
          onClose={() => setReviewFile(null)}
          onPublished={() => { setReviewFile(null); setRefresh(r => r + 1); }}
        />
      )}
    </DashboardLayout>
  );
}
