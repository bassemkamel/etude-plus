import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge } from "@/components/ui/Premium";
import {
  Users, GraduationCap, DollarSign, AlertCircle, Clock,
  ShieldCheck, TrendingUp, UserX, Activity, Zap, ArrowRight,
  CheckCircle2, XCircle, FileText, BookOpen,
} from "lucide-react";
import { formatTND } from "@/lib/utils";
import { Link } from "wouter";
import { getToken } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

async function adminFetch(url: string) {
  const token = getToken();
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  return data;
}

function useRejectProfessor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/professors/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t("common.error"));
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["professors"] }); toast({ title: t("admin.dashboard.professorRejected") }); },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminFetch(`${SUPABASE_FN}/admin-overview`),
    staleTime: 60 * 1000,
  });

  const { data: usersResp } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminFetch(`${SUPABASE_FN}/admin-users`),
    staleTime: 60 * 1000,
  });

  const professors: any[] = [];
  const allUsers: any[] = (usersResp as any)?.users ?? [];
  const allTx: any[] = [];

  const pendingProfs = professors.filter((p: any) => p.status === "pending" || p.status === "kyc_submitted");
  const bannedUsers = allUsers.filter((u: any) => u.isSuspended);
  const today = new Date().toDateString();
  const newToday = allUsers.filter((u: any) => u.createdAt && new Date(u.createdAt).toDateString() === today);
  const completedTx = allTx.filter((t: any) => t.status === "completed");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthlyRevenue = completedTx
    .filter((tx: any) => new Date(tx.createdAt) >= monthStart)
    .reduce((s: number, tx: any) => s + (tx.platformFee ?? tx.amount * 0.15), 0);

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/professors/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t("common.error"));
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["professors"] }); toast({ title: t("admin.dashboard.professorApproved") }); },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });
  const rejectMutation = useRejectProfessor();

  const statCards = [
    {
      label: t("admin.dashboard.statTotalUsers"),
      value: statsLoading ? "…" : String((stats?.totalStudents ?? 0) + (stats?.totalProfessors ?? 0)),
      icon: Users,
      color: "text-blue-600", bg: "bg-blue-100",
      sub: t("admin.dashboard.statTotalUsersSub", { students: stats?.totalStudents ?? 0, professors: stats?.totalProfessors ?? 0 }),
    },
    {
      label: t("admin.dashboard.statRevenue"),
      value: statsLoading ? "…" : formatTND(monthlyRevenue),
      icon: TrendingUp,
      color: "text-emerald-600", bg: "bg-emerald-100",
      sub: t("admin.dashboard.statRevenueSub"),
    },
    {
      label: t("admin.dashboard.statActiveCourses"),
      value: statsLoading ? "…" : String(stats?.totalClasses ?? 0),
      icon: Activity,
      color: "text-violet-600", bg: "bg-violet-100",
      sub: t("admin.dashboard.statActiveCoursesSub"),
    },
    {
      label: t("admin.dashboard.statKycPending"),
      value: statsLoading ? "…" : String(stats?.pendingProfessors ?? 0),
      icon: AlertCircle,
      color: "text-orange-600", bg: "bg-orange-100",
      sub: t("admin.dashboard.statKycPendingSub"),
      urgent: (stats?.pendingProfessors ?? 0) > 0,
    },
    {
      label: t("admin.dashboard.statNewToday"),
      value: String(newToday.length),
      icon: Zap,
      color: "text-sky-600", bg: "bg-sky-100",
      sub: t("admin.dashboard.statNewTodaySub"),
    },
    {
      label: t("admin.dashboard.statSuspended"),
      value: String(bannedUsers.length),
      icon: UserX,
      color: "text-red-600", bg: "bg-red-100",
      sub: bannedUsers.length === 0 ? t("admin.dashboard.statSuspendedNone") : t("admin.dashboard.statSuspendedBlocked"),
      urgent: bannedUsers.length > 0,
    },
  ];

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("admin.dashboard.title")}
          description={t("admin.dashboard.description")}
        />

        {/* Stat grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {statCards.map((s, i) => (
            <Card
              key={i}
              className={`p-6 ${s.urgent ? "border-orange-200 ring-1 ring-orange-200" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                {s.urgent && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{t("admin.dashboard.actionRequired")}</span>
                )}
              </div>
              <p className="text-3xl font-bold mt-4 mb-1">{s.value}</p>
              <p className="text-sm font-semibold text-foreground/80">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pending KYC with quick actions */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{t("admin.dashboard.kycPendingSection")}</h3>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="text-primary gap-1">
                  {t("admin.dashboard.manageAll")} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            {pendingProfs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ShieldCheck className="w-12 h-12 opacity-20 mx-auto mb-3 text-green-500" />
                <p className="font-semibold text-green-700">{t("admin.dashboard.allUpToDate")}</p>
                <p className="text-sm mt-1">{t("admin.dashboard.noPendingApplications")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProfs.slice(0, 4).map((prof: any) => (
                  <div key={prof.id} className="flex items-center justify-between p-3 rounded-xl border border-orange-100 bg-orange-50/40">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-700 text-sm flex-shrink-0">
                        {(prof.user?.fullName ?? "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{prof.user?.fullName ?? `Prof #${prof.id}`}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {prof.status === "kyc_submitted" ? (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 px-1.5 py-0">
                              <FileText className="w-2.5 h-2.5 mr-0.5" />{t("admin.dashboard.docsSubmitted")}
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-orange-100 text-orange-700 border-0 px-1.5 py-0">
                              <Clock className="w-2.5 h-2.5 mr-0.5" />{t("admin.dashboard.pending")}
                            </Badge>
                          )}
                          {prof.subjects?.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{prof.subjects[0]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => rejectMutation.mutate({ id: prof.id, notes: "" })}
                        disabled={rejectMutation.isPending}
                        title={t("admin.dashboard.reject")}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => approveMutation.mutate(prof.id)}
                        disabled={approveMutation.isPending}
                        title={t("admin.dashboard.approve")}
                        className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingProfs.length > 4 && (
                  <Link href="/admin/users">
                    <p className="text-xs text-center text-primary font-semibold pt-1 hover:underline">
                      {t("admin.dashboard.moreOthers", { count: pendingProfs.length - 4 })}
                    </p>
                  </Link>
                )}
              </div>
            )}
          </Card>

          {/* Quick nav */}
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-5">{t("admin.dashboard.quickAccess")}</h3>
            <div className="space-y-2.5">
              {[
                {
                  label: "Curriculum",
                  href: "/admin/curriculum",
                  icon: BookOpen,
                  desc: "Matières et chapitres par niveau",
                  color: "bg-green-100 text-green-600",
                },
                {
                  label: t("admin.dashboard.manageUsers"),
                  href: "/admin/users",
                  icon: Users,
                  desc: t("admin.dashboard.manageUsersDesc", { count: allUsers.length }),
                  color: "bg-blue-100 text-blue-600",
                },
                {
                  label: t("admin.dashboard.finances"),
                  href: "/admin/finances",
                  icon: TrendingUp,
                  desc: formatTND(completedTx.reduce((s: number, tx: any) => s + tx.amount, 0)),
                  color: "bg-emerald-100 text-emerald-600",
                },
                {
                  label: t("admin.dashboard.auditLog"),
                  href: "/admin/audit-logs",
                  icon: Activity,
                  desc: t("admin.dashboard.auditLogDesc"),
                  color: "bg-violet-100 text-violet-600",
                },
                {
                  label: t("admin.dashboard.platformSettings"),
                  href: "/admin/settings",
                  icon: GraduationCap,
                  desc: t("admin.dashboard.platformSettingsDesc"),
                  color: "bg-slate-100 text-slate-600",
                },
              ].map(item => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent transactions preview */}
        {completedTx.length > 0 && (
          <Card className="mt-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold">{t("admin.dashboard.recentTransactions")}</h3>
              <Link href="/admin/finances">
                <Button variant="ghost" size="sm" className="text-primary gap-1">{t("admin.dashboard.viewAll")} <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground">
                    <th className="text-left px-6 py-3 font-semibold">{t("admin.dashboard.colStudent")}</th>
                    <th className="text-left px-6 py-3 font-semibold">{t("admin.dashboard.colCourse")}</th>
                    <th className="text-left px-6 py-3 font-semibold">{t("admin.dashboard.colDate")}</th>
                    <th className="text-right px-6 py-3 font-semibold">{t("admin.dashboard.colAmount")}</th>
                    <th className="text-right px-6 py-3 font-semibold">{t("admin.dashboard.colPlatform")}</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTx.slice(0, 5).map((tx: any) => (
                    <tr key={tx.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{tx.student?.fullName ?? `#${tx.studentId}`}</td>
                      <td className="px-6 py-3 text-muted-foreground">{tx.class?.title ?? `Cours #${tx.classId}`}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {tx.createdAt ? format(new Date(tx.createdAt), "d MMM yyyy", { locale: fr }) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right font-bold">{formatTND(tx.amount)}</td>
                      <td className="px-6 py-3 text-right text-emerald-600 font-semibold">{formatTND(tx.platformFee ?? tx.amount * 0.15)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
