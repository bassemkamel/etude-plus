import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, Button, Input, Label, Badge } from "@/components/ui/Premium";
import {
  BrainCircuit, Sparkles, ChevronRight, Loader2, RefreshCcw, Save,
  CheckCircle2, Calculator, Clock, Eye, EyeOff, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getToken } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  SIMPLE_LEVELS, SECTION_LEVELS, getSubjectsForNiveauSection,
  getNiveauLabel, getSectionLabel, isSimpleLevel, isSectionLevel,
} from "@/lib/educationConfig";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function adminFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  return data;
}

// ── Education structure helpers ───────────────────────────────────────────────

type NiveauOption = { key: string; label: string; needsSection: boolean };
const ALL_NIVEAUX: NiveauOption[] = [
  ...Object.entries(SIMPLE_LEVELS).map(([key, v]) => ({
    key, label: v.label, needsSection: false,
  })),
  ...Object.entries(SECTION_LEVELS).map(([key, v]) => ({
    key, label: v.label, needsSection: true,
  })),
];

function getSectionsFor(niveauKey: string): { key: string; label: string }[] {
  const level = (SECTION_LEVELS as any)[niveauKey];
  if (!level) return [];
  return Object.entries(level.sections as Record<string, { label: string }>).map(([k, v]) => ({
    key: k, label: v.label,
  }));
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPES = ["Exercice", "QCM", "Problème", "Rédaction"];
const DIFFICULTIES = [
  { key: "facile",    label: "Facile",    color: "bg-green-100 text-green-700 border-green-200" },
  { key: "moyen",     label: "Moyen",     color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "difficile", label: "Difficile", color: "bg-red-100 text-red-700 border-red-200" },
];
const LANGUAGES = ["Français", "Arabe", "Anglais"];

// ── GeneratedQuestion type ────────────────────────────────────────────────────

interface QPart {
  label: string;
  text: string;
  marks: number;
}
interface QMarkScheme {
  label: string;
  answer: string;
  marks_breakdown: string;
}
interface GeneratedQuestion {
  question_text: string;
  context: string | null;
  requires_calculator: boolean;
  parts: QPart[];
  mark_scheme: QMarkScheme[];
  difficulty: string;
  type: string;
  estimated_time_minutes: number;
}

// ── Field Components ──────────────────────────────────────────────────────────

function SelectField({
  label, value, onChange, children, required,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div>
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminQuestionsGenerate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Form state
  const [niveauKey, setNiveauKey]   = useState("");
  const [sectionKey, setSectionKey] = useState("");
  const [subject, setSubject]       = useState("");
  const [topic, setTopic]           = useState("");
  const [type, setType]             = useState("Exercice");
  const [difficulty, setDifficulty] = useState("moyen");
  const [numParts, setNumParts]     = useState(3);
  const [totalMarks, setTotalMarks] = useState(6);
  const [language, setLanguage]     = useState("Français");
  const [instructions, setInstructions] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState<GeneratedQuestion | null>(null);
  const [edited, setEdited]         = useState<GeneratedQuestion | null>(null);
  const [showScheme, setShowScheme] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const niveau = ALL_NIVEAUX.find(n => n.key === niveauKey);
  const sections = niveau?.needsSection ? getSectionsFor(niveauKey) : [];
  const effectiveSection = niveau?.needsSection ? sectionKey : null;
  const subjects = niveauKey
    ? (getSubjectsForNiveauSection(niveauKey, effectiveSection) as readonly string[])
    : [];

  function handleNiveauChange(key: string) {
    setNiveauKey(key);
    setSectionKey("");
    setSubject("");
  }
  function handleSectionChange(key: string) {
    setSectionKey(key);
    setSubject("");
  }

  const q = edited ?? generated;

  async function handleGenerate() {
    if (!niveauKey || !subject || !topic.trim() || !type || !difficulty) {
      toast({ title: "Champs requis", description: "Remplissez tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    if (niveau?.needsSection && !sectionKey) {
      toast({ title: "Section requise", description: "Sélectionnez une section pour ce niveau.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGenerated(null);
    setEdited(null);
    setSaved(false);

    try {
      const data = await adminFetch(`${API_URL}/admin/questions/generate`, {
        method: "POST",
        body: JSON.stringify({
          gradeLevel: niveauKey, sectionKey: effectiveSection,
          subject, topic: topic.trim(), type, difficulty, numParts, totalMarks, language,
          instructions: instructions.trim() || undefined,
        }),
      });
      setGenerated(data.generated);
      setEdited(null);
    } catch (err: any) {
      toast({ title: "Erreur de génération", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  function updateEdited(patch: Partial<GeneratedQuestion>) {
    setEdited(prev => ({ ...(prev ?? generated!), ...patch }));
  }
  function updatePart(idx: number, patch: Partial<QPart>) {
    const parts = [...(q?.parts ?? [])];
    parts[idx] = { ...parts[idx], ...patch };
    updateEdited({ parts });
  }
  function updateScheme(idx: number, patch: Partial<QMarkScheme>) {
    const ms = [...(q?.mark_scheme ?? [])];
    ms[idx] = { ...ms[idx], ...patch };
    updateEdited({ mark_scheme: ms });
  }
  function addPart() {
    const parts = [...(q?.parts ?? [])];
    const nextLabel = String.fromCharCode(97 + parts.length); // a, b, c…
    parts.push({ label: nextLabel, text: "", marks: 1 });
    const ms = [...(q?.mark_scheme ?? [])];
    ms.push({ label: nextLabel, answer: "", marks_breakdown: "" });
    updateEdited({ parts, mark_scheme: ms });
  }
  function removePart(idx: number) {
    const parts = (q?.parts ?? []).filter((_, i) => i !== idx);
    const ms = (q?.mark_scheme ?? []).filter((_, i) => i !== idx);
    updateEdited({ parts, mark_scheme: ms });
  }

  async function handleSave(status: "draft" | "published") {
    if (!q) return;
    setSaving(true);
    try {
      await adminFetch(`${API_URL}/admin/questions`, {
        method: "POST",
        body: JSON.stringify({
          gradeLevel: niveauKey,
          sectionKey: effectiveSection,
          subject, topic: topic.trim(), type,
          difficulty: q.difficulty, language, status,
          questionText: q.question_text,
          context: q.context,
          requiresCalculator: q.requires_calculator,
          totalMarks,
          estimatedTimeMinutes: q.estimated_time_minutes,
          parts: q.parts.map((p, i) => ({ label: p.label, text: p.text, marks: p.marks, orderIndex: i })),
          markScheme: q.mark_scheme.map((m, i) => ({
            label: m.label, answer: m.answer, marks_breakdown: m.marks_breakdown, orderIndex: i,
          })),
        }),
      });
      setSaved(true);
      toast({
        title: status === "published" ? "Question publiée !" : "Brouillon sauvegardé",
        description: status === "published"
          ? "La question est maintenant visible dans la banque."
          : "La question a été sauvegardée en brouillon.",
      });
    } catch (err: any) {
      toast({ title: "Erreur de sauvegarde", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const diffConfig = DIFFICULTIES.find(d => d.key === (q?.difficulty ?? difficulty));

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <BrainCircuit className="w-4 h-4" />
            <Link href="/admin/questions" className="hover:text-foreground transition-colors">
              Gestion des Questions
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span>Générer une Question</span>
          </div>
          <h1 className="text-2xl font-bold">Générer une Question IA</h1>
          <p className="text-muted-foreground mt-1">
            Remplissez les paramètres, puis cliquez sur "Générer" pour créer une question avec l'IA.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* ── Left: Generation Form ─────────────────────────────────────── */}
          <Card className="p-6 space-y-5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Paramètres de génération
            </h2>

            {/* Niveau */}
            <SelectField label="Niveau scolaire" value={niveauKey} onChange={handleNiveauChange} required>
              <option value="">— Sélectionner —</option>
              {ALL_NIVEAUX.map(n => (
                <option key={n.key} value={n.key}>{n.label}</option>
              ))}
            </SelectField>

            {/* Section (conditional) */}
            {niveau?.needsSection && (
              <SelectField label="Section" value={sectionKey} onChange={handleSectionChange} required>
                <option value="">— Sélectionner la section —</option>
                {sections.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </SelectField>
            )}

            {/* Matière */}
            <SelectField
              label="Matière"
              value={subject}
              onChange={setSubject}
              required
            >
              <option value="">— Sélectionner —</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SelectField>

            {/* Chapitre */}
            <div>
              <Label>Chapitre / Thème <span className="text-destructive">*</span></Label>
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="ex. Équations du premier degré"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <SelectField label="Type de question" value={type} onChange={setType} required>
                {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </SelectField>

              {/* Difficulté */}
              <SelectField label="Difficulté" value={difficulty} onChange={setDifficulty} required>
                {DIFFICULTIES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </SelectField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Sous-parties */}
              <SelectField label="Nombre de sous-parties" value={String(numParts)} onChange={v => setNumParts(parseInt(v))}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </SelectField>

              {/* Note max */}
              <div>
                <Label>Note maximale</Label>
                <Input
                  type="number"
                  min={1} max={40}
                  value={totalMarks}
                  onChange={e => setTotalMarks(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Langue */}
            <SelectField label="Langue de la question" value={language} onChange={setLanguage}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </SelectField>

            {/* Instructions supplémentaires */}
            <div>
              <Label>Instructions supplémentaires (optionnel)</Label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                placeholder="ex. Inclure un tableau de données, contexte de la vie réelle, style Bac..."
                className="flex w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all resize-none"
              />
            </div>

            <Button
              onClick={handleGenerate}
              isLoading={generating}
              className="w-full gap-2"
              size="lg"
            >
              {!generating && <Sparkles className="w-5 h-5" />}
              {generating ? "Génération en cours..." : "Générer la Question"}
            </Button>
          </Card>

          {/* ── Right: Preview / Edit ──────────────────────────────────────── */}
          <div className="space-y-4">
            {generating && (
              <Card className="p-8 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <p className="font-semibold text-lg">Génération en cours…</p>
                <p className="text-muted-foreground text-sm text-center max-w-xs">
                  L'IA rédige votre question en respectant le programme tunisien officiel.
                </p>
              </Card>
            )}

            {!generating && !q && (
              <Card className="p-8 flex flex-col items-center justify-center gap-3 min-h-[400px] border-dashed">
                <BrainCircuit className="w-12 h-12 text-muted-foreground/30" />
                <p className="font-semibold text-muted-foreground">La question générée apparaîtra ici</p>
                <p className="text-sm text-muted-foreground/60 text-center">
                  Remplissez le formulaire et cliquez sur "Générer"
                </p>
              </Card>
            )}

            {!generating && q && (
              <>
                {/* Question preview card */}
                <Card className="p-6 space-y-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-bold text-base">Aperçu de la question</h3>
                    <div className="flex items-center gap-2">
                      {diffConfig && (
                        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", diffConfig.color)}>
                          {diffConfig.label}
                        </span>
                      )}
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                        {q.type}
                      </span>
                      {q.requires_calculator && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full">
                          <Calculator className="w-3 h-3" /> Calculatrice
                        </span>
                      )}
                      {q.estimated_time_minutes && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {q.estimated_time_minutes} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question text (editable) */}
                  <div>
                    <Label>Énoncé de la question</Label>
                    <textarea
                      value={q.question_text}
                      onChange={e => updateEdited({ question_text: e.target.value })}
                      rows={4}
                      className="flex w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all resize-none"
                    />
                  </div>

                  {/* Context (if any) */}
                  {q.context && (
                    <div>
                      <Label>Contexte / Tableau</Label>
                      <div
                        className="p-3 rounded-xl bg-muted/50 border border-border text-sm overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: q.context }}
                      />
                    </div>
                  )}

                  {/* Parts (editable) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="mb-0">Sous-parties</Label>
                      <button
                        onClick={addPart}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>
                    {q.parts.map((part, idx) => (
                      <div key={idx} className="flex gap-2 items-start p-3 rounded-xl bg-muted/30 border border-border">
                        <span className="font-bold text-sm mt-3 min-w-[20px]">{part.label}.</span>
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={part.text}
                            onChange={e => updatePart(idx, { text: e.target.value })}
                            rows={2}
                            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary transition-all resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Barème :</span>
                            <input
                              type="number"
                              min={0} max={99}
                              value={part.marks}
                              onChange={e => updatePart(idx, { marks: parseInt(e.target.value) || 0 })}
                              className="w-16 h-8 rounded-lg border border-border bg-background px-2 text-sm text-center focus-visible:outline-none focus-visible:border-primary"
                            />
                            <span className="text-xs text-muted-foreground">pts</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removePart(idx)}
                          className="mt-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Controls row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={q.requires_calculator}
                        onChange={e => updateEdited({ requires_calculator: e.target.checked })}
                        className="rounded border-border"
                      />
                      Calculatrice autorisée
                    </label>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Difficulté :</span>
                      {DIFFICULTIES.map(d => (
                        <button
                          key={d.key}
                          onClick={() => updateEdited({ difficulty: d.key })}
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full border transition-all",
                            q.difficulty === d.key ? d.color : "bg-muted/50 text-muted-foreground border-border"
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Mark scheme (collapsible) */}
                <Card className="overflow-hidden">
                  <button
                    onClick={() => setShowScheme(s => !s)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-semibold text-sm">Corrigé / Barème</span>
                    {showScheme
                      ? <EyeOff className="w-4 h-4 text-muted-foreground" />
                      : <Eye className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                  {showScheme && (
                    <div className="px-6 pb-5 space-y-3 border-t border-border">
                      {q.mark_scheme.map((ms, idx) => (
                        <div key={idx} className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                            Partie {ms.label}
                          </p>
                          <textarea
                            value={ms.answer}
                            onChange={e => updateScheme(idx, { answer: e.target.value })}
                            rows={2}
                            placeholder="Réponse modèle..."
                            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary transition-all resize-none"
                          />
                          <textarea
                            value={ms.marks_breakdown}
                            onChange={e => updateScheme(idx, { marks_breakdown: e.target.value })}
                            rows={1}
                            placeholder="Répartition des points..."
                            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground focus-visible:outline-none focus-visible:border-primary transition-all resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Action buttons */}
                {!saved ? (
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={() => handleSave("published")}
                      isLoading={saving}
                      className="flex-1 gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approuver & Publier
                    </Button>
                    <Button
                      onClick={() => handleSave("draft")}
                      isLoading={saving}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Sauvegarder le brouillon
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      variant="ghost"
                      className="gap-2"
                      title="Régénérer avec les mêmes paramètres"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Régénérer
                    </Button>
                  </div>
                ) : (
                  <Card className="p-5 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-800 dark:text-green-300">Question sauvegardée !</p>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                          La question a été enregistrée avec succès.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={() => { setGenerated(null); setEdited(null); setSaved(false); }}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Générer une autre
                      </Button>
                      <Link href="/admin/questions">
                        <Button size="sm" variant="ghost" className="gap-2">
                          Voir dans la banque
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
