"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { formatDateTN } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type Doc = { id: string; fileName: string; status: string; questionsCount: number; createdAt: string };

function DocsInner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const quota = Number((user?.subscription?.plan.features as any)?.pdfQuotaMonth ?? 0);
  const { data: docs = [] } = useQuery({ queryKey: ["documents"], queryFn: () => api<Doc[]>("/api/v1/documents") });

  async function onFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "PDF uniquement", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd (15 Mo max)", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api("/api/v1/documents", { method: "POST", body: JSON.stringify({ fileName: file.name }) });
      await qc.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Document enregistré" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <FadeIn>
      <PageHeader title="Mes documents" description={`Quota PDF ce mois : ${quota}. Questions générées = workspace privé.`} />
      <Card
        className="p-10 text-center mb-8 border-dashed cursor-pointer hover:border-primary/50"
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="w-10 h-10 mx-auto text-primary mb-3" />
        <p className="font-semibold">Dépose un PDF ici</p>
        <p className="text-sm text-muted-foreground">15 Mo max · la génération IA sera branchée ensuite</p>
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
        <Button className="mt-4" isLoading={loading} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Choisir un fichier</Button>
      </Card>
      <div className="space-y-2">
        {docs.map((d) => (
          <Card key={d.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{d.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatDateTN(d.createdAt)} · {d.questionsCount} questions</p>
            </div>
            <Badge variant={d.status === "ready" ? "success" : "secondary"}>{d.status}</Badge>
          </Card>
        ))}
        {docs.length === 0 && <p className="text-sm text-muted-foreground">Aucun document pour l’instant.</p>}
      </div>
    </FadeIn>
  );
}

export default function DocumentsPage() {
  return (
    <RequireAuth roles={["student"]}>
      <DocsInner />
    </RequireAuth>
  );
}
