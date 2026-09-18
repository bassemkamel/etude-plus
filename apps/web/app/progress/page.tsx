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
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Moyenne générale</p>
          <p className="text-3xl font-bold mt-1">{data?.overallAverage != null ? `${data.overallAverage.toFixed(1)}/20` : "—"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Révisions</p>
          <p className="text-3xl font-bold mt-1">{data?.totalAttempts ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Matières actives</p>
          <p className="text-3xl font-bold mt-1">{subjects.length}</p>
        </Card>
      </div>
      <h2 className="font-bold mb-3">Par matière</h2>
      <div className="space-y-3 mb-10">
        {subjects.length === 0 && <p className="text-muted-foreground text-sm">Pas encore de notes. <Link href="/revision" className="text-primary">Réviser</Link></p>}
        {subjects.map(([name, s]) => (
          <Card key={name} className="p-4">
            <div className="flex justify-between mb-2">
              <Link href={`/revision/${encodeURIComponent(name)}`} className="font-semibold hover:text-primary">{name}</Link>
              <span className="font-bold">{s.avg.toFixed(1)}/20</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (s.avg / 20) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{s.count} tentative{s.count > 1 ? "s" : ""}</p>
          </Card>
        ))}
      </div>
      <h2 className="font-bold mb-3">Historique</h2>
      <div className="space-y-2">
        {data?.recent?.map((r) => (
          <Card key={r.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{r.subject}{r.topic ? ` · ${r.topic}` : ""}</p>
              <p className="text-xs text-muted-foreground">{formatDateTN(r.completedAt)}</p>
            </div>
            <Badge>{r.gradeOutOf20 != null ? `${r.gradeOutOf20.toFixed(1)}/20` : "—"}</Badge>
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
