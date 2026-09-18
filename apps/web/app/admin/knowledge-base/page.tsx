"use client";

import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { formatDateTN } from "@/lib/utils";

function KbInner() {
  const { data: files = [] } = useQuery({ queryKey: ["admin-kb"], queryFn: () => api<any[]>("/api/v1/admin/kb/files") });
  return (
    <FadeIn>
      <PageHeader title="Base de connaissances" description="Upload PDF/DOCX → pipeline IA en brouillon. Publication humaine obligatoire." />
      <Card className="p-8 text-center mb-6">
        <p className="font-semibold">Pipeline d’ingestion</p>
        <p className="text-sm text-muted-foreground mt-2">Le job BullMQ + MinIO sera branché ensuite. Les fichiers déjà traités apparaissent ci-dessous.</p>
      </Card>
      {files.length === 0 && <p className="text-sm text-muted-foreground">Aucun fichier pour l’instant.</p>}
      <div className="space-y-2">
        {files.map((f: any) => (
          <Card key={f.id} className="p-4 flex justify-between">
            <div>
              <p className="font-medium">{f.fileName || f.originalName || f.id}</p>
              <p className="text-xs text-muted-foreground">{formatDateTN(f.createdAt)}</p>
            </div>
            <Badge>{f.status}</Badge>
          </Card>
        ))}
      </div>
    </FadeIn>
  );
}

export default function KbPage() {
  return (
    <RequireAuth roles={["admin", "super_admin"]}>
      <KbInner />
    </RequireAuth>
  );
}
