/**
 * Admin Manual Content Entry
 * Add questions, flashcards, or practice exam questions manually.
 * All content goes live immediately — no AI needed.
 * Route: /admin/manual-question
 */

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Premium";
import {
  PenLine, Plus, Trash2, CheckCircle2, Loader2,
  ChevronLeft, BookOpen, FileText, Brain,
  Pencil, RefreshCw, Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

// ── Shared data ───────────────────────────────────────────────────────────────

type GradeOption = { value: string; label: string; sectionKey?: string };

const GRADE_OPTIONS: GradeOption[] = [
  // Collège & 1ère secondaire (tronc commun)
  { value: "7eme",            label: "7ème année de base" },
  { value: "8eme",            label: "8ème année de base" },
  { value: "9eme",            label: "9ème année de base" },
  { value: "1ere_secondaire", label: "1ère année secondaire" },
  // 2ème — 4 orientations (مسلك)
  { value: "2eme", sectionKey: "lettres",                  label: "2ème — Lettres" },
  { value: "2eme", sectionKey: "sciences",                 label: "2ème — Sciences" },
  { value: "2eme", sectionKey: "economie_services",        label: "2ème — Économie et Services" },
  { value: "2eme", sectionKey: "technologie_informatique", label: "2ème — Technologie de l'Informatique" },
  // 3ème — 6 sections (شعبة)
  { value: "3eme", sectionKey: "lettres",                  label: "3ème — Lettres" },
  { value: "3eme", sectionKey: "mathematiques",            label: "3ème — Mathématiques" },
  { value: "3eme", sectionKey: "sciences_experimentales",  label: "3ème — Sciences Expérimentales" },
  { value: "3eme", sectionKey: "sciences_techniques",      label: "3ème — Sciences Techniques" },
  { value: "3eme", sectionKey: "economie_gestion",         label: "3ème — Économie et Gestion" },
  { value: "3eme", sectionKey: "sciences_informatique",    label: "3ème — Sciences de l'Informatique" },
  // Bac — 6 sections (شعبة)
  { value: "bac",  sectionKey: "lettres",                  label: "Bac — Lettres" },
  { value: "bac",  sectionKey: "mathematiques",            label: "Bac — Mathématiques" },
  { value: "bac",  sectionKey: "sciences_experimentales",  label: "Bac — Sciences Expérimentales" },
  { value: "bac",  sectionKey: "sciences_techniques",      label: "Bac — Sciences Techniques" },
  { value: "bac",  sectionKey: "economie_gestion",         label: "Bac — Économie et Gestion" },
  { value: "bac",  sectionKey: "sciences_informatique",    label: "Bac — Sciences de l'Informatique" },
];

const ALL_SUBJECTS = [
  // 1ère secondaire — official subjects
  "Mathématiques",
  "Sciences Physiques",
  "Sciences de la Vie et de la Terre",
  "Technologie",
  "Français",
  "الجغرافيا",
  "التاريخ",
  "اللغة العربية / التربية الإسلامية",
  // Upper levels
  "Physique-Chimie",
  "Sciences Naturelles",
  "Informatique",
  "Arabe",
  "Anglais",
  "Espagnol",
  "Allemand",
  "Italien",
  "Histoire-Géographie",
  "Philosophie",
  "Économie",
  "Gestion",
  "Comptabilité",
  "Sciences de l'Ingénieur",
];

const QUESTION_TYPES = ["Exercice", "QCM", "Problème", "Rédaction"];
const DIFFICULTIES    = [
  { value: "facile",    label: "Facile" },
  { value: "moyen",     label: "Moyen" },
  { value: "difficile", label: "Difficile" },
];

// ── Style helpers ─────────────────────────────────────────────────────────────

const inputCls = (extra = "") =>
  cn("w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm",
     "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all", extra);

const selectCls = () =>
  cn("w-full h-10 rounded-xl border border-border bg-background px-3 text-sm",
     "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all");

// ── Chapter loader ─────────────────────────────────────────────────────────────

const SUPABASE_FN_MQ = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

function useChapterOptions(gradeKey: GradeOption | null, subject: string) {
  const [chapters, setChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!gradeKey || !subject) { setChapters([]); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const params = new URLSearchParams({ levelCode: gradeKey.value, subject });
    if (gradeKey.sectionKey) params.set("sectionKey", gradeKey.sectionKey);
    const token = (window as any).__etude_token ?? localStorage.getItem("auth_token") ?? "";
    fetch(`${SUPABASE_FN_MQ}/curriculum/chapters?${params}`, {
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: Array<{ name: string }>) => {
        if (!ctrl.signal.aborted) setChapters(data.map(c => c.name));
      })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
  }, [gradeKey?.value, gradeKey?.sectionKey, subject]);

  return { chapters, loading };
}

// ── Context picker (reused by all tabs) ───────────────────────────────────────

function ContextPicker({
  subject, setSubject,
  gradeKey, setGradeKey,
  topic, setTopic,
}: {
  subject: string; setSubject: (v: string) => void;
  gradeKey: GradeOption | null; setGradeKey: (v: GradeOption | null) => void;
  topic: string; setTopic: (v: string) => void;
}) {
  const { chapters, loading: chaptersLoading } = useChapterOptions(gradeKey, subject);
  const rtlSubjects = new Set(["الجغرافيا", "التاريخ", "اللغة العربية / التربية الإسلامية"]);
  const isRtl = rtlSubjects.has(subject);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Matière *</label>
        <select value={subject} onChange={e => { setSubject(e.target.value); setTopic(""); }} className={selectCls()} required>
          <option value="">Sélectionner...</option>
          {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Niveau / Orientation / Section *</label>
        <select
          value={gradeKey ? `${gradeKey.value}__${gradeKey.sectionKey ?? ""}` : ""}
          onChange={e => {
            const [val, sk] = e.target.value.split("__");
            setGradeKey(GRADE_OPTIONS.find(g => g.value === val && (g.sectionKey ?? "") === sk) ?? null);
            setTopic("");
          }}
          className={selectCls()} required
        >
          <option value="">Sélectionner...</option>
          {GRADE_OPTIONS.map(g => (
            <option key={`${g.value}__${g.sectionKey ?? ""}`} value={`${g.value}__${g.sectionKey ?? ""}`}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
          Chapitre / Thème *
        </label>
        {chapters.length > 0 ? (
          <select
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className={cn(selectCls(), isRtl && "text-right")}
            dir={isRtl ? "rtl" : "ltr"}
            required
          >
            <option value="">{chaptersLoading ? "Chargement…" : "Sélectionner…"}</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={chaptersLoading ? "Chargement des chapitres…" : "ex. Fonctions linéaires"}
            className={cn(inputCls(), isRtl && "text-right")}
            dir={isRtl ? "rtl" : "ltr"}
            required
          />
        )}
      </div>
    </div>
  );
}

// ── Success banner ────────────────────────────────────────────────────────────

function SuccessBanner({ label, id }: { label: string; id: number }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-5 py-4 flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
      <p className="text-sm font-semibold text-green-800 dark:text-green-300">
        {label} <span className="font-normal text-green-700 dark:text-green-400">#{id} ajouté — visible immédiatement pour les étudiants</span>
      </p>
    </div>
  );
}

// ── TAB 1: Question bank ──────────────────────────────────────────────────────

interface QuestionRow {
  id: number;
  subject: string;
  gradeLevel: string;
  sectionKey: string | null;
  topic: string;
  type: string;
  difficulty: string;
  questionText: string;
  totalMarks: number | null;
  status: string;
  source: string | null;
  kbFileId: number | null;
  createdAt: string;
  markScheme: Array<{ partLabel: string; answer: string; orderIndex: number }>;
}

const DIFF_BADGE: Record<string, string> = {
  facile:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  moyen:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  difficile: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function QuestionTab() {
  const { toast } = useToast();
  const [subject, setSubject]       = useState("");
  const [gradeKey, setGradeKey]     = useState<GradeOption | null>(null);
  const [topic, setTopic]           = useState("");
  const [type, setType]             = useState("Exercice");
  const [difficulty, setDifficulty] = useState("moyen");
  const [questionText, setQuestionText] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [simpleAnswer, setSimpleAnswer] = useState("");
  const [hasParts, setHasParts]     = useState(false);
  const [parts, setParts]           = useState([{ label: "a", text: "", marks: "", answer: "" }]);
  const [saving, setSaving]         = useState(false);

  const [questionList, setQuestionList] = useState<QuestionRow[]>([]);
  const [loadingList, setLoadingList]   = useState(false);
  const [editId, setEditId]             = useState<number | null>(null);

  // AI variation state
  const [variantPanelId, setVariantPanelId] = useState<number | null>(null);
  const [variantCount, setVariantCount]     = useState(5);
  const [generatingId, setGeneratingId]     = useState<number | null>(null);
  const [approvingId, setApprovingId]       = useState<number | null>(null);

  useEffect(() => {
    if (!subject || !gradeKey || !topic) { setQuestionList([]); return; }
    loadQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, gradeKey?.value, gradeKey?.sectionKey, topic]);

  async function loadQuestions() {
    setLoadingList(true);
    const params = new URLSearchParams({ subject, gradeLevel: gradeKey!.value, topic });
    if (gradeKey!.sectionKey) params.set("sectionKey", gradeKey!.sectionKey);
    const data = await apiFetch<QuestionRow[]>(`${SUPABASE_FN}/admin-questions?${params}`);
    setQuestionList(data ?? []);
    setLoadingList(false);
  }

  function startEdit(q: QuestionRow) {
    setEditId(q.id);
    setType(q.type ?? "Exercice");
    setDifficulty(q.difficulty ?? "moyen");
    setQuestionText(q.questionText ?? "");
    setTotalMarks(q.totalMarks != null ? String(q.totalMarks) : "");
    setHasParts(false);
    setSimpleAnswer(q.markScheme?.[0]?.answer ?? "");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditId(null);
    setQuestionText(""); setSimpleAnswer(""); setTotalMarks("");
    setParts([{ label: "a", text: "", marks: "", answer: "" }]); setHasParts(false);
  }

  async function generateVariations(q: QuestionRow) {
    setGeneratingId(q.id);
    setVariantPanelId(null);
    try {
      const res = await apiFetch<{ generated: number; message: string }>(
        `${SUPABASE_FN}/ai/question-variations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, count: variantCount }),
        },
      );
      if (!res) {
        toast({ title: "Erreur", description: "Génération échouée — vérifiez la console.", variant: "destructive" });
        return;
      }
      toast({ title: `${res.generated} variante(s) générée(s) ✓`, description: "Visibles ci-dessous avec le badge IA — approuvez-les pour les publier." });
      loadQuestions();
    } finally {
      setGeneratingId(null);
    }
  }

  async function approveQuestion(id: number) {
    setApprovingId(id);
    try {
      const res = await apiFetch<{ id: number; status: string }>(
        `${SUPABASE_FN}/admin-questions?id=${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        },
      );
      if (!res) {
        toast({ title: "Erreur", description: "Impossible de publier la question.", variant: "destructive" });
        return;
      }
      toast({ title: "Question publiée ✓", description: "Visible par les étudiants." });
      loadQuestions();
    } finally {
      setApprovingId(null);
    }
  }

  async function deleteQuestion(id: number) {
    if (!window.confirm("Supprimer cette question définitivement ?")) return;
    const res = await apiFetch<{ deleted: boolean }>(`${SUPABASE_FN}/admin-questions?id=${id}`, {
      method: "DELETE",
    });
    if (!res) {
      toast({ title: "Erreur", description: "Impossible de supprimer la question.", variant: "destructive" });
      return;
    }
    toast({ title: "Question supprimée" });
    loadQuestions();
  }

  function addPart() {
    setParts(p => [...p, { label: String.fromCharCode(97 + p.length), text: "", marks: "", answer: "" }]);
  }
  function removePart(i: number) {
    setParts(p => p.filter((_, j) => j !== i).map((x, j) => ({ ...x, label: String.fromCharCode(97 + j) })));
  }
  function updatePart(i: number, field: string, val: string) {
    setParts(p => p.map((x, j) => j === i ? { ...x, [field]: val } : x));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !gradeKey || !topic || !questionText) return;
    setSaving(true);
    try {
      const payload = {
        subject, gradeLevel: gradeKey.value, sectionKey: gradeKey.sectionKey ?? null,
        topic, type, difficulty, questionText,
        totalMarks: totalMarks ? Number(totalMarks) : null,
        parts: hasParts ? parts.map(p => ({ label: p.label, text: p.text, marks: Number(p.marks) || 0 })) : [],
        markScheme: hasParts
          ? parts.filter(p => p.answer).map(p => ({ partLabel: p.label, answer: p.answer }))
          : simpleAnswer ? [{ partLabel: "a", answer: simpleAnswer }] : [],
      };

      const url = editId
        ? `${SUPABASE_FN}/admin-questions?id=${editId}`
        : `${SUPABASE_FN}/admin-questions`;
      const method = editId ? "PUT" : "POST";

      const data = await apiFetch<{ id: number }>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!data) {
        toast({ title: "Erreur serveur", description: "Impossible d'enregistrer la question. Vérifiez la console (F12) pour le détail.", variant: "destructive" });
        return;
      }

      toast({ title: editId ? "Question mise à jour ✓" : "Question publiée dans la banque ✓" });
      setEditId(null);
      setQuestionText(""); setSimpleAnswer(""); setTotalMarks("");
      setParts([{ label: "a", text: "", marks: "", answer: "" }]); setHasParts(false);
      loadQuestions();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {/* Questions list */}
      {subject && gradeKey && topic && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              Questions enregistrées
              {questionList.length > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({questionList.length})</span>}
            </span>
            <button type="button" onClick={loadQuestions} disabled={loadingList}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <RefreshCw className={cn("w-3.5 h-3.5", loadingList && "animate-spin")} />
            </button>
          </div>

          {loadingList && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
            </div>
          )}

          {!loadingList && questionList.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune question pour ce chapitre.</p>
          )}

          {!loadingList && questionList.length > 0 && (
            <div className="space-y-2">
              {questionList.map(q => {
                const isAi = q.source === "ai" || q.kbFileId != null;
                const isDraft = q.status === "draft";
                const isGenerating = generatingId === q.id;
                const isApproving = approvingId === q.id;
                const showVariantPanel = variantPanelId === q.id;

                return (
                  <div key={q.id} className="rounded-xl border transition-colors overflow-hidden
                    border-border hover:border-primary/30">
                    <div className={cn("flex items-start gap-3 p-3",
                      editId === q.id ? "bg-primary/5" : isDraft ? "bg-amber-50/60 dark:bg-amber-900/10" : "")}>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 leading-snug">{q.questionText}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", DIFF_BADGE[q.difficulty] ?? DIFF_BADGE.moyen)}>
                            {q.difficulty}
                          </span>

                          {isAi ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              IA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Manuel
                            </span>
                          )}

                          {isDraft && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Brouillon
                            </span>
                          )}

                          {q.totalMarks != null && (
                            <span className="text-xs text-muted-foreground">{q.totalMarks} pts</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Approve button — only for AI draft questions */}
                        {isAi && isDraft && (
                          <button
                            type="button"
                            title="Approuver et publier"
                            disabled={isApproving}
                            onClick={() => approveQuestion(q.id)}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-40">
                            {isApproving
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Generate variations button */}
                        <button
                          type="button"
                          title="Générer des variantes IA"
                          disabled={isGenerating || generatingId !== null}
                          onClick={() => setVariantPanelId(showVariantPanel ? null : q.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors disabled:opacity-40",
                            showVariantPanel
                              ? "text-purple-600 bg-purple-100 dark:bg-purple-900/30"
                              : "text-muted-foreground hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30",
                          )}>
                          {isGenerating
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Sparkles className="w-3.5 h-3.5" />}
                        </button>

                        <button type="button" onClick={() => editId === q.id ? cancelEdit() : startEdit(q)}
                          className={cn("p-1.5 rounded-lg transition-colors",
                            editId === q.id
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => deleteQuestion(q.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Variant generation panel */}
                    {showVariantPanel && (
                      <div className="flex items-center gap-3 px-3 py-2.5 border-t border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Variantes à générer :</span>
                        <select
                          value={variantCount}
                          onChange={e => setVariantCount(Number(e.target.value))}
                          className="h-7 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-background text-xs px-2 focus:outline-none focus:border-purple-500">
                          {[1, 2, 3, 5, 8, 10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => generateVariations(q)}
                          className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors">
                          Générer →
                        </button>
                        <button
                          type="button"
                          onClick={() => setVariantPanelId(null)}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Add / Edit form */}
      <form onSubmit={submit} className="space-y-5">
        {editId && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">Mode édition — question #{editId}</span>
            <button type="button" onClick={cancelEdit}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
          </div>
        )}

        <Card className="p-5 space-y-4">
          <ContextPicker subject={subject} setSubject={setSubject} gradeKey={gradeKey} setGradeKey={setGradeKey} topic={topic} setTopic={setTopic} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className={selectCls()}>
                {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Difficulté</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={selectCls()}>
                {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Points</label>
              <input type="number" min="0" value={totalMarks} onChange={e => setTotalMarks(e.target.value)}
                placeholder="ex. 4" className={inputCls()} />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Énoncé de la question *</label>
          <textarea value={questionText} onChange={e => setQuestionText(e.target.value)}
            rows={4} placeholder="Tapez la question ici..." className={inputCls("resize-none")} required />

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium">Sous-questions (parties)</span>
            <button type="button" onClick={() => setHasParts(v => !v)}
              className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors",
                hasParts ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}>
              {hasParts ? "Supprimer les parties" : "Ajouter a), b), c)..."}
            </button>
          </div>

          {!hasParts && (
            <>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrigé / Réponse</label>
              <textarea value={simpleAnswer} onChange={e => setSimpleAnswer(e.target.value)}
                rows={3} placeholder="Réponse attendue..." className={inputCls("resize-none")} />
            </>
          )}

          {hasParts && (
            <div className="space-y-3">
              {parts.map((p, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{p.label})</span>
                    {parts.length > 1 && (
                      <button type="button" onClick={() => removePart(i)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3">
                      <textarea rows={2} value={p.text} onChange={e => updatePart(i, "text", e.target.value)}
                        placeholder={`Énoncé partie ${p.label})...`} className={inputCls("resize-none")} />
                    </div>
                    <div>
                      <input type="number" min="0" value={p.marks} onChange={e => updatePart(i, "marks", e.target.value)}
                        placeholder="pts" className={inputCls()} />
                    </div>
                  </div>
                  <textarea rows={2} value={p.answer} onChange={e => updatePart(i, "answer", e.target.value)}
                    placeholder={`Corrigé partie ${p.label})...`} className={inputCls("resize-none")} />
                </div>
              ))}
              <button type="button" onClick={addPart}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                <Plus className="w-4 h-4" /> Ajouter une partie
              </button>
            </div>
          )}
        </Card>

        <button type="submit" disabled={!subject || !gradeKey || !topic || !questionText || saving}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
            : editId
              ? <><CheckCircle2 className="w-4 h-4" /> Mettre à jour la question</>
              : <><CheckCircle2 className="w-4 h-4" /> Publier dans la banque de questions</>}
        </button>
      </form>
    </div>
  );
}

// ── TAB 2: Flashcard (coming soon) ───────────────────────────────────────────

function FlashcardTab() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 flex flex-col items-center gap-3 text-center">
      <Brain className="w-8 h-8 text-muted-foreground/40" />
      <p className="text-base font-semibold">Bientôt disponible</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        La création de flashcards sera disponible prochainement. Utilisez la <strong>Banque de questions</strong> pour ajouter du contenu dès maintenant.
      </p>
    </div>
  );
}

// ── TAB 3: Practice exam (coming soon) ───────────────────────────────────────

function PracticeExamTab() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 flex flex-col items-center gap-3 text-center">
      <FileText className="w-8 h-8 text-muted-foreground/40" />
      <p className="text-base font-semibold">Bientôt disponible</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        La création d'examens pratiques sera disponible prochainement. Utilisez la <strong>Banque de questions</strong> pour ajouter du contenu dès maintenant.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "question" | "flashcard" | "exam";

const TABS: { id: Tab; label: string; desc: string; icon: any; color: string; active: string; comingSoon?: boolean }[] = [
  {
    id: "question",  label: "Banque de questions", desc: "Questions avec corrigé notées",
    icon: BookOpen,
    color: "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
    active: "border-primary bg-primary/5 text-primary",
  },
  {
    id: "flashcard", label: "Flashcards", desc: "Bientôt disponible",
    icon: Brain,
    color: "border-border text-muted-foreground/50",
    active: "border-border text-muted-foreground/50",
    comingSoon: true,
  },
  {
    id: "exam", label: "Examen pratique", desc: "Bientôt disponible",
    icon: FileText,
    color: "border-border text-muted-foreground/50",
    active: "border-border text-muted-foreground/50",
    comingSoon: true,
  },
];

export function AdminManualQuestion() {
  const [tab, setTab] = useState<Tab>("question");

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link href="/admin/knowledge-base"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ChevronLeft className="w-4 h-4" /> Base de connaissances
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PenLine className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Saisie manuelle</h1>
              <p className="text-muted-foreground text-sm">Contenu publié immédiatement — visible par les étudiants sans attendre l'IA</p>
            </div>
          </div>
        </div>

        {/* Tab picker */}
        <div className="grid grid-cols-3 gap-3">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all",
                  t.comingSoon ? "opacity-50" : "",
                  isActive ? t.active : t.color,
                )}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-bold">{t.label}</span>
                </div>
                <span className="text-xs opacity-70">{t.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        {tab === "question"  && <QuestionTab />}
        {tab === "flashcard" && <FlashcardTab />}
        {tab === "exam"      && <PracticeExamTab />}

      </div>
    </DashboardLayout>
  );
}
