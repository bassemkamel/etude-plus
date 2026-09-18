"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Trophy, BookOpen, Flame, Target, ChevronRight, Sparkles,
  Library, FileText, ClipboardList, Layers, AlertCircle, CreditCard,
} from "lucide-react";
import { RequireAuth } from "@/components/guards";
import { Badge, Card, FadeIn } from "@/components/ui/Premium";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { daysLeft, formatDateTN } from "@/lib/utils";
import { getClassLevelLabel } from "@etudeplus/shared";

type Overview = {
  totalAttempts: number;
  overallAverage: number | null;
  bySubject: Record<string, { count: number; avg: number }>;
  recent: Array<{ id: string; type: string; subject: string; gradeOutOf20: number | null; completedAt: string }>;
};

function gradeColor(g: number) {
  if (g >= 15) return "text-green-600";
  if (g >= 10) return "text-amber-600";
  return "text-red-600";
}

const MODULES = [
  { icon: Library, href: "/revision", title: "Banque de questions", desc: "Exercices par chapitre", iconBg: "bg-blue-500/10", iconColor: "text-blue-600" },
  { icon: FileText, href: "/revision", title: "Examens blancs", desc: "Annales officielles", iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
  { icon: ClipboardList, href: "/revision", title: "Examens pratiques", desc: "QCM & entraînement", iconBg: "bg-green-500/10", iconColor: "text-green-600" },
  { icon: Layers, href: "/revision", title: "Flashcards", desc: "Mémorise les notions clés", iconBg: "bg-rose-500/10", iconColor: "text-rose-600" },
];

function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "Élève";
  const grade = user?.studentProfile?.gradeLevel;
  const section = user?.studentProfile?.educationSection;
  const label = grade ? getClassLevelLabel(grade, section || null) : null;
  const sub = user?.subscription;

  const { data: overview, isLoading } = useQuery({
    queryKey: ["progress-overview"],
    queryFn: () => api<Overview>("/api/v1/progress/overview"),
  });

  const subjects = overview?.bySubject ? Object.entries(overview.bySubject).sort((a, b) => b[1].avg - a[1].avg) : [];
  const best = subjects[0];

  return (
    <FadeIn>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">{t("studentDashboard.greeting", { name: firstName })}</h1>
          <p className="text-muted-foreground mt-1">{t("studentDashboard.subtitle")}</p>
        </div>
        {label && <Badge className="self-start text-sm px-3 py-1">{label}</Badge>}
      </div>

      {!grade && (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Choisis ton niveau pour débloquer la révision</p>
            <Link href="/settings" className="text-sm text-primary font-medium hover:underline">Ouvrir les paramètres →</Link>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Mon plan</p>
          </div>
          {sub ? (
            <>
              <p className="text-xl font-bold">{sub.plan.nameFr}</p>
              <Badge variant="success" className="mt-2">{sub.status}</Badge>
              <p className="text-sm text-muted-foreground mt-3">
                {formatDateTN(sub.startsAt)} → {formatDateTN(sub.endsAt)}
              </p>
              <p className="text-sm font-medium mt-1">{daysLeft(sub.endsAt)} jours restants</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Gratuit</p>
              <p className="text-sm text-muted-foreground mt-1 mb-3">Aperçu 3 questions / jour</p>
              <Link href="/pricing"><span className="text-sm font-semibold text-primary">Passe à Plus →</span></Link>
            </>
          )}
        </Card>

        <Card className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-xl shadow-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-semibold">{t("studentDashboard.overallAverage")}</p>
          </div>
          {isLoading ? (
            <div className="h-10 w-20 bg-white/20 rounded-xl animate-pulse" />
          ) : overview?.overallAverage != null ? (
            <p className="text-4xl font-bold">
              {overview.overallAverage.toFixed(1)}
              <span className="text-xl font-normal opacity-70">/20</span>
            </p>
          ) : (
            <p className="text-2xl font-bold">—</p>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-semibold">{t("studentDashboard.revisions")}</p>
            </div>
            <p className="text-3xl font-bold">{overview?.totalAttempts ?? 0}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-semibold">Matières</p>
            </div>
            <p className="text-3xl font-bold">{subjects.length}</p>
          </Card>
        </div>
      </div>

      {best && (
        <Card className="p-4 mb-8 flex items-center gap-3">
          <Target className="w-5 h-5 text-green-600" />
          <p className="text-sm">Meilleure matière : <span className="font-bold">{best[0]}</span>{" "}
            <span className={`font-bold ${gradeColor(best[1].avg)}`}>{best[1].avg.toFixed(1)}/20</span>
          </p>
        </Card>
      )}

      <h2 className="text-lg font-bold mb-4">Révision Étude+</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {MODULES.map((m) => (
          <Link key={m.title} href={m.href}>
            <Card className="p-5 h-full hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center mb-3`}>
                <m.icon className={`w-5 h-5 ${m.iconColor}`} />
              </div>
              <p className="font-semibold">{m.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {Number((sub?.plan.features as any)?.pdfQuotaMonth ?? 0) > 0 && (
        <Link href="/documents">
          <Card className="p-5 mb-8 flex items-center justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Envoie un PDF, reçois tes questions</p>
                <p className="text-sm text-muted-foreground">Workspace privé, hors banque globale</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Card>
        </Link>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{t("studentDashboard.recentRevisions")}</h2>
        <Link href="/progress" className="text-sm text-primary flex items-center gap-1 font-semibold">
          {t("studentDashboard.viewAll")} <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      {!isLoading && !overview?.totalAttempts ? (
        <Card className="p-10 text-center">
          <p className="font-semibold mb-1">Aucune révision pour l’instant</p>
          <p className="text-muted-foreground text-sm mb-4">Lance une première série — tes notes /20 apparaîtront ici.</p>
          <Link href="/revision" className="text-primary font-semibold">Commencer →</Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {overview?.recent?.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{r.subject}</p>
                <p className="text-xs text-muted-foreground">{formatDateTN(r.completedAt)}</p>
              </div>
              <p className={`text-lg font-bold ${r.gradeOutOf20 != null ? gradeColor(r.gradeOutOf20) : ""}`}>
                {r.gradeOutOf20 != null ? `${r.gradeOutOf20.toFixed(1)}/20` : "—"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </FadeIn>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth roles={["student"]}>
      <StudentDashboard />
    </RequireAuth>
  );
}
