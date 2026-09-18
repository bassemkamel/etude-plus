import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, FadeIn } from "@/components/ui/Premium";
import {
  Sparkles, TrendingUp, BookOpen, Target,
  ChevronRight, ArrowRight, AlertCircle, Trophy,
  BarChart3, Flame, Library, FileText, ClipboardList, Layers,
} from "lucide-react";
import { Link } from "wouter";
import { AnnouncementsWidget } from "@/components/shared/AnnouncementsWidget";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { subjectToSlug } from "@/lib/educationConfig";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function fetchOverview() {
  const token = getToken();
  const res = await fetch(`${API_URL}/progress/overview`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch progress overview");
  return res.json();
}

function GradeBar({ grade, max = 20 }: { grade: number; max?: number }) {
  const pct = Math.min((grade / max) * 100, 100);
  const color = grade >= 15 ? "bg-green-500" : grade >= 10 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function gradeColor(g: number) {
  if (g >= 15) return "text-green-600 dark:text-green-400";
  if (g >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? t("studentDashboard.defaultName", { defaultValue: "Élève" });
  const gradeLevel = (user as any)?.studentProfile?.gradeLevel;

  function typeLabel(type: string) {
    if (type === "past_paper") return t("studentDashboard.typePastPaper");
    return t("studentDashboard.typeTraining");
  }

  const LEARNING_MODULES = [
    {
      icon: Library,
      key: "banque-de-questions",
      title: t("studentDashboard.questionsModule"),
      description: t("studentDashboard.questionsModuleDesc"),
      color: "hover:border-blue-300 dark:hover:border-blue-700",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: FileText,
      key: "examens-blancs",
      title: t("studentDashboard.pastPapersModule"),
      description: t("studentDashboard.pastPapersModuleDesc"),
      color: "hover:border-amber-300 dark:hover:border-amber-700",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: ClipboardList,
      key: "examens-pratiques",
      title: t("studentDashboard.practiceExamsModule"),
      description: t("studentDashboard.practiceExamsModuleDesc"),
      color: "hover:border-green-300 dark:hover:border-green-700",
      iconBg: "bg-green-500/10 dark:bg-green-500/20",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      icon: Layers,
      key: "flashcards",
      title: t("studentDashboard.flashcardsModule"),
      description: t("studentDashboard.flashcardsModuleDesc"),
      color: "hover:border-rose-300 dark:hover:border-rose-700",
      iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const { data: overview, isLoading } = useQuery({
    queryKey: ["progress-overview"],
    queryFn: fetchOverview,
    staleTime: 60_000,
  });

  const hasStats = !isLoading && overview?.totalAttempts > 0;
  const noData = !isLoading && !overview?.totalAttempts;

  return (
    <DashboardLayout>
      <FadeIn>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">
            {t("studentDashboard.greeting", { name: firstName })}
          </h1>
          <p className="text-black mt-1 font-normal">
            {t("studentDashboard.subtitle")}
          </p>
        </div>

        <AnnouncementsWidget />

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-8">
          {/* Moyenne générale — colored gradient card */}
          <Card className="p-5 col-span-2 lg:col-span-1 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-xl shadow-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-primary-foreground">{t("studentDashboard.overallAverage")}</p>
            </div>
            {isLoading ? (
              <div className="h-10 w-20 bg-white/20 rounded-xl animate-pulse" />
            ) : overview?.overallAverage !== null && overview?.overallAverage !== undefined ? (
              <p className="text-4xl font-bold text-primary-foreground">
                {overview.overallAverage.toFixed(1)}
                <span className="text-xl font-normal opacity-70">/20</span>
              </p>
            ) : (
              <p className="text-2xl font-bold text-primary-foreground">—</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-black">{t("studentDashboard.revisions")}</p>
            </div>
            {isLoading ? (
              <div className="h-9 w-16 bg-muted rounded-xl animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-black">{overview?.totalAttempts ?? 0}</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-black">{t("studentDashboard.activeSubjects")}</p>
            </div>
            {isLoading ? (
              <div className="h-9 w-16 bg-muted rounded-xl animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-black">{overview?.subjectAverages?.length ?? 0}</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-black">{t("studentDashboard.bestSubject")}</p>
            </div>
            {isLoading ? (
              <div className="h-9 w-24 bg-muted rounded-xl animate-pulse" />
            ) : overview?.subjectAverages?.length > 0 ? (
              <div>
                <p className="text-sm font-bold text-black truncate">{overview.subjectAverages[0].subject}</p>
                <p className={`text-xl font-bold ${gradeColor(overview.subjectAverages[0].average)}`}>
                  {overview.subjectAverages[0].average.toFixed(1)}/20
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-black">—</p>
            )}
          </Card>
        </div>

        {/* ── Recent sessions + subject averages ─────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left: recent sessions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-black">{t("studentDashboard.recentRevisions")}</h2>
              <Link href="/student/progress" className="text-sm text-primary flex items-center gap-1 hover:underline font-semibold">
                {t("studentDashboard.viewAll")} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
              </div>
            ) : noData ? (
              <Card className="p-8 text-center">
                <BookOpen className="w-10 h-10 text-gray-500 dark:text-gray-400 mx-auto mb-3" />
                <p className="font-bold text-black mb-1">
                  {t("studentDashboard.noRevisions")}
                </p>
                <p className="text-sm text-black mb-4 font-normal">
                  {t("studentDashboard.noRevisionsDesc")}
                </p>
                <Link href="/revision">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                    <Sparkles className="w-4 h-4" /> {t("studentDashboard.startRevising")}
                  </button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {overview.recentAttempts.slice(0, 6).map((attempt: any) => (
                  <Card key={attempt.id} className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-black truncate">{attempt.subject}</p>
                      <p className="text-xs text-black font-normal">
                        {typeLabel(attempt.type)}
                        {attempt.topic ? ` · ${attempt.topic}` : ""}
                        {attempt.annaleYear ? ` · ${attempt.annaleYear}` : ""}
                      </p>
                    </div>
                    {attempt.gradeOutOf20 !== null && attempt.gradeOutOf20 !== undefined ? (
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${gradeColor(attempt.gradeOutOf20)}`}>
                          {attempt.gradeOutOf20.toFixed(1)}<span className="text-xs font-normal text-black">/20</span>
                        </p>
                        <GradeBar grade={attempt.gradeOutOf20} />
                      </div>
                    ) : (
                      <span className="text-xs text-black shrink-0">—</span>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right: subject averages */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-black">{t("studentDashboard.bySubject")}</h2>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-2xl animate-pulse" />)}
              </div>
            ) : !hasStats ? (
              <Card className="p-5 text-center">
                <p className="text-sm text-black font-normal">{t("studentDashboard.subjectsAfterRevision")}</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {overview.subjectAverages.slice(0, 6).map((sa: any) => (
                  <Link key={sa.subject} href={`/revision/${subjectToSlug(sa.subject)}`}>
                    <Card className="p-4 hover:border-primary/40 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-black truncate flex-1">{sa.subject}</p>
                        <p className={`text-sm font-bold ml-2 shrink-0 ${gradeColor(sa.average)}`}>
                          {sa.average.toFixed(1)}/20
                        </p>
                      </div>
                      <GradeBar grade={sa.average} />
                      <p className="text-xs text-black mt-1 font-normal">{sa.attempts} révision{sa.attempts > 1 ? "s" : ""}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Grade level reminder */}
            {!gradeLevel && (
              <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{t("studentDashboard.levelNotDefined")}</p>
                    <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5 font-normal">
                      <Link href="/student/settings" className="underline">{t("studentDashboard.levelNotDefinedDesc")}</Link> {t("studentDashboard.toAccessContent")}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ── 4 Learning module cards ───────────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-black">{t("studentDashboard.learningModules")}</h2>
            <Link href="/revision" className="text-sm text-primary flex items-center gap-1 hover:underline font-semibold">
              {t("studentDashboard.viewAllModules")} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LEARNING_MODULES.map((mod) => (
              <Link key={mod.key} href="/revision">
                <div className={`group flex flex-col gap-4 p-5 rounded-2xl border-2 border-border bg-card transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${mod.color}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${mod.iconBg} ${mod.iconColor}`}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-black not-italic tracking-normal">{mod.title}</h3>
                    <p className="text-xs text-black mt-1 leading-relaxed font-normal">{mod.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-black group-hover:text-primary transition-colors">
                    <span>{t("studentDashboard.start")}</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </FadeIn>
    </DashboardLayout>
  );
}
