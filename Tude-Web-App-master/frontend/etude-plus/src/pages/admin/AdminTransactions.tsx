import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Badge } from "@/components/ui/Premium";
import { formatTND } from "@/lib/utils";
import { getToken } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_OPTIONS = ["pending", "completed", "failed", "refunded"] as const;
type TxStatus = typeof STATUS_OPTIONS[number];

const API_URL = import.meta.env.VITE_API_URL ?? "";

function useOverrideStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TxStatus }) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/transactions/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Erreur ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Statut mis à jour" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });
}

function statusBadge(status: string) {
  if (status === "completed") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Complété</Badge>;
  if (status === "pending") return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
  if (status === "refunded") return <Badge variant="default"><XCircle className="w-3 h-3 mr-1" />Remboursé</Badge>;
  return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
}

export function AdminTransactions() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const data = { transactions: [], total: 0 };
  const isLoading = false;
  const transactions: any[] = [];
  const overrideMutation = useOverrideStatus();
  const [editingId, setEditingId] = useState<number | null>(null);

  const completed = transactions.filter((t: any) => t.status === "completed");
  const totalRevenue = completed.reduce((s: number, t: any) => s + t.amount, 0);
  const totalFees = completed.reduce((s: number, t: any) => s + t.platformFee, 0);
  const totalProf = completed.reduce((s: number, t: any) => s + t.professorAmount, 0);

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader title="Transactions" description="Suivi des paiements de la plateforme." />

        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Volume total", value: formatTND(totalRevenue), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
            { label: "Frais plateforme (15%)", value: formatTND(totalFees), icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
            { label: "Versé aux profs (85%)", value: formatTND(totalProf), icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-100" },
          ].map((s, i) => (
            <Card key={i} className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "..." : s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold">{data?.total ?? 0} transactions</h3>
            {isSuperAdmin && (
              <span className="text-xs text-muted-foreground">Super Admin : cliquez sur un statut pour le modifier</span>
            )}
          </div>
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <DollarSign className="w-10 h-10 opacity-30 mx-auto mb-3" />
              <p>Aucune transaction pour l'instant.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-muted-foreground">#</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Cours</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Étudiant</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Date</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Montant</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Frais (15%)</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Prof (85%)</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-muted-foreground font-mono text-xs">#{t.id}</td>
                      <td className="p-4 font-medium">{t.class?.title ?? `Cours #${t.classId}`}</td>
                      <td className="p-4 text-muted-foreground">{t.student?.fullName ?? `Étudiant #${t.studentId}`}</td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(t.createdAt), "d MMM yyyy", { locale: fr })}
                      </td>
                      <td className="p-4 text-right font-bold">{formatTND(t.amount)}</td>
                      <td className="p-4 text-right text-orange-600">{formatTND(t.platformFee)}</td>
                      <td className="p-4 text-right text-green-600">{formatTND(t.professorAmount)}</td>
                      <td className="p-4 text-right">
                        {isSuperAdmin ? (
                          editingId === t.id ? (
                            <select
                              autoFocus
                              className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
                              defaultValue={t.status}
                              disabled={overrideMutation.isPending}
                              onBlur={() => setEditingId(null)}
                              onChange={e => {
                                const newStatus = e.target.value as TxStatus;
                                if (newStatus !== t.status) {
                                  overrideMutation.mutate({ id: t.id, status: newStatus });
                                }
                                setEditingId(null);
                              }}
                            >
                              {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingId(t.id)}
                              className="hover:opacity-70 transition-opacity cursor-pointer"
                              title="Cliquer pour modifier"
                            >
                              {statusBadge(t.status)}
                            </button>
                          )
                        ) : (
                          statusBadge(t.status)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </FadeIn>
    </DashboardLayout>
  );
}
