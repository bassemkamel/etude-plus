"use client";
import { Navbar } from "@/components/layout/Navbar";
import { FadeIn } from "@/components/ui/Premium";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <FadeIn>
          <Link href="/" className="text-sm text-primary font-medium">← Accueil</Link>
          <h1 className="text-4xl font-serif font-bold mt-4 mb-8">Politique de confidentialité</h1>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Nous collectons l’email, le prénom, le niveau scolaire et tes tentatives de révision pour faire fonctionner le service.</p>
            <p>Pas de revente de données. Les PDF élèves restent privés. Un compte peut être archivé (soft-delete) sur demande admin.</p>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
