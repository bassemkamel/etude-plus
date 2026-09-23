"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, Input, Label, PageHeader, Textarea } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";

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
    subject: "Mathematiques",
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

  async function save(origin = "manual", extra: any = {}) {
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
    if (!aiFiles.length) {
      toast({ title: "Ajoutez au moins un PDF", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const files = await Promise.all(
        aiFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type || "application/pdf",
          data: await fileToBase64(file),
        })),
      );
      const data = await api("/api/v1/admin/questions/generate", {
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
      setAi(data);
      await qc.invalidateQueries({ queryKey: ["admin-q"] });
      toast({ title: `${data.questions?.length ?? 0} questions enregistrees en brouillon` });
      setTab("list");
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
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
          <div><Label>Niveau</Label><Input value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} /></div>
          <div><Label>Section</Label><Input value={form.sectionKey} onChange={(e) => setForm({ ...form, sectionKey: e.target.value })} /></div>
          <div><Label>Matiere</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
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
            <div><Label>Niveau</Label><Input value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} /></div>
            <div><Label>Section</Label><Input value={form.sectionKey} onChange={(e) => setForm({ ...form, sectionKey: e.target.value })} /></div>
            <div><Label>Matiere</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
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
