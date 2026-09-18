import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Badge, Button } from "@/components/ui/Premium";
import { formatTND } from "@/lib/utils";
import { getToken } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, TrendingUp, Users, Download, Search, CheckCircle,
  Clock, XCircle, RefreshCw, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const STATUS_OPTIONS = ["pending", "completed", "failed", "refunded"] as const;
type TxStatus = typeof STATUS_OPTIONS[number];

const API_URL = import.meta.env.VITE_API_URL ?? "";

function useOverrideStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TxStatus }) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/transactions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t("common.error"));
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/transactions"] }); toast({ title: t("admin.finances.statusUpdated") }); },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });
}

function exportCSV(transactions: any[]) {
  const headers = ["#", "Student", "Student email", "Course", "Professor", "Date", "Amount (TND)", "Platform fee (TND)", "Prof payout (TND)", "Status"];
  const rows = transactions.map(tx => [
    tx.id,
    tx.student?.fullName ?? "",
    tx.student?.email ?? "",
    tx.class?.title ?? `Course #${tx.classId}`,
    tx.professor?.fullName ?? "",
    tx.createdAt ? format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm") : "",
    tx.amount,
    tx.platformFee ?? (tx.amount * 0.15).toFixed(2),
    tx.professorAmount ?? (tx.amount * 0.85).toFixed(2),
    tx.status,
  ]);
  const csv = [headers, ...rows].map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etude-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminFinances() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const data = { transactions: [], total: 0 };
  const isLoading = false;
  const transactions: any[] = [];
  const overrideMutation = useOverrideStatus();

  const STATUS_LABELS: Record<TxStatus, string> = {
    pending: t("admin.finances.statusPending"),
    completed: t("admin.finances.statusCompleted"),
    failed: t("admin.finances.statusFailed"),
    refunded: t("admin.finances.statusRefunded"),
  };

  function statusBadge(status: string) {
    if (status === "completed") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />{t("admin.finances.statusCompleted")}</Badge>;
    if (status === "pending") return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t("admin.finances.statusPending")}</Badge>;
    if (status === "refunded") return <Badge variant="default"><RefreshCw className="w-3 h-3 mr-1" />{t("admin.finances.statusRefunded")}</Badge>;
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{STATUS_LABELS[status as TxStatus] ?? status}</Badge>;
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TxStatus | "all">("all");
  const [editingId, setEditingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let list = transactions;
    if (statusFilter !== "all") list = list.filter((tx: any) => tx.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((tx: any) =>
        tx.student?.fullName?.toLowerCase().includes(q) ||
        tx.student?.email?.toLowerCase().includes(q) ||
        tx.class?.title?.toLowerCase().includes(q) ||
        String(tx.id).includes(q)
      );
    }
    return list;
  }, [transactions, statusFilter, search]);

  const completed = transactions.filter((tx: any) => tx.status === "completed");
  const totalVolume = completed.reduce((s: number, tx: any) => s + tx.amount, 0);
  const platformTotal = completed.reduce((s: number, tx: any) => s + (tx.platformFee ?? tx.amount * 0.15), 0);
  const profTotal = completed.reduce((s: number, tx: any) => s + (tx.professorAmount ?? tx.amount * 0.85), 0);

  const teacherMap: Record<string, { name: string; email: string; total: number; fees: number; count: number }> = {};
  completed.forEach((tx: any) => {
    const key = tx.professor?.fullName ?? `Prof #${tx.professorId}`;
    if (!teacherMap[key]) teacherMap[key] = { name: key, email: tx.professor?.email ?? "", total: 0, fees: 0, count: 0 };
    teacherMap[key].total += tx.professorAmount ?? tx.amount * 0.85;
    teacherMap[key].fees += tx.platformFee ?? tx.amount * 0.15;
    teacherMap[key].count += 1;
  });
  const teacherRows = Object.values(teacherMap).sort((a, b) => b.total - a.total);

  const [tab, setTab] = useState<"transactions" | "payouts">("transactions");

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("admin.finances.title")}
          description={t("admin.finances.description")}
          action={
            <Button onClick={() => exportCSV(filtered)} variant="outline">
              <Download className="w-4 h-4 mr-2" /> {t("admin.finances.exportCsv")}
            </Button>
          }
        />

        {/* Summary cards */}
        <div className="grid sm:grid-cols-3 gap-5 mb-8">
          {[
            { label: t("admin.finances.totalVolume"), value: formatTND(totalVolume), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-100", sub: t("admin.finances.completedCount", { count: completed.length }) },
            { label: t("admin.finances.platformRevenue"), value: formatTND(platformTotal), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100", sub: t("admin.finances.commissionNote") },
            { label: t("admin.finances.profPayouts"), value: formatTND(profTotal), icon: Users, color: "text-violet-600", bg: "bg-violet-100", sub: t("admin.finances.professorsCount", { count: teacherRows.length }) },
          ].map((s, i) => (
            <Card key={i} className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "…" : s.value}</p>
                <p className="text-sm font-semibold text-foreground/80">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {(["transactions", "payouts"] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${tab === tabKey ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tabKey === "transactions"
                ? t("admin.finances.tabTransactions", { count: transactions.length })
                : t("admin.finances.tabPayouts", { count: teacherRows.length })}
            </button>
          ))}
        </div>

        {/* Transactions tab */}
        {tab === "transactions" && (
          <>
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("admin.finances.searchPlaceholder")}
                  className="w-full pl-9 pr-3 h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {(["all", ...STATUS_OPTIONS] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}
                  >
                    {s === "all" ? t("admin.finances.filterAll") : STATUS_LABELS[s as TxStatus]}
                  </button>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden">
              {isLoading ? (
                <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <DollarSign className="w-10 h-10 opacity-30 mx-auto mb-3" />
                  <p>{t("admin.finances.noTransactions")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {[
                          { key: "#", label: "#", align: "text-left" },
                          { key: "course", label: t("admin.finances.colCourse"), align: "text-left" },
                          { key: "student", label: t("admin.finances.colStudent"), align: "text-left" },
                          { key: "professor", label: t("admin.finances.colProfessor"), align: "text-left" },
                          { key: "date", label: t("admin.finances.colDate"), align: "text-left" },
                          { key: "amount", label: t("admin.finances.colAmount"), align: "text-right" },
                          { key: "fee", label: t("admin.finances.colFee"), align: "text-right" },
                          { key: "prof", label: t("admin.finances.colProfPayout"), align: "text-right" },
                          { key: "status", label: t("admin.finances.colStatus"), align: "text-right" },
                        ].map(h => (
                          <th key={h.key} className={`p-4 font-semibold text-muted-foreground ${h.align}`}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-4 text-muted-foreground font-mono text-xs">#{tx.id}</td>
                          <td className="p-4 font-medium max-w-[180px] truncate">{tx.class?.title ?? `#${tx.classId}`}</td>
                          <td className="p-4 text-muted-foreground">{tx.student?.fullName ?? `#${tx.studentId}`}</td>
                          <td className="p-4 text-muted-foreground">{tx.professor?.fullName ?? `#${tx.professorId}`}</td>
                          <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">
                            {tx.createdAt ? format(new Date(tx.createdAt), "d MMM yyyy", { locale: fr }) : "—"}
                          </td>
                          <td className="p-4 text-right font-bold">{formatTND(tx.amount)}</td>
                          <td className="p-4 text-right text-emerald-600 font-semibold">{formatTND(tx.platformFee ?? tx.amount * 0.15)}</td>
                          <td className="p-4 text-right text-blue-600 font-semibold">{formatTND(tx.professorAmount ?? tx.amount * 0.85)}</td>
                          <td className="p-4 text-right">
                            {isSuperAdmin ? (
                              editingId === tx.id ? (
                                <select
                                  autoFocus
                                  className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
                                  defaultValue={tx.status}
                                  disabled={overrideMutation.isPending}
                                  onBlur={() => setEditingId(null)}
                                  onChange={e => {
                                    const newStatus = e.target.value as TxStatus;
                                    if (newStatus !== tx.status) overrideMutation.mutate({ id: tx.id, status: newStatus });
                                    setEditingId(null);
                                  }}
                                >
                                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                </select>
                              ) : (
                                <button onClick={() => setEditingId(tx.id)} title={t("admin.finances.editStatus")} className="hover:opacity-70 transition-opacity">
                                  {statusBadge(tx.status)}
                                </button>
                              )
                            ) : statusBadge(tx.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {filtered.length > 0 && (
                <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{filtered.length} {t("admin.finances.transactionCount")}</span>
                  <span className="font-bold">
                    {t("admin.finances.displayedTotal")} : {formatTND(filtered.filter((tx: any) => tx.status === "completed").reduce((s: number, tx: any) => s + tx.amount, 0))}
                  </span>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Payouts tab */}
        {tab === "payouts" && (
          <Card className="overflow-hidden">
            {teacherRows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Users className="w-10 h-10 opacity-30 mx-auto mb-3" />
                <p>{t("admin.finances.noPayouts")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 font-semibold text-muted-foreground">{t("admin.finances.payoutColProfessor")}</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">{t("admin.finances.payoutColEmail")}</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground">{t("admin.finances.payoutColTransactions")}</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground">{t("admin.finances.payoutColPlatformFee")}</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground">{t("admin.finances.payoutColToPay")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherRows.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-semibold">{r.name}</td>
                        <td className="p-4 text-muted-foreground text-xs">{r.email || "—"}</td>
                        <td className="p-4 text-right text-muted-foreground">{r.count}</td>
                        <td className="p-4 text-right text-emerald-600 font-semibold">{formatTND(r.fees)}</td>
                        <td className="p-4 text-right font-bold text-blue-600">{formatTND(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-bold">
                    <tr className="border-t-2 border-border">
                      <td className="p-4" colSpan={2}>{t("admin.finances.total")}</td>
                      <td className="p-4 text-right">{completed.length}</td>
                      <td className="p-4 text-right text-emerald-600">{formatTND(platformTotal)}</td>
                      <td className="p-4 text-right text-blue-600">{formatTND(profTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
