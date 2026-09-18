"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button, Card, FadeIn, Badge } from "@/components/ui/Premium";
import { MathBackground } from "@/components/ui/MathBackground";
import { api } from "@/lib/api";
import { formatTND } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type Plan = {
  id: string;
  code: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  priceTnd: string | number;
  interval: string;
  features: Record<string, unknown>;
};

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<Plan[]>("/api/v1/plans"),
  });

  const name = (p: Plan) => (i18n.language === "ar" ? p.nameAr : i18n.language === "en" ? p.nameEn : p.nameFr);

  return (
    <div className="min-h-screen bg-[#FFFDF7] relative">
      <MathBackground />
      <Navbar />
      <main className="relative z-10 max-w-6xl mx-auto px-4 pt-28 pb-20">
        <FadeIn className="text-center mb-14">
          <Badge className="mb-4">{t("pricing.hero.badge")}</Badge>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            {t("pricing.hero.title1")} <span className="text-primary">{t("pricing.hero.titleHighlight")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Commence gratuitement. Passe à Plus pour la banque complète, les annales, les flashcards et 5 PDF / mois.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p, i) => {
            const plus = p.code !== "FREE";
            const yearly = p.interval === "yearly";
            const features = [
              plus ? "Banque, examens, annales, flashcards illimités" : "Aperçu 3 questions / module / jour",
              plus ? "5 PDF → questions privées / mois" : "Pas d’upload PDF",
              plus ? "Suivi de progression complet" : "Suivi de base",
              yearly ? "2 mois offerts vs mensuel" : plus ? "Sans engagement" : "Sans carte bancaire",
            ];
            return (
              <FadeIn key={p.id} delay={i * 0.08}>
                <Card className={`p-8 h-full flex flex-col ${plus && yearly ? "ring-2 ring-primary shadow-xl shadow-primary/10" : ""}`}>
                  {plus && yearly && (
                    <Badge className="self-start mb-3">
                      <Sparkles className="w-3 h-3 mr-1" /> Meilleure valeur
                    </Badge>
                  )}
                  <h2 className="text-2xl font-serif font-bold">{name(p)}</h2>
                  <p className="mt-4">
                    <span className="text-4xl font-bold">{Number(p.priceTnd) === 0 ? "0" : formatTND(Number(p.priceTnd))}</span>
                    {Number(p.priceTnd) > 0 && (
                      <span className="text-muted-foreground text-sm"> / {p.interval === "yearly" ? "an" : "mois"}</span>
                    )}
                  </p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={user ? "/plan" : "/register"} className="mt-8">
                    <Button className="w-full" variant={plus ? "default" : "outline"}>
                      {plus ? (user ? "Voir mon plan" : "Choisir Plus") : user ? "Rester gratuit" : "Commencer gratuitement"}
                    </Button>
                  </Link>
                </Card>
              </FadeIn>
            );
          })}
        </div>

        {user && (
          <Card className="mt-10 p-6 max-w-xl mx-auto">
            <p className="font-semibold mb-2">Tu as un code promo ?</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="FIRST50"
                className="flex-1 h-12 rounded-xl border-2 border-border px-4"
              />
              <Button variant="outline" disabled title="Paiement bientôt ouvert">
                Appliquer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Le paiement en ligne arrive bientôt. En v1, un admin t’attribue Plus manuellement.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
