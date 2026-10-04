"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { unslugSubject } from "@/lib/subjects";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/toast";

type Question = {
  id: string;
  questionText: string;
  topic: string;
  difficulty: string;
  type: string;
  totalMarks: number | null;
  preview?: boolean;
  parts: Array<{ id: string; label: string; text: string; marks: number }>;
  markSchemes: Array<{ id: string; partLabel: string; answer: string }>;
};

function Player() {
  const { user } = useAuth();
  const params = useParams<{ subject: string }>();
  const subject = unslugSubject(params.subject);
  const plus = Boolean((user?.subscription?.plan.features as any)?.questionBank);
  const { data: questions = [] } = useQuery({
    queryKey: ["questions", subject],
    queryFn: () => api<Question[]>(`/api/v1/revision/questions?subject=${encodeURIComponent(subject)}`),
  });
  const topics = useMemo(() => Array.from(new Set(questions.map((q) => q.topic))), [questions]);
  const [topic, setTopic] = useState<string | "all">("all");
  const list = topic === "all" ? questions : questions.filter((q) => q.topic === topic);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const q = list[idx];
  const overlay = !plus && idx >= 3;

  async function score(ok: boolean) {
    if (!q) return;
    const total = q.totalMarks ?? 4;
    await api("/api/v1/revision/attempts", {
      method: "POST",
      body: JSON.stringify({
        type: "practice",
        subject,
        topic: q.topic,
        totalMarks: total,
        marksAwarded: ok ? total : 0,
        questionsCount: 1,
        correctCount: ok ? 1 : 0,
      }),
    });
    toast({ title: ok ? "Bien joué" : "À revoir", description: `${ok ? total : 0}/${total}` });
    setRevealed(false);
    setIdx((i) => Math.min(list.length - 1, i + 1));
  }

  return (
    <FadeIn>
      <Link href={`/revision/${params.subject}`} className="text-sm text-primary font-medium">← {subject}</Link>
      <PageHeader title="Banque de questions" description="Chapitres affichés même à 0 question." />
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setTopic("all"); setIdx(0); }} className={`px-3 py-1.5 rounded-full text-sm border ${topic === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>Tous</button>
        {topics.map((t) => (
          <button key={t} onClick={() => { setTopic(t); setIdx(0); }} className={`px-3 py-1.5 rounded-full text-sm border ${topic === t ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{t}</button>
        ))}
      </div>
      {!q ? (
        <Card className="p-10 text-center text-muted-foreground">Pas encore de questions publiées pour ce chapitre. Reviens bientôt.</Card>
      ) : (
        <Card className="p-8 relative overflow-hidden max-w-3xl">
          {overlay && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Lock className="w-8 h-8 text-primary mb-3" />
              <p className="font-bold text-lg">Débloquer avec Plus</p>
              <p className="text-sm text-muted-foreground mb-4">Aperçu limité à 3 questions sur le plan Gratuit.</p>
              <Link href="/pricing"><Button>Voir les plans</Button></Link>
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <Badge>{q.type}</Badge>
            <Badge variant="secondary">{q.difficulty}</Badge>
            <Badge variant="outline">{q.topic}</Badge>
          </div>
          <p className="text-lg font-medium leading-relaxed whitespace-pre-line">{q.questionText}</p>

          {revealed && (
            <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm font-semibold mb-1">Barème</p>
              {q.markSchemes.map((m) => (
                <p key={m.id} className="text-sm">{m.partLabel}. {m.answer}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-8">
            <Button variant="outline" onClick={() => setRevealed(true)}>Voir la correction</Button>
            <Button onClick={() => void score(true)}>Je savais</Button>
            <Button variant="ghost" onClick={() => void score(false)}>À revoir</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">{idx + 1} / {list.length}</p>
        </Card>
      )}
    </FadeIn>
  );
}

export default function BanquePage() {
  return (
    <RequireAuth roles={["student"]}>
      <Player />
    </RequireAuth>
  );
}
