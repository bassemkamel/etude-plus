import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge } from "@/components/ui/Premium";
import { Wallet, DollarSign, TrendingUp, CheckCircle, Clock, ArrowUpRight } from "lucide-react";
import { formatTND } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useGetProfessorStats } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function ProfessorEarnings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const profId = (user as any)?.professorProfile?.id;
  const { data: stats, isLoading } = useGetProfessorStats(profId || 0, {
    query: { enabled: !!profId } as any,
  });

  const [transactions, setTransactions] = useState<any[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("etude_auth_token");
    if (!token) return;
    fetch(`${API_URL}/transactions/my-earnings`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setTransactions).catch(() => {});
  }, []);

  const totalEarnings = stats?.totalEarnings ?? 0;
  const platformFees = (stats as any)?.platformFees ?? 0;
  const earningsByMonth: { month: string; amount: number }[] = stats?.earningsByMonth ?? [];

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />{t("prof.earnings.statusPaid")}</Badge>;
    if (status === "pending") return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t("prof.earnings.statusPending")}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("prof.earnings.title")}
          description={t("prof.earnings.description")}
          action={
            <Button disabled={totalEarnings === 0}>
              <Wallet className="w-4 h-4 mr-2" /> {t("prof.earnings.requestTransfer")}
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-foreground text-background">
            <p className="text-background/70 font-medium mb-2">{t("prof.earnings.totalNet")}</p>
            <p className="text-4xl font-bold">
              {isLoading ? "..." : formatTND(totalEarnings)}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-background/50">
              <TrendingUp className="w-4 h-4" />
              {totalEarnings > 0
                ? t("prof.earnings.paymentsReceived", { count: transactions.filter(t => t.status === "completed").length })
                : t("prof.earnings.noEarnings")}
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-muted-foreground font-medium mb-2">{t("prof.earnings.availableBalance")}</p>
            <p className="text-4xl font-bold text-foreground">
              {isLoading ? "..." : formatTND(totalEarnings)}
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full" disabled={totalEarnings === 0}>
              <ArrowUpRight className="w-4 h-4 mr-2" />{t("prof.earnings.transferToBank")}
            </Button>
          </Card>
          <Card className="p-6 border-orange-200 bg-orange-50">
            <p className="text-orange-800 font-medium mb-2">{t("prof.earnings.platformFees")}</p>
            <p className="text-4xl font-bold text-orange-900">
              {isLoading ? "..." : formatTND(platformFees)}
            </p>
            <p className="text-sm text-orange-700 mt-4 border-t border-orange-200 pt-3">
              {t("prof.earnings.feesAutoDeducted")}
            </p>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <h3 className="font-bold text-lg mb-6">{t("prof.earnings.earningsEvolution")}</h3>
          {earningsByMonth.some(m => m.amount > 0) ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `${v}TND`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => [formatTND(v), t("prof.earnings.revenues")]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#earningGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <DollarSign className="w-14 h-14 mb-3 opacity-20" />
              <p className="font-medium">{t("prof.earnings.noData")}</p>
              <p className="text-sm mt-1">{t("prof.earnings.noDataDesc")}</p>
            </div>
          )}
        </Card>

        <h3 className="font-bold text-xl mb-4">{t("prof.earnings.latestTransactions")}</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
            <Wallet className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">{t("prof.earnings.noTransactions")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("prof.earnings.noTransactionsDesc")}</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("prof.earnings.colCourse")}</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("prof.earnings.colStudent")}</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("prof.earnings.colDate")}</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">{t("prof.earnings.colAmount")}</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">{t("prof.earnings.colYourEarnings")}</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">{t("prof.earnings.colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{tx.class?.title ?? `Cours #${tx.classId}`}</td>
                      <td className="p-4 text-muted-foreground">{tx.student?.fullName ?? `Étudiant #${tx.studentId}`}</td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(tx.createdAt), "d MMM yyyy", { locale: fr })}
                      </td>
                      <td className="p-4 text-right font-medium">{formatTND(tx.amount)}</td>
                      <td className="p-4 text-right font-bold text-green-600">{formatTND(tx.professorAmount)}</td>
                      <td className="p-4 text-right">{statusBadge(tx.status)}</td>
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
