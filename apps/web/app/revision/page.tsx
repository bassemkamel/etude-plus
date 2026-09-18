"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight } from "lucide-react";
import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { subjectColor, subjectEmoji, slugifySubject } from "@/lib/subjects";
import { getClassLevelLabel } from "@etudeplus/shared";

type Curriculum = {
  gradeLevel: string;
  educationSection: string;
  label: string;
  subjects: string[];
  chapters: Array<{ id: string; subject: string; name: string }>;
};

function Hub() {
  const { user } = useAuth();
  const grade = user?.studentProfile?.gradeLevel;
  const { data, error } = useQuery({
    queryKey: ["curriculum-my"],
    queryFn: () => api<Curriculum>("/api/v1/curriculum/my"),
    enabled: Boolean(grade),
    retry: false,
  });

  if (!grade) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-xl font-bold">Niveau non défini</h2>
        <p className="text-muted-foreground">
          Configure-le dans les{" "}
          <Link href="/settings" className="text-primary underline">paramètres</Link>.
        </p>
      </div>
    );
  }

  const subjects = data?.subjects ?? [];
  const counts: Record<string, number> = {};
  for (const ch of data?.chapters ?? []) counts[ch.subject] = (counts[ch.subject] ?? 0) + 1;

  return (
    <FadeIn>
      <PageHeader
        title="Révision Étude+"
        description={data?.label || getClassLevelLabel(grade, user?.studentProfile?.educationSection || null)}
      />
      {error && <p className="text-sm text-destructive mb-4">{(error as Error).message}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <Link key={s} href={`/revision/${slugifySubject(s)}`}>
            <Card className={`p-5 h-full border ${subjectColor(s)} hover:-translate-y-0.5 hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{subjectEmoji(s)}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-bold mt-3">{s}</p>
              <p className="text-sm text-muted-foreground mt-1">{counts[s] ?? 0} {(counts[s] ?? 0) > 1 ? "chapitres" : "chapitre"}</p>
            </Card>
          </Link>
        ))}
      </div>
    </FadeIn>
  );
}

export default function RevisionPage() {
  return (
    <RequireAuth roles={["student"]}>
      <Hub />
    </RequireAuth>
  );
}
