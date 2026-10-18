"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader, Badge } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { formatDateTN } from "@/lib/utils";

type Overview = {
  totalAttempts: number;
  overallAverage: number | null;
  bySubject: Record<string, { count: number; avg: number }>;
  recent: Array<{ id: string; type: string; subject: string; topic?: string; gradeOutOf20: number | null; completedAt: string }>;
};

function ProgressInner() {
  const { data } = useQuery({ queryKey: ["progress-overview"], queryFn: () => api<Overview>("/api/v1/progress/overview") });
  const subjects = data?.bySubject ? Object.entries(data.bySubject) : [];

  return (
    <FadeIn>
      <PageHeader title="Ma progression" description="Moyennes /20 par matière et historique des tentatives." />
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Moyenne générale</p>
          <p className="mt-1 text-3xl font-bold">{data?.overallAverage != null ? `${data.overallAverage.toFixed(1)}/20` : "—"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Révisions</p>
          <p className="mt-1 text-3xl font-bold">{data?.totalAttempts ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Matières actives</p>
          <p className="mt-1 text-3xl font-bold">{subjects.length}</p>
        </Card>
      </div>
      <h2 className="mb-3 font-bold">Par matière</h2>
      <div className="mb-10 space-y-3">
        {subjects.length === 0 && <p className="text-sm text-muted-foreground">Pas encore de notes. <Link href="/revision" className="text-primary">Réviser</Link></p>}
        {subjects.map(([name, subject]) => (
          <Card key={name} className="p-4">
            <div className="mb-2 flex justify-between">
              <Link href={`/revision/${encodeURIComponent(name)}`} className="font-semibold hover:text-primary">{name}</Link>
              <span className="font-bold">{subject.avg.toFixed(1)}/20</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (subject.avg / 20) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{subject.count} tentative{subject.count > 1 ? "s" : ""}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 font-bold">Historique</h2>
      <div className="space-y-2">
        {data?.recent?.map((attempt) => (
          <Card key={attempt.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{attempt.subject}{attempt.topic ? ` · ${attempt.topic}` : ""}</p>
              <p className="text-xs text-muted-foreground">{formatDateTN(attempt.completedAt)}</p>
            </div>
            <Badge>{attempt.gradeOutOf20 != null ? `${attempt.gradeOutOf20.toFixed(1)}/20` : "—"}</Badge>
          </Card>
        ))}
      </div>
    </FadeIn>
  );
}

export default function ProgressPage() {
  return (
    <RequireAuth roles={["student"]}>
      <ProgressInner />
    </RequireAuth>
  );
}
