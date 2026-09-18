"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, Input, Label, PageHeader } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { formatDateTN } from "@/lib/utils";

function DiscountsInner() {
  const qc = useQueryClient();
  const { data: codes = [] } = useQuery({ queryKey: ["admin-discounts"], queryFn: () => api<any[]>("/api/v1/admin/discounts") });
  const [form, setForm] = useState({
    code: "",
    type: "percent",
    percentOff: "30",
    maxRedemptions: "50",
    perUserLimit: "",
    startsAt: "",
    expiresAt: "",
  });

  async function create() {
    try {
      await api("/api/v1/admin/discounts", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          percentOff: form.type === "percent" ? Number(form.percentOff) : null,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
          perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
          startsAt: form.startsAt || null,
          expiresAt: form.expiresAt || null,
        }),
      });
      setForm({ ...form, code: "" });
      await qc.invalidateQueries({ queryKey: ["admin-discounts"] });
      toast({ title: "Code créé" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  async function toggle(id: string, isActive: boolean) {
    await api(`/api/v1/admin/discounts/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: !isActive }) });
    await qc.invalidateQueries({ queryKey: ["admin-discounts"] });
  }

  return (
    <FadeIn>
      <PageHeader title="Codes promo" description="Contraintes AND : N premiers, durée, N fois / user." />
      <Card className="p-6 mb-8 grid sm:grid-cols-2 gap-3 max-w-3xl">
        <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="FIRST50" /></div>
        <div><Label>% de réduction</Label><Input type="number" value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: e.target.value })} /></div>
        <div><Label>Max redemptions (ex. 50 premiers)</Label><Input type="number" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="ex. 50 premiers" /></div>
        <div><Label>Limite / user (ex. 2)</Label><Input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} placeholder="ex. 2" /></div>
        <div><Label>Début</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
        <div><Label>Expiration</Label><Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
        <Button onClick={() => void create()}>Créer le code</Button>
      </Card>
      <div className="space-y-2">
        {codes.map((c: any) => (
          <Card key={c.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-mono font-bold">{c.code}</p>
              <p className="text-xs text-muted-foreground">
                {c.percentOff ? `${c.percentOff}%` : ""} · max {c.maxRedemptions ?? "∞"} · /user {c.perUserLimit ?? "∞"}
                {c.expiresAt ? ` · expire ${formatDateTN(c.expiresAt)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.isActive ? "success" : "secondary"}>{c.isActive ? "actif" : "off"}</Badge>
              <Button size="sm" variant="outline" onClick={() => void toggle(c.id, c.isActive)}>Toggle</Button>
            </div>
          </Card>
        ))}
      </div>
    </FadeIn>
  );
}

export default function DiscountsPage() {
  return (
    <RequireAuth roles={["admin", "super_admin"]}>
      <DiscountsInner />
    </RequireAuth>
  );
}
