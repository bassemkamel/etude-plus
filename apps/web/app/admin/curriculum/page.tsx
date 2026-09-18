"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Button, Card, FadeIn, Input, Label, PageHeader, Textarea } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";

function CurriculumInner() {
  const qc = useQueryClient();
  const { data: chapters = [] } = useQuery({ queryKey: ["admin-chapters"], queryFn: () => api<any[]>("/api/v1/admin/curriculum/chapters") });
  const { data: courses = [] } = useQuery({ queryKey: ["admin-courses"], queryFn: () => api<any[]>("/api/v1/admin/courses") });
  const [ch, setCh] = useState({ levelCode: "7eme", sectionKey: "", subject: "Mathématiques", name: "", slug: "", sortOrder: "1" });
  const [course, setCourse] = useState({ title: "", levelCode: "7eme", sectionKey: "", subject: "Mathématiques", body: "", isPublished: true });

  async function addChapter() {
    try {
      await api("/api/v1/admin/curriculum/chapters", {
        method: "POST",
        body: JSON.stringify({ ...ch, slug: ch.slug || ch.name.toLowerCase().replace(/\s+/g, "-"), sortOrder: Number(ch.sortOrder) }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-chapters"] });
      toast({ title: "Chapitre ajouté" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  async function addCourse() {
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
          <div><Label>Niveau</Label><Input value={ch.levelCode} onChange={(e) => setCh({ ...ch, levelCode: e.target.value })} /></div>
          <div><Label>Section (vide si collège)</Label><Input value={ch.sectionKey} onChange={(e) => setCh({ ...ch, sectionKey: e.target.value })} /></div>
          <div><Label>Matière</Label><Input value={ch.subject} onChange={(e) => setCh({ ...ch, subject: e.target.value })} /></div>
          <div><Label>Nom</Label><Input value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value })} /></div>
          <Button onClick={() => void addChapter()}>Ajouter</Button>
          <div className="max-h-80 overflow-auto space-y-2 pt-4">
            {chapters.map((c: any) => (
              <div key={c.id} className="text-sm border-b border-border/50 pb-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground"> · {c.levelCode} · {c.subject}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 space-y-3">
          <h2 className="font-serif font-bold text-xl">Nouveau cours</h2>
          <div><Label>Titre</Label><Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} /></div>
          <div><Label>Niveau</Label><Input value={course.levelCode} onChange={(e) => setCourse({ ...course, levelCode: e.target.value })} /></div>
          <div><Label>Matière</Label><Input value={course.subject} onChange={(e) => setCourse({ ...course, subject: e.target.value })} /></div>
          <div><Label>Contenu markdown</Label><Textarea value={course.body} onChange={(e) => setCourse({ ...course, body: e.target.value })} /></div>
          <Button onClick={() => void addCourse()}>Publier le cours</Button>
          <div className="max-h-80 overflow-auto space-y-2 pt-4">
            {courses.map((c: any) => (
              <div key={c.id} className="text-sm border-b border-border/50 pb-2">
                <span className="font-medium">{c.title}</span>
                <span className="text-muted-foreground"> · {c.levelCode}</span>
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
