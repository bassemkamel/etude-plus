import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Badge } from "@/components/ui/Premium";
import { CreditCard, Receipt, Clock, Wallet } from "lucide-react";
import { formatTND } from "@/lib/utils";
import { useGetMyTransactions } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function StudentPayments() {
  const { t } = useTranslation();

  const statusConfig: Record<string, { label: string; variant: "success" | "secondary" | "destructive" }> = {
    completed: { label: t("student.payments.statusPaid"), variant: "success" },
    pending: { label: t("student.payments.statusPending"), variant: "secondary" },
    failed: { label: t("student.payments.statusFailed"), variant: "destructive" },
  };

  const { data: transactions = [], isLoading } = useGetMyTransactions() as any;

  const totalSpent = transactions
    .filter((t: any) => t.status === "completed")
    .reduce((s: number, tx: any) => s + (tx.amount ?? 0), 0);

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("student.payments.title")}
          description={t("student.payments.description")}
        />

        <div className="mb-8 grid md:grid-cols-3 gap-6">
          <Card className="p-6 md:col-span-2 bg-gradient-to-br from-card to-secondary">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">{t("student.payments.paymentTnd")}</p>
                <p className="font-bold text-lg">{t("student.payments.platform")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">{t("student.payments.totalSpent")}</p>
            </div>
            <p className="text-4xl font-bold text-primary">{formatTND(totalSpent)}</p>
          </Card>
        </div>

        <Card className="overflow-hidden border border-border">
          <div className="p-6 border-b border-border bg-muted/30">
            <h3 className="font-bold text-lg">{t("student.payments.transactionHistory")}</h3>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">{t("student.payments.noTransactions")}</p>
              <p className="text-sm mt-1">{t("student.payments.noTransactionsDesc")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx: any) => {
                const cfg = statusConfig[tx.status] ?? statusConfig.pending;
                return (
                  <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.status === "completed" ? "bg-green-100" : "bg-muted"}`}>
                        <Receipt className={`w-5 h-5 ${tx.status === "completed" ? "text-green-600" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{tx.class?.title ?? tx.className ?? `Transaction #${tx.id}`}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>#{tx.id}</span>
                          {tx.createdAt && <><span>•</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(tx.createdAt)}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg">{formatTND(tx.amount ?? 0)}</span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </FadeIn>
    </DashboardLayout>
  );
}
