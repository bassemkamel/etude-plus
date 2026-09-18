"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Button, Card, FadeIn, PageHeader, Badge } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { unslugSubject } from "@/lib/subjects";
import { toast } from "@/components/ui/toast";

type Annale = { id: string; year: number; topic: string; content: string; solution: string | null };

function Blancs() {
  const params = useParams<{ subject: string }>();
  const subject = unslugSubject(params.subject);
  const { data: items = [] } = useQuery({
    queryKey: ["annales", subject],
    queryFn: () => api<Annale[]>(`/api/v1/revision/annales?subject=${encodeURIComponent(subject)}`),
  });
  const years = Array.from(new Set(items.map((a) => a.year))).sort((a, b) => b - a);
  const [year, setYear] = useState<number | "all">("all");
  const list = year === "all" ? items : items.filter((a) => a.year === year);
  const [open, setOpen] = useState<string | null>(null);

  async function submit(a: Annale, score: number) {
    await api("/api/v1/revision/attempts", {
      method: "POST",
      body: JSON.stringify({ type: "past_paper", subject, topic: a.topic, totalMarks: 20, marksAwarded: score, questionsCount: 1, correctCount: score >= 10 ? 1 : 0 }),
    });
    toast({ title: `Note enregistrée : ${score}/20` });
  }

  return (
    <FadeIn>
      <Link href={`/revision/${params.subject}`} className="text-sm text-primary font-medium">← {subject}</Link>
      <PageHeader title="Examens blancs" description="Annales par année." />
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setYear("all")} className={`px-3 py-1.5 rounded-full text-sm border ${year === "all" ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>Toutes</button>
        {years.map((y) => (
          <button key={y} onClick={() => setYear(y)} className={`px-3 py-1.5 rounded-full text-sm border ${year === y ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>{y}</button>
        ))}
      </div>
      {list.length === 0 && <Card className="p-10 text-center text-muted-foreground">Aucune annale publiée.</Card>}
      <div className="space-y-3 max-w-3xl">
        {list.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="mb-2">{a.year}</Badge>
                <p className="font-semibold">{a.topic}</p>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.content}</p>
              </div>
            </div>
            {open === a.id && a.solution && (
              <div className="mt-4 p-3 rounded-xl bg-muted text-sm">{a.solution}</div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setOpen(open === a.id ? null : a.id)}>Correction</Button>
              <Button size="sm" onClick={() => void submit(a, 16)}>J’ai réussi</Button>
              <Button size="sm" variant="ghost" onClick={() => void submit(a, 8)}>À retravailler</Button>
            </div>
          </Card>
        ))}
      </div>
    </FadeIn>
  );
}

export default function BlancsPage() {
  return (
    <RequireAuth roles={["student"]}>
      <Blancs />
    </RequireAuth>
  );
}
