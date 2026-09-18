"use client";
import { Navbar } from "@/components/layout/Navbar";
import { FadeIn } from "@/components/ui/Premium";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <FadeIn>
          <Link href="/" className="text-sm text-primary font-medium">← Accueil</Link>
          <h1 className="text-4xl font-serif font-bold mt-4 mb-8">Conditions d’utilisation</h1>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>En créant un compte Étude+, tu acceptes d’utiliser la plateforme pour un usage scolaire personnel.</p>
            <p>Le contenu (questions, annales, flashcards) reste la propriété d’Étude+. La reproduction massive est interdite.</p>
            <p>Les comptes peuvent être suspendus en cas d’abus. Les données sont conservées selon la politique de confidentialité.</p>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
