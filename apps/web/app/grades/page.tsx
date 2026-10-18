"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { formatDateTN } from "@/lib/utils";

type GradeOverview = {
    recent: Array<{
        id: string;
        subject: string;
        topic?: string;
        gradeOutOf20: number | null;
        completedAt: string;
    }>;
};

function GradesInner() {
    const { data, isLoading } = useQuery({
        queryKey: ["progress-overview"],
        queryFn: () => api<GradeOverview>("/api/v1/progress/overview"),
    });

    return (
        <FadeIn>
            <PageHeader title="Mes notes" description="Résultats de tes dernières révisions." />
            {isLoading ? (
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
            ) : data?.recent.length ? (
                <div className="space-y-2">
                    {data.recent.map((attempt) => (
                        <Card key={attempt.id} className="flex items-center justify-between gap-4 p-4">
                            <div>
                                <p className="font-medium">{attempt.subject}{attempt.topic ? ` · ${attempt.topic}` : ""}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTN(attempt.completedAt)}</p>
                            </div>
                            <Badge>{attempt.gradeOutOf20 != null ? `${attempt.gradeOutOf20.toFixed(1)}/20` : "—"}</Badge>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <p className="font-semibold">Pas encore de notes</p>
                    <p className="mt-1 text-sm text-muted-foreground">Lance une révision pour voir tes résultats ici.</p>
                    <Link href="/revision" className="mt-4 inline-block text-sm font-semibold text-primary">Commencer une révision →</Link>
                </Card>
            )}
        </FadeIn>
    );
}

export default function GradesPage() {
    return (
        <RequireAuth roles={["student"]}>
            <GradesInner />
        </RequireAuth>
    );
}