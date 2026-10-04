"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, Input, Label, PageHeader, Textarea } from "@/components/ui/Premium";
import { LevelPicker } from "@/components/shared/LevelPicker";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { getSubjectsForNiveauSection } from "@etudeplus/shared";

const defaultPrompt = `Generate 10 multiple-choice questions from the uploaded course files.

Return valid JSON only:
[
  {
    "question": "What is ...?",
    "options": ["A", "B", "C", "D"],
    "answer": "A",
    "marks_breakdown": "Why A is correct"
  }
]`;

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

function hasValidEducationSelection(form: QuestionFormValues): boolean {
  return Boolean(
    form.gradeLevel &&
    form.subject &&
    getSubjectsForNiveauSection(form.gradeLevel, form.sectionKey || null).includes(form.subject),
  );
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

function QuestionsInner() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"list" | "new" | "ai">("list");
  const [status, setStatus] = useState("");
  const { data: questions = [] } = useQuery({
    queryKey: ["admin-q", status],
    queryFn: () => api<any[]>(`/api/v1/admin/questions${status ? `?status=${status}` : ""}`),
  });
  const [form, setForm] = useState({
    gradeLevel: "bac",
    sectionKey: "mathematiques",
    subject: "Mathématiques",
    topic: "Nombres complexes",
    type: "Exercice",
    difficulty: "moyen",
    questionText: "",
    partText: "",
    answer: "",
    status: "draft",
  });
  const [ai, setAi] = useState<any>(null);
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiPrompt, setAiPrompt] = useState(defaultPrompt);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState<AiGenerationProgress | null>(null);

  async function save(origin = "manual", extra: any = {}) {
    if (!hasValidEducationSelection(form)) {
      toast({ title: "Choisissez un niveau, une section et une matière", variant: "destructive" });
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
    if (!hasValidEducationSelection(form)) {
      toast({ title: "Choisissez un niveau, une section et une matière", variant: "destructive" });
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
          prompt: aiPrompt,
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
          <select className="h-11 rounded-xl border-2 px-3 mb-4" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
          <div className="space-y-2">
            {questions.map((q: any) => (
              <Card key={q.id} className="p-4 flex justify-between gap-4">
                <div>
                  <p className="font-medium whitespace-pre-line">{q.questionText}</p>
                  <p className="text-xs text-muted-foreground">{q.gradeLevel} - {q.subject} - {q.topic} - {q.origin}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge>{q.status}</Badge>
                  {q.status !== "published" && <Button size="sm" onClick={() => void publish(q.id)}>Publier</Button>}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      {tab === "new" && (
        <Card className="p-6 grid sm:grid-cols-2 gap-3 max-w-3xl">
          <EducationFields form={form} onChange={(values) => setForm({ ...form, ...values })} />
          <div><Label>Chapitre</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
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
            <EducationFields form={form} onChange={(values) => setForm({ ...form, ...values })} />
            <div><Label>Chapitre</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
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
          <div>
            <Label>Prompt</Label>
            <Textarea className="min-h-[220px]" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
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
