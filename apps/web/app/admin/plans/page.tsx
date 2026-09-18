"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { formatTND } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Plan = { id: string; code: string; nameFr: string; priceTnd: any; interval: string; isActive: boolean; features: any };

function PlansInner() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["admin-plans"], queryFn: () => api<Plan[]>("/api/v1/admin/plans") });

  async function toggle(p: Plan) {
    try {
      await api(`/api/v1/admin/plans/${p.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !p.isActive }) });
      await qc.invalidateQueries({ queryKey: ["admin-plans"] });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  return (
    <FadeIn>
      <PageHeader title="Plans" description="Désactiver plutôt que supprimer s’il y a des abonnements." />
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Card key={p.id} className="p-6">
            <div className="flex justify-between">
              <h3 className="font-serif font-bold text-xl">{p.nameFr}</h3>
              <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "actif" : "off"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{p.code} · {p.interval}</p>
            <p className="text-2xl font-bold mt-3">{formatTND(Number(p.priceTnd))}</p>
            <ul className="text-sm mt-4 space-y-1 text-muted-foreground">
              <li>Banque : {p.features?.questionBank ? "oui" : "preview"}</li>
              <li>PDF / mois : {p.features?.pdfQuotaMonth ?? 0}</li>
            </ul>
            <Button variant="outline" className="mt-4" onClick={() => void toggle(p)}>
              {p.isActive ? "Désactiver" : "Activer"}
            </Button>
          </Card>
        ))}
      </div>
    </FadeIn>
  );
}

export default function PlansPage() {
  return (
    <RequireAuth roles={["super_admin"]}>
      <PlansInner />
    </RequireAuth>
  );
}
