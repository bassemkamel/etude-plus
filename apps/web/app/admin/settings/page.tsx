"use client";

import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader, Badge } from "@/components/ui/Premium";

export default function AdminSettingsPage() {
  return (
    <RequireAuth roles={["super_admin"]}>
      <FadeIn>
        <PageHeader title="Réglages" description="Feature flags v1." />
        <Card className="p-6 space-y-3 max-w-xl">
          <div className="flex justify-between"><span>Paiements</span><Badge variant="secondary">ENABLE_PAYMENTS=false</Badge></div>
          <div className="flex justify-between"><span>IA live</span><Badge variant="secondary">ENABLE_AI=false</Badge></div>
          <div className="flex justify-between"><span>Maintenance</span><Badge variant="success">off</Badge></div>
          <p className="text-sm text-muted-foreground pt-2">Les flags se règlent dans <code>.env</code> côté API.</p>
        </Card>
      </FadeIn>
    </RequireAuth>
  );
}
