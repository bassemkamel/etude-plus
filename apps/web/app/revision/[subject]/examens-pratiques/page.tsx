"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/guards";
import { Button, Card, FadeIn, PageHeader } from "@/components/ui/Premium";

export default function PratiquesPage() {
  const params = useParams<{ subject: string }>();
  return (
    <RequireAuth roles={["student"]}>
      <FadeIn>
        <Link href={`/revision/${params.subject}`} className="text-sm text-primary font-medium">← Retour</Link>
        <PageHeader title="Examens pratiques" description="Même moteur que la banque — lance une session." />
        <Card className="p-8 max-w-xl">
          <p className="text-muted-foreground mb-4">Les examens pratiques utilisent les questions publiées de cette matière, avec correction immédiate.</p>
          <Link href={`/revision/${params.subject}/banque`}>
            <Button>Ouvrir la session</Button>
          </Link>
        </Card>
      </FadeIn>
    </RequireAuth>
  );
}
