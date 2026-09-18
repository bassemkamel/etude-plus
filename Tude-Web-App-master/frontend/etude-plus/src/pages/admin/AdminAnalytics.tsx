import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn } from "@/components/ui/Premium";
import {
  BarChart2, Eye, Users, BookOpen, DollarSign, Bot, Tv,
  Download, RefreshCw, Circle, Monitor, Smartphone, Tablet,
} from "lucide-react";
import { getToken } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatTND } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(path, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-xl ${className}`} />;
}

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

const EVENT_COLORS: Record<string, string> = {
  signup_completed: "text-emerald-500",
  class_enrolled: "text-emerald-500",
  login: "text-blue-500",
  page_view: "text-blue-400",
  mon_prof_question_asked: "text-amber-500",
  quiz_completed: "text-amber-500",
};

function StatCard({ label, value, icon: Icon, color, bg, sub }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <p className="font-medium text-muted-foreground">{t("admin.analytics.noData")}</p>
      <p className="text-sm text-muted-foreground/60 mt-1">
        {t("admin.analytics.noDataDesc")}
      </p>
    </div>
  );
}

export function AdminAnalytics() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [cookieStats, setCookieStats] = useState<any>(null);
  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [s, c, ck, l] = await Promise.all([
        apiFetch(`${API_URL}/admin/analytics/summary`),
        apiFetch(`${API_URL}/admin/analytics/charts?days=30`),
        apiFetch(`${API_URL}/admin/analytics/cookie-consent`),
        apiFetch(`${API_URL}/admin/analytics/live`),
      ]);
      setSummary(s);
      setCharts(c);
      setCookieStats(ck);
      setLive(l);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleExport = () => {
    const token = getToken();
    const url = `${API_URL}/admin/analytics/export?days=30`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "etude-analytics-30days.csv";
    // Pass auth via query if needed — since we use cookies this should work
    a.click();
  };

  const noEvents = !loading && (!charts?.dailyPageViews?.length && !live?.recentEvents?.length);

  return (
    <DashboardLayout>
      <FadeIn>
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PageHeader
              title={t("admin.analytics.title")}
              description={t("admin.analytics.description")}
            />
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {t("admin.analytics.refreshedAt")} {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
              <button
                onClick={fetchAll}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> {t("admin.analytics.refresh")}
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" /> {t("admin.analytics.exportCsv")}
              </button>
            </div>
          </div>

          {noEvents && <EmptyState />}

          {/* ── SECTION 1: LIVE ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("admin.analytics.liveActivity")}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Active users */}
              <Card className="p-5">
                {loading ? <Skeleton className="h-16" /> : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <p className="text-xs font-medium text-muted-foreground">{t("admin.analytics.activeNow")}</p>
                    </div>
                    <p className="text-3xl font-bold">{live?.activeNow ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("admin.analytics.activeNowDesc")}</p>
                  </>
                )}
              </Card>

              {/* Current pages */}
              <Card className="p-5">
                <p className="text-xs font-medium text-muted-foreground mb-3">{t("admin.analytics.currentPages")}</p>
                {loading ? <Skeleton className="h-24" /> : (
                  <div className="space-y-1.5">
                    {(live?.currentPages ?? []).slice(0, 5).map((p: any) => (
                      <div key={p.page} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[140px]">{p.page}</span>
                        <span className="font-medium ml-2">{p.count}</span>
                      </div>
                    ))}
                    {!(live?.currentPages?.length) && <p className="text-xs text-muted-foreground">{t("admin.analytics.noRecentActivity")}</p>}
                  </div>
                )}
              </Card>

              {/* Live event feed */}
              <Card className="p-5">
                <p className="text-xs font-medium text-muted-foreground mb-3">{t("admin.analytics.recentEvents")}</p>
                {loading ? <Skeleton className="h-24" /> : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {(live?.recentEvents ?? []).slice(0, 10).map((e: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <Circle className={`w-1.5 h-1.5 shrink-0 fill-current ${EVENT_COLORS[e.eventType] ?? "text-muted-foreground"}`} />
                        <span className={`font-medium shrink-0 ${EVENT_COLORS[e.eventType] ?? "text-muted-foreground"}`}>{e.eventType}</span>
                        <span className="text-muted-foreground truncate">{e.page}</span>
                        <span className="text-muted-foreground/50 shrink-0 ml-auto">
                          {e.deviceType === "mobile" ? "📱" : e.deviceType === "tablet" ? "📟" : "🖥"}
                        </span>
                      </div>
                    ))}
                    {!(live?.recentEvents?.length) && <p className="text-xs text-muted-foreground">{t("admin.analytics.noRecentEvents")}</p>}
                  </div>
                )}
              </Card>
            </div>
          </section>

          {/* ── SECTION 2: TODAY'S SUMMARY ──────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("admin.analytics.today")}
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label={t("admin.analytics.pageViews")} value={(summary?.today?.pageViews ?? 0).toLocaleString("fr-FR")} icon={Eye} color="text-blue-600" bg="bg-blue-100" />
                <StatCard label={t("admin.analytics.signups")} value={summary?.today?.signups ?? 0} icon={Users} color="text-emerald-600" bg="bg-emerald-100" />
                <StatCard label={t("admin.analytics.enrollments")} value={summary?.today?.enrollments ?? 0} icon={BookOpen} color="text-violet-600" bg="bg-violet-100" />
                <StatCard label={t("admin.analytics.platformRevenue")} value={formatTND(summary?.today?.revenue ?? 0)} icon={DollarSign} color="text-amber-600" bg="bg-amber-100" />
                <StatCard label={t("admin.analytics.monProfQuestions")} value={summary?.today?.monProfQuestions ?? 0} icon={Bot} color="text-sky-600" bg="bg-sky-100" />
                <StatCard label={t("admin.analytics.adsWatched")} value={summary?.today?.adsCompleted ?? 0} icon={Tv} color="text-rose-600" bg="bg-rose-100" />
              </div>
            )}
          </section>

          {/* ── SECTION 3: CHARTS ───────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("admin.analytics.last30Days")}
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Page views per day */}
                <Card className="p-5">
                  <p className="text-sm font-semibold mb-4">{t("admin.analytics.pageViewsPerDay")}</p>
                  {charts?.dailyPageViews?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={charts.dailyPageViews}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} name={t("admin.analytics.views")} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </Card>

                {/* Signups vs Enrollments */}
                <Card className="p-5">
                  <p className="text-sm font-semibold mb-4">{t("admin.analytics.signupsVsEnrollments")}</p>
                  {(charts?.dailySignups?.length || charts?.dailyEnrollments?.length) ? (() => {
                    const dateMap: Record<string, any> = {};
                    (charts.dailySignups ?? []).forEach((r: any) => { dateMap[r.date] = { date: r.date, signups: r.count }; });
                    (charts.dailyEnrollments ?? []).forEach((r: any) => {
                      if (!dateMap[r.date]) dateMap[r.date] = { date: r.date };
                      dateMap[r.date].enrollments = r.count;
                    });
                    const merged = Object.values(dateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={merged}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="signups" stroke="#10b981" strokeWidth={2} dot={false} name={t("admin.analytics.signupsLabel")} />
                          <Line type="monotone" dataKey="enrollments" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t("admin.analytics.coursesPurchased")} />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  })() : <EmptyState />}
                </Card>

                {/* Top pages */}
                <Card className="p-5">
                  <p className="text-sm font-semibold mb-4">{t("admin.analytics.topPages")}</p>
                  {charts?.topPages?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={charts.topPages} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="page" type="category" tick={{ fontSize: 9 }} width={120} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" name={t("admin.analytics.visits")} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </Card>

                {/* Device breakdown */}
                <Card className="p-5">
                  <p className="text-sm font-semibold mb-4">{t("admin.analytics.devices")}</p>
                  {charts?.deviceBreakdown?.length ? (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={charts.deviceBreakdown} dataKey="count" nameKey="device" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                            {charts.deviceBreakdown.map((_: any, i: number) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any, n: any) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {charts.deviceBreakdown.map((d: any, i: number) => (
                          <div key={d.device} className="flex items-center gap-2 text-sm">
                            {d.device === "mobile" ? <Smartphone className="w-4 h-4" /> : d.device === "tablet" ? <Tablet className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                            <span className="capitalize">{d.device}</span>
                            <span className="font-semibold ml-auto">{d.count}</span>
                            <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <EmptyState />}
                </Card>

                {/* Mon Prof Étude daily */}
                <Card className="p-5">
                  <p className="text-sm font-semibold mb-4">{t("admin.analytics.monProfDaily")}</p>
                  {charts?.monProfDaily?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={charts.monProfDaily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} name={t("admin.analytics.questions")} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </Card>

                {/* Peak hours */}
                <Card className="p-5">
                  <p className="text-sm font-semibold mb-4">{t("admin.analytics.peakHours")}</p>
                  {charts?.peakHours?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={charts.peakHours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={(v) => `${v}h`} />
                        <Bar dataKey="count" fill="#3b82f6" name={t("admin.analytics.events")} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </Card>
              </div>
            )}
          </section>

          {/* ── SECTION 4: COOKIE CONSENT ───────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("admin.analytics.cookieConsent")}
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: t("admin.analytics.acceptanceRate"), value: cookieStats?.acceptanceRate ?? "0%" },
                  { label: t("admin.analytics.accepted"), value: cookieStats?.accepted ?? 0 },
                  { label: t("admin.analytics.rejected"), value: cookieStats?.rejected ?? 0 },
                  { label: t("admin.analytics.customized"), value: cookieStats?.customized ?? 0 },
                  { label: t("admin.analytics.analyticsEnabled"), value: cookieStats?.analyticsOn ?? 0 },
                ].map(({ label, value }) => (
                  <Card key={label} className="p-4 text-center">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
