"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Button, Card, FadeIn, Input, Label, PageHeader, Badge } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { formatDateTN } from "@/lib/utils";

function SubsInner() {
  const qc = useQueryClient();
  const { data: subs = [] } = useQuery({ queryKey: ["admin-subs"], queryFn: () => api<any[]>("/api/v1/admin/subscriptions") });
  const { data: plans = [] } = useQuery({ queryKey: ["admin-plans"], queryFn: () => api<any[]>("/api/v1/admin/plans") });
  const { data: users } = useQuery({ queryKey: ["admin-users-grant"], queryFn: () => api<{ items: any[] }>("/api/v1/admin/users?role=student&limit=50") });
  const [form, setForm] = useState({ userId: "", planId: "", startsAt: new Date().toISOString().slice(0, 10), endsAt: "", reason: "Attribution manuelle" });

  async function grant() {
    try {
      await api("/api/v1/admin/subscriptions/grant", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-subs"] });
      toast({ title: "Abonnement attribué" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  return (
    <FadeIn>
      <PageHeader title="Abonnements" description="Grant manuel — chemin réel v1." />
      <Card className="p-6 mb-8 grid sm:grid-cols-2 gap-4 max-w-3xl">
        <div>
          <Label>Élève</Label>
          <select className="h-12 w-full rounded-xl border-2 px-3" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
            <option value="">Choisir…</option>
            {users?.items.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName} — {u.email}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Plan</Label>
          <select className="h-12 w-full rounded-xl border-2 px-3" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
            <option value="">Choisir…</option>
            {plans.filter((p: any) => p.code !== "FREE").map((p: any) => (
              <option key={p.id} value={p.id}>{p.nameFr}</option>
            ))}
          </select>
        </div>
        <div><Label>Début</Label><Input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
        <div><Label>Fin</Label><Input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Motif (≥ 5 caractères)</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        <Button onClick={() => void grant()}>Attribuer</Button>
      </Card>
      <div className="space-y-2">
        {subs.map((s: any) => (
          <Card key={s.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{s.user?.fullName} · {s.plan?.nameFr}</p>
              <p className="text-xs text-muted-foreground">{formatDateTN(s.startsAt)} → {formatDateTN(s.endsAt)} {s.grantReason ? `· ${s.grantReason}` : ""}</p>
            </div>
            <Badge>{s.status}</Badge>
          </Card>
        ))}
      </div>
    </FadeIn>
  );
}

export default function SubsPage() {
  return (
    <RequireAuth roles={["super_admin"]}>
      <SubsInner />
    </RequireAuth>
  );
}
