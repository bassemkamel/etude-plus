"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, Input, Label, PageHeader, Textarea } from "@/components/ui/Premium";
import { LevelPicker } from "@/components/shared/LevelPicker";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { getClassLevelLabel, getSubjectsForNiveauSection } from "@etudeplus/shared";

const AI_QUESTION_TYPES = [
  { value: "QCM", label: "QCM" },
  { value: "Exercice", label: "Exercice" },
  { value: "Probleme", label: "Problème" },
  { value: "Redaction", label: "Rédaction" },
] as const;

type AiGenerationProgress = {
  status: "preparing" | "reading" | "generating" | "saving" | "completed" | "failed";
  progress: number;
  message: string;
  currentChunk: number;
  totalChunks: number;
  result?: any;
  error?: string;
};

type QuestionFormValues = {
  gradeLevel: string;
  sectionKey: string;
  subject: string;
};

type CurriculumChapter = {
  id: string;
  levelCode: string;
  sectionKey: string;
  subject: string;
  name: string;
  isActive: boolean;
};

function hasValidEducationSelection(form: QuestionFormValues): boolean {
  return Boolean(
    form.gradeLevel &&
    form.subject &&
    getSubjectsForNiveauSection(form.gradeLevel, form.sectionKey || null).includes(form.subject),
  );
}

function getAvailableChapters(chapters: CurriculumChapter[], form: QuestionFormValues): CurriculumChapter[] {
  return chapters.filter((chapter) =>
    chapter.isActive &&
    chapter.levelCode === form.gradeLevel &&
    (chapter.sectionKey === "" || chapter.sectionKey === form.sectionKey) &&
    chapter.subject === form.subject,
  );
}

function hasValidChapterSelection(
  form: QuestionFormValues & { topic: string },
  chapters: CurriculumChapter[],
): boolean {
  if (!hasValidEducationSelection(form)) return false;
  if (!form.topic) return false;
  return getAvailableChapters(chapters, form).some((chapter) => chapter.name === form.topic);
}

function EducationFields({
  form,
  onChange,
}: {
  form: QuestionFormValues;
  onChange: (values: QuestionFormValues) => void;
}) {
  const subjects = getSubjectsForNiveauSection(form.gradeLevel, form.sectionKey || null);
  const selectedSubject = subjects.includes(form.subject) ? form.subject : "";

  return (
    <>
      <div className="sm:col-span-2">
        <Label>Niveau et section</Label>
        <LevelPicker
          niveauValue={form.gradeLevel}
          sectionValue={form.sectionKey || null}
          onChange={(gradeLevel, sectionKey) => {
            const nextSubjects = getSubjectsForNiveauSection(gradeLevel, sectionKey);
            onChange({
              gradeLevel,
              sectionKey: sectionKey ?? "",
              subject: nextSubjects[0] ?? "",
            });
          }}
        />
      </div>
      <div>
        <Label>Matière</Label>
        <select
          className="h-11 w-full rounded-xl border-2 border-border px-3 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedSubject}
          disabled={!subjects.length}
          onChange={(event) => onChange({ ...form, subject: event.target.value })}
        >
          <option value="">Sélectionner une matière</option>
          {subjects.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function ChapterField({
  chapters,
  value,
  onChange,
  form,
  returnTab,
}: {
  chapters: CurriculumChapter[];
  value: string;
  onChange: (chapter: string) => void;
  form: QuestionFormValues;
  returnTab: "new" | "ai";
}) {
  const selectedChapter = chapters.some((chapter) => chapter.name === value) ? value : "";
  const returnQuery = new URLSearchParams({
    returnTab,
    gradeLevel: form.gradeLevel,
    sectionKey: form.sectionKey,
    subject: form.subject,
  }).toString();

  return (
    <div>
      <Label>Chapitre</Label>
      <select
        className="h-11 w-full rounded-xl border-2 border-border px-3 disabled:cursor-not-allowed disabled:opacity-50"
        value={selectedChapter}
        disabled={!chapters.length}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{chapters.length ? "Sélectionner un chapitre" : "Aucun chapitre disponible"}</option>
        {chapters.map((chapter) => (
          <option key={chapter.id} value={chapter.name}>{chapter.name}</option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Chapitre introuvable ?{" "}
        <Link href={`/admin/curriculum?${returnQuery}`} className="font-medium text-primary underline underline-offset-2">
          Créez-le dans le curriculum
        </Link>
        .
      </p>
    </div>
  );
}

function QuestionsInner() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"list" | "new" | "ai">("list");
  const [selectedQuestionGroup, setSelectedQuestionGroup] = useState("");
  useEffect(() => {
    const returnTab = new URLSearchParams(window.location.search).get("tab");
    if (returnTab === "new" || returnTab === "ai") setTab(returnTab);
  }, []);
  const [status, setStatus] = useState("");
  const { data: questions = [] } = useQuery({
    queryKey: ["admin-q", status],
    queryFn: () => api<any[]>(`/api/v1/admin/questions${status ? `?status=${status}` : ""}`),
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: () => api<CurriculumChapter[]>("/api/v1/admin/curriculum/chapters"),
  });
  const [form, setForm] = useState({
    gradeLevel: "",
    sectionKey: "",
    subject: "",
    topic: "",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "",
    partText: "",
    answer: "",
    status: "draft",
  });
  const [educationPickerKey, setEducationPickerKey] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("gradeLevel") && params.has("sectionKey") && params.has("subject")) {
      setForm((current) => ({
        ...current,
        gradeLevel: params.get("gradeLevel") ?? current.gradeLevel,
        sectionKey: params.get("sectionKey") ?? current.sectionKey,
        subject: params.get("subject") ?? current.subject,
      }));
      setEducationPickerKey((key) => key + 1);
    }
  }, []);
  const availableChapters = getAvailableChapters(chapters, form);
  const [ai, setAi] = useState<any>(null);
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiQuestionTypes, setAiQuestionTypes] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState<AiGenerationProgress | null>(null);

  async function save(origin = "manual", extra: any = {}) {
    if (!hasValidChapterSelection(form, chapters)) {
      toast({ title: "Choisissez un niveau, une section, une matière et un chapitre existant", variant: "destructive" });
      return;
    }
    try {
      await api("/api/v1/admin/questions", {
        method: "POST",
        body: JSON.stringify({
          origin,
          status: extra.status ?? form.status,
          gradeLevel: form.gradeLevel,
          sectionKey: form.sectionKey,
          subject: form.subject,
          topic: extra.topic ?? form.topic,
          type: extra.type ?? form.type,
          difficulty: extra.difficulty ?? form.difficulty,
          questionText: extra.questionText ?? form.questionText,
          parts: extra.parts ?? [{ label: "a", text: form.partText || form.questionText, marks: 4 }],
          markSchemes: extra.markSchemes ?? [{ partLabel: "a", answer: form.answer, marksBreakdown: "4 pts" }],
        }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-q"] });
      toast({ title: "Question enregistree" });
      setTab("list");
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function generate() {
    if (!hasValidChapterSelection(form, chapters)) {
      toast({ title: "Choisissez un niveau, une section, une matière et un chapitre existant", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(aiQuestionCount) || aiQuestionCount < 1 || aiQuestionCount > 50) {
      toast({ title: "Le nombre de questions doit être compris entre 1 et 50", variant: "destructive" });
      return;
    }
    if (!aiQuestionTypes.length) {
      toast({ title: "Sélectionnez au moins un type de question", variant: "destructive" });
      return;
    }
    if (!aiFiles.length) {
      toast({ title: "Ajoutez au moins un PDF", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiProgress({
      status: "preparing",
      progress: 0,
      message: "Envoi et préparation des documents",
      currentChunk: 0,
      totalChunks: 0,
    });
    try {
      const files = await Promise.all(
        aiFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type || "application/pdf",
          data: await fileToBase64(file),
        })),
      );
      const started = await api<any>("/api/v1/admin/questions/generate", {
        method: "POST",
        body: JSON.stringify({
          files,
          count: aiQuestionCount,
          types: aiQuestionTypes,
          gradeLevel: form.gradeLevel,
          sectionKey: form.sectionKey,
          subject: form.subject,
          topic: form.topic,
          difficulty: form.difficulty,
          status: "draft",
        }),
      });
      if (!started.jobId) {
        setAi(started);
        await qc.invalidateQueries({ queryKey: ["admin-q"] });
        toast({ title: `${started.questions?.length ?? 0} questions enregistrees en brouillon` });
        setTab("list");
        return;
      }
      let progress: AiGenerationProgress;
      let pollingNetworkRetries = 0;
      while (true) {
        try {
          progress = await api<AiGenerationProgress>(`/api/v1/admin/questions/generate/${started.jobId}`);
          pollingNetworkRetries = 0;
        } catch (error) {
          if (error instanceof ApiError || pollingNetworkRetries >= 5) throw error;
          pollingNetworkRetries += 1;
          setAiProgress((current) => current ? {
            ...current,
            message: `Connexion à l'API interrompue; nouvelle tentative ${pollingNetworkRetries}/5`,
          } : current);
          await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (pollingNetworkRetries - 1)));
          continue;
        }
        setAiProgress(progress);
        if (progress.status === "completed") break;
        if (progress.status === "failed") throw new Error(progress.error || progress.message);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      const data = progress.result;
      setAi(data);
      await qc.invalidateQueries({ queryKey: ["admin-q"] });
      toast({ title: `${data.questions?.length ?? 0} questions enregistrees en brouillon` });
      setTab("list");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : (e as ApiError).message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  async function publish(id: string) {
    await api(`/api/v1/admin/questions/${id}/publish`, { method: "POST" });
    await qc.invalidateQueries({ queryKey: ["admin-q"] });
    toast({ title: "Publiee" });
  }

  const questionsByLevel = new Map<string, any[]>();
  for (const question of questions) {
    const key = JSON.stringify([question.gradeLevel ?? "", question.sectionKey ?? ""]);
    const group = questionsByLevel.get(key) ?? [];
    group.push(question);
    questionsByLevel.set(key, group);
  }
  const questionGroups = Array.from(questionsByLevel, ([key, group]) => {
    const [gradeLevel, sectionKey] = JSON.parse(key) as [string, string];
    return {
      key,
      group,
      label: getClassLevelLabel(gradeLevel, sectionKey || null),
    };
  });
  const activeQuestionGroup = questionGroups.find((group) => group.key === selectedQuestionGroup) ?? questionGroups[0];

  return (
    <FadeIn>
      <PageHeader
        title="Questions"
        action={
          <div className="flex gap-2">
            <Button variant={tab === "list" ? "default" : "outline"} onClick={() => setTab("list")}>Liste</Button>
            <Button variant={tab === "new" ? "default" : "outline"} onClick={() => setTab("new")}>Manuelle</Button>
            <Button variant={tab === "ai" ? "default" : "outline"} onClick={() => setTab("ai")}>Generer IA</Button>
          </div>
        }
      />
      {tab === "list" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <select className="h-11 rounded-xl border-2 px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
            <select
              className="h-11 min-w-64 rounded-xl border-2 px-3"
              value={activeQuestionGroup?.key ?? ""}
              disabled={!questionGroups.length}
              onChange={(event) => setSelectedQuestionGroup(event.target.value)}
              aria-label="Filtrer par niveau et section"
            >
              {!questionGroups.length && <option value="">Aucun groupe disponible</option>}
              {questionGroups.map((group) => (
                <option key={group.key} value={group.key}>{group.label} ({group.group.length})</option>
              ))}
            </select>
          </div>
          {activeQuestionGroup ? (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <h2 className="font-semibold">{activeQuestionGroup.label}</h2>
                <span className="text-xs text-muted-foreground">{activeQuestionGroup.group.length} question(s)</span>
              </div>
              {activeQuestionGroup.group.map((q: any) => (
                <Card key={q.id} className="p-4 flex justify-between gap-4">
                  <div>
                    <p className="font-medium whitespace-pre-line">{q.questionText}</p>
                    <p className="text-xs text-muted-foreground">{q.subject} - {q.topic} - {q.origin}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge>{q.status}</Badge>
                    {q.status !== "published" && <Button size="sm" onClick={() => void publish(q.id)}>Publier</Button>}
                  </div>
                </Card>
              ))}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune question pour ce statut.</p>
          )}
        </>
      )}
      {tab === "new" && (
        <Card className="p-6 grid sm:grid-cols-2 gap-3 max-w-3xl">
          <EducationFields key={educationPickerKey} form={form} onChange={(values) => setForm({ ...form, ...values })} />
          <ChapterField chapters={availableChapters} value={form.topic} onChange={(topic) => setForm({ ...form, topic })} form={form} returnTab="new" />
          <div className="sm:col-span-2"><Label>Enonce</Label><Textarea value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Partie a</Label><Input value={form.partText} onChange={(e) => setForm({ ...form, partText: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Reponse / bareme</Label><Input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void save("manual", { status: "draft" })}>Brouillon</Button>
            <Button onClick={() => void save("manual", { status: "published" })}>Publier</Button>
          </div>
        </Card>
      )}
      {tab === "ai" && (
        <Card className="p-6 max-w-3xl space-y-4">
          <p className="text-sm text-muted-foreground">Les questions generees depuis les PDF sont enregistrees en brouillon.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <EducationFields key={educationPickerKey} form={form} onChange={(values) => setForm({ ...form, ...values })} />
            <ChapterField chapters={availableChapters} value={form.topic} onChange={(topic) => setForm({ ...form, topic })} form={form} returnTab="ai" />
          </div>
          <div>
            <Label>Fichiers PDF</Label>
            <Input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setAiFiles(Array.from(e.target.files ?? []))}
              className="pt-3"
            />
            {aiFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{aiFiles.map((file) => file.name).join(", ")}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre de questions</Label>
              <Input
                type="number"
                min={1}
                max={50}
                step={1}
                value={aiQuestionCount}
                onChange={(event) => setAiQuestionCount(Number(event.target.value))}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Types de questions</legend>
              <div className="grid grid-cols-2 gap-2">
                {AI_QUESTION_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={aiQuestionTypes.includes(value)}
                      onChange={(event) => setAiQuestionTypes((selected) =>
                        event.target.checked
                          ? [...selected, value]
                          : selected.filter((type) => type !== value),
                      )}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <Button onClick={() => void generate()} isLoading={aiLoading}>Generer et enregistrer</Button>
          {aiProgress && (aiLoading || aiProgress.status === "failed") && (
            <div className="space-y-2" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{aiProgress.status === "failed" ? aiProgress.error || aiProgress.message : aiProgress.message}</span>
                <span className="font-medium tabular-nums">{Math.round(aiProgress.progress)}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Progression de lecture du document"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(aiProgress.progress)}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, aiProgress.progress))}%` }}
                />
              </div>
              {aiProgress.totalChunks > 0 && (
                <p className="text-xs text-muted-foreground">
                  Segment {aiProgress.currentChunk} sur {aiProgress.totalChunks}
                </p>
              )}
            </div>
          )}
          {ai && (
            <div className="space-y-3 border-t pt-4">
              <Label>Derniere generation</Label>
              <p className="text-sm text-muted-foreground">{ai.questions?.length ?? 0} question(s) sauvegardee(s).</p>
            </div>
          )}
        </Card>
      )}
    </FadeIn>
  );
}

export default function AdminQuestionsPage() {
  return (
    <RequireAuth roles={["admin", "super_admin"]}>
      <QuestionsInner />
    </RequireAuth>
  );
}
