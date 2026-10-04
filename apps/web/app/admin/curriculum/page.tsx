"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Button, Card, FadeIn, Input, Label, PageHeader, Textarea } from "@/components/ui/Premium";
import { LevelPicker } from "@/components/shared/LevelPicker";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { getSectionLabel, getSubjectsForNiveauSection } from "@etudeplus/shared";

function educationDetails(item: { levelCode: string; sectionKey?: string | null; subject: string }): string {
  return [
    item.levelCode,
    item.sectionKey ? `Section : ${getSectionLabel(item.levelCode, item.sectionKey)}` : null,
    `Matière : ${item.subject}`,
  ].filter(Boolean).join(" · ");
}

type EducationSelection = {
  levelCode: string;
  sectionKey: string;
  subject: string;
};

function hasValidEducationSelection(selection: EducationSelection): boolean {
  return Boolean(
    selection.levelCode &&
    selection.subject &&
    getSubjectsForNiveauSection(selection.levelCode, selection.sectionKey || null).includes(selection.subject),
  );
}

function EducationFields({
  value,
  onChange,
}: {
  value: EducationSelection;
  onChange: (selection: EducationSelection) => void;
}) {
  const subjects = getSubjectsForNiveauSection(value.levelCode, value.sectionKey || null);
  const selectedSubject = subjects.includes(value.subject) ? value.subject : "";

  return (
    <>
      <div>
        <Label>Niveau et section</Label>
        <LevelPicker
          niveauValue={value.levelCode}
          sectionValue={value.sectionKey || null}
          onChange={(levelCode, sectionKey) => {
            const nextSubjects = getSubjectsForNiveauSection(levelCode, sectionKey);
            onChange({ levelCode, sectionKey: sectionKey ?? "", subject: nextSubjects[0] ?? "" });
          }}
        />
      </div>
      <div>
        <Label>Matière</Label>
        <select
          className="h-11 w-full rounded-xl border-2 border-border px-3 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedSubject}
          disabled={!subjects.length}
          onChange={(event) => onChange({ ...value, subject: event.target.value })}
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

function CurriculumInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: chapters = [] } = useQuery({ queryKey: ["admin-chapters"], queryFn: () => api<any[]>("/api/v1/admin/curriculum/chapters") });
  const { data: courses = [] } = useQuery({ queryKey: ["admin-courses"], queryFn: () => api<any[]>("/api/v1/admin/courses") });
  const [ch, setCh] = useState({ levelCode: "7eme", sectionKey: "", subject: "Mathématiques", name: "", slug: "", sortOrder: "1" });
  const [chapterPickerKey, setChapterPickerKey] = useState(0);
  const [course, setCourse] = useState({ title: "", levelCode: "7eme", sectionKey: "", subject: "Mathématiques", body: "", isPublished: true });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("returnTab") !== "new" && params.get("returnTab") !== "ai") return;

    const levelCode = params.get("gradeLevel") ?? "";
    const sectionKey = params.get("sectionKey") ?? "";
    const subject = params.get("subject") ?? "";
    if (!getSubjectsForNiveauSection(levelCode, sectionKey || null).includes(subject)) return;

    setCh((current) => ({ ...current, levelCode, sectionKey, subject }));
    setChapterPickerKey((key) => key + 1);
  }, []);

  async function addChapter() {
    if (!hasValidEducationSelection(ch)) {
      toast({ title: "Choisissez un niveau, une section et une matière", variant: "destructive" });
      return;
    }
    try {
      await api("/api/v1/admin/curriculum/chapters", {
        method: "POST",
        body: JSON.stringify({ ...ch, slug: ch.slug || ch.name.toLowerCase().replace(/\s+/g, "-"), sortOrder: Number(ch.sortOrder) }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-chapters"] });
      toast({ title: "Chapitre ajouté" });
      const params = new URLSearchParams(window.location.search);
      const returnTab = params.get("returnTab");
      if (returnTab === "new" || returnTab === "ai") {
        const returnQuery = new URLSearchParams({
          tab: returnTab,
          gradeLevel: params.get("gradeLevel") ?? "",
          sectionKey: params.get("sectionKey") ?? "",
          subject: params.get("subject") ?? "",
        });
        router.push(`/admin/questions?${returnQuery.toString()}`);
      }
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  async function addCourse() {
    if (!hasValidEducationSelection(course)) {
      toast({ title: "Choisissez un niveau, une section et une matière", variant: "destructive" });
      return;
    }
    try {
      await api("/api/v1/admin/courses", { method: "POST", body: JSON.stringify(course) });
      await qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Cours ajouté" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  return (
    <FadeIn>
      <PageHeader title="Curriculum & cours" description="Tous les niveaux 7ème → Bac. Un chapitre s’affiche même à 0 question." />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h2 className="font-serif font-bold text-xl">Nouveau chapitre</h2>
          <EducationFields key={chapterPickerKey} value={ch} onChange={(selection) => setCh({ ...ch, ...selection })} />
          <div><Label>Nom</Label><Input value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value })} /></div>
          <Button onClick={() => void addChapter()}>Ajouter</Button>
          <div className="max-h-80 overflow-auto space-y-2 pt-4">
            {chapters.map((c: any) => (
              <div key={c.id} className="text-sm border-b border-border/50 pb-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground"> · {educationDetails(c)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 space-y-3">
          <h2 className="font-serif font-bold text-xl">Nouveau cours</h2>
          <div><Label>Titre</Label><Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} /></div>
          <EducationFields value={course} onChange={(selection) => setCourse({ ...course, ...selection })} />
          <div><Label>Contenu markdown</Label><Textarea value={course.body} onChange={(e) => setCourse({ ...course, body: e.target.value })} /></div>
          <Button onClick={() => void addCourse()}>Publier le cours</Button>
          <div className="max-h-80 overflow-auto space-y-2 pt-4">
            {courses.map((c: any) => (
              <div key={c.id} className="text-sm border-b border-border/50 pb-2">
                <span className="font-medium">{c.title}</span>
                <span className="text-muted-foreground"> · {educationDetails(c)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </FadeIn>
  );
}

export default function CurriculumPage() {
  return (
    <RequireAuth roles={["admin", "super_admin"]}>
      <CurriculumInner />
    </RequireAuth>
  );
}
