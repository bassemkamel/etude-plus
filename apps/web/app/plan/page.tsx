"use client";

import Link from "next/link";
import { Check, CreditCard } from "lucide-react";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { useAuth } from "@/hooks/use-auth";
import { daysLeft, formatDateTN, formatTND } from "@/lib/utils";

function PlanInner() {
  const { user } = useAuth();
  const sub = user?.subscription;
  const features = sub?.plan.features as Record<string, unknown> | undefined;

  return (
    <FadeIn>
      <PageHeader title="Mon plan" description="Statut, dates et fonctionnalités." />
      <Card className="p-8 max-w-2xl">
        {sub ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif font-bold">{sub.plan.nameFr}</h2>
                <p className="text-muted-foreground mt-1">{formatTND(Number(sub.plan.priceTnd))}</p>
              </div>
              <Badge variant="success">{sub.status}</Badge>
            </div>
            <p className="mt-6 text-sm">
              Du <strong>{formatDateTN(sub.startsAt)}</strong> au <strong>{formatDateTN(sub.endsAt)}</strong>
              {" "}· {daysLeft(sub.endsAt)} jours restants
            </p>
            <ul className="mt-6 space-y-2">
              {[
                features?.questionBank && "Banque de questions",
                features?.practiceExams && "Examens pratiques",
                features?.pastPapers && "Annales",
                features?.flashcards && "Flashcards",
                `PDF / mois : ${features?.pdfQuotaMonth ?? 0}`,
              ].filter(Boolean).map((f) => (
                <li key={String(f)} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" /> {f as string}
                </li>
              ))}
            </ul>
            <Button className="mt-8" disabled title="Paiement bientôt ouvert">
              Renouveler
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Le paiement en ligne n’est pas encore ouvert.</p>
          </>
        ) : (
          <>
            <CreditCard className="w-10 h-10 text-primary mb-4" />
            <h2 className="text-2xl font-serif font-bold">Plan Gratuit</h2>
            <p className="text-muted-foreground mt-2 mb-6">Aperçu 3 questions par module et par jour.</p>
            <Link href="/pricing"><Button>Passe à Plus</Button></Link>
          </>
        )}
      </Card>
    </FadeIn>
  );
}

export default function PlanPage() {
  return (
    <RequireAuth roles={["student"]}>
      <PlanInner />
    </RequireAuth>
  );
}
