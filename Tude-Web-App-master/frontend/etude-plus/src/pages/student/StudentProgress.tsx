import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, FadeIn } from "@/components/ui/Premium";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { Link } from "wouter";
import { subjectToSlug } from "@/lib/educationConfig";
import {
  Trophy, TrendingUp, TrendingDown, Minus, BookOpen,
  AlertTriangle, BarChart3, Target, ChevronRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function gradeColor(g: number) {
  if (g >= 15) return "#22c55e";
  if (g >= 10) return "#f59e0b";
  return "#ef4444";
}

function gradeTextColor(g: number) {
  if (g >= 15) return "text-green-600 dark:text-green-400";
  if (g >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function TrendIcon({ current, previous }: { current: number; previous?: number }) {
  if (!previous) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (current > previous + 0.5) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (current < previous - 0.5) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export function StudentProgress() {
  const { t } = useTranslation();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  function typeLabel(type: string) {
    if (type === "past_paper") return t("studentProgress.typePastPaper");
    return t("studentProgress.typeTraining");
  }

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["progress-overview"],
    queryFn: () => apiFetch("/api/progress/overview"),
    staleTime: 60_000,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["progress-history", subjectFilter],
    queryFn: () => apiFetch(
      subjectFilter !== "all"
        ? `/api/progress/history?subject=${encodeURIComponent(subjectFilter)}&limit=50`
        : "/api/progress/history?limit=50"
    ),
    staleTime: 60_000,
  });

  const { data: weakTopics = [], isLoading: loadingWeak } = useQuery({
    queryKey: ["progress-weak-topics", subjectFilter],
    queryFn: () => apiFetch(
      subjectFilter !== "all"
        ? `/api/progress/weak-topics?subject=${encodeURIComponent(subjectFilter)}`
        : "/api/progress/weak-topics"
    ),
    staleTime: 60_000,
  });

  const subjects = overview?.subjectAverages?.map((s: any) => s.subject) ?? [];

  // Build grade history chart data (chronological)
  const chartData = [...history]
    .filter((a: any) => a.gradeOutOf20 !== null)
    .reverse()
    .map((a: any, i: number) => ({
      name: `S${i + 1}`,
      note: a.gradeOutOf20,
      subject: a.subject,
      type: typeLabel(a.type),
    }));

  const isLoading = loadingOverview || loadingHistory;

  return (
    <DashboardLayout>
      <FadeIn>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>{t("studentProgress.breadcrumb")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("studentProgress.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("studentProgress.subtitle")}
          </p>
        </div>

        {/* Subject filter */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSubjectFilter("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                subjectFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t("studentProgress.allSubjects")}
            </button>
            {subjects.map((s: string) => (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  subjectFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* No data state */}
        {!isLoading && (!overview?.totalAttempts) && (
          <Card className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">{t("studentProgress.noData")}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {t("studentProgress.noDataDesc")}
            </p>
            <Link href="/revision">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                {t("studentProgress.startRevising")} <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </Card>
        )}

        {(isLoading || (overview?.totalAttempts > 0)) && (
          <div className="space-y-8">
            {/* ── KPI summary ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-xl shadow-primary/20 col-span-2 lg:col-span-1">
                <p className="text-sm text-primary-foreground/80 mb-2">{t("studentProgress.overallAverage")}</p>
                {loadingOverview ? (
                  <div className="h-10 bg-white/20 rounded-xl animate-pulse" />
                ) : (
                  <p className="text-4xl font-bold">
                    {overview?.overallAverage?.toFixed(1) ?? "—"}
                    <span className="text-xl font-normal opacity-60">/20</span>
                  </p>
                )}
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground mb-2">{t("studentProgress.totalRevisions")}</p>
                {loadingOverview ? <div className="h-9 bg-muted rounded-xl animate-pulse" /> : (
                  <p className="text-3xl font-bold">{overview?.totalAttempts ?? 0}</p>
                )}
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground mb-2">{t("studentProgress.subjectsWorked")}</p>
                {loadingOverview ? <div className="h-9 bg-muted rounded-xl animate-pulse" /> : (
                  <p className="text-3xl font-bold">{overview?.subjectAverages?.length ?? 0}</p>
                )}
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground mb-2">{t("studentProgress.weakPointsCount")}</p>
                {loadingWeak ? <div className="h-9 bg-muted rounded-xl animate-pulse" /> : (
                  <p className="text-3xl font-bold">{weakTopics.filter((t: any) => t.correctRate < 60).length}</p>
                )}
              </Card>
            </div>

            {/* ── Grade evolution chart ────────────────────────────────────────── */}
            {chartData.length > 1 && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">{t("studentProgress.gradeEvolution")}</h2>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} />
                    <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "10", position: "right", fontSize: 11, fill: "#f59e0b" }} />
                    <Tooltip
                      formatter={(value: any, _name: any, props: any) => [
                        `${Number(value).toFixed(1)}/20`,
                        `${props.payload.type} — ${props.payload.subject}`,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="note"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ fill: "#f59e0b", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* ── Subject averages bar chart ────────────────────────────────── */}
            {overview?.subjectAverages?.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">{t("studentProgress.averageBySubject")}</h2>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={overview.subjectAverages}
                    margin={{ top: 5, right: 20, left: -10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 11 }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} />
                    <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="4 4" />
                    <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}/20`, "Moyenne"]} />
                    <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                      {overview.subjectAverages.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={gradeColor(entry.average)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* ── Weak topics ────────────────────────────────────────────────── */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold">{t("studentProgress.weakPoints")}</h2>
                </div>
                {loadingWeak ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
                  </div>
                ) : weakTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t("studentProgress.continuePractice")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {weakTopics.map((t: any) => (
                      <Link key={`${t.subject}-${t.topic}`} href={`/revision/${subjectToSlug(t.subject)}/banque-de-questions`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${t.correctRate < 40 ? "bg-red-500" : "bg-amber-500"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{t.topic}</p>
                            <p className="text-xs text-muted-foreground">{t.subject} · {t.total} question{t.total > 1 ? "s" : ""}</p>
                          </div>
                          <p className={`text-sm font-bold shrink-0 ${t.correctRate < 40 ? "text-red-600" : "text-amber-600"}`}>
                            {t.correctRate}%
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* ── Recent history ──────────────────────────────────────────────── */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">{t("studentProgress.history")}</h2>
                  </div>
                </div>
                {loadingHistory ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {subjectFilter !== "all" ? t("studentProgress.noHistorySubject") : t("studentProgress.noHistory")}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {history.map((attempt: any, i: number) => (
                      <div key={attempt.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                        <TrendIcon
                          current={attempt.gradeOutOf20}
                          previous={history[i + 1]?.gradeOutOf20}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{attempt.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabel(attempt.type)}
                            {attempt.topic ? ` · ${attempt.topic}` : ""}
                            {attempt.annaleYear ? ` · ${attempt.annaleYear}` : ""}
                          </p>
                        </div>
                        {attempt.gradeOutOf20 !== null ? (
                          <p className={`text-sm font-bold shrink-0 ${gradeTextColor(attempt.gradeOutOf20)}`}>
                            {attempt.gradeOutOf20.toFixed(1)}/20
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
