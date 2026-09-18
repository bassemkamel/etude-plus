"use client";

import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { formatDateTN } from "@/lib/utils";

function AuditInner() {
  const { data = [] } = useQuery({ queryKey: ["admin-audit"], queryFn: () => api<any[]>("/api/v1/admin/audit") });
  return (
    <FadeIn>
      <PageHeader title="Journal d’audit" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2">Date</th>
              <th>Acteur</th>
              <th>Action</th>
              <th>Entité</th>
            </tr>
          </thead>
          <tbody>
            {data.map((l: any) => (
              <tr key={l.id} className="border-b border-border/50">
                <td className="py-2">{formatDateTN(l.createdAt)}</td>
                <td>{l.actor?.email || l.actorId}</td>
                <td className="font-mono text-xs">{l.action}</td>
                <td>{l.entity} {l.entityId ? `· ${l.entityId.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FadeIn>
  );
}

export default function AuditPage() {
  return (
    <RequireAuth roles={["super_admin"]}>
      <AuditInner />
    </RequireAuth>
  );
}
