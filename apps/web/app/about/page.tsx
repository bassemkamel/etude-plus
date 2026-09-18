"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { FadeIn } from "@/components/ui/Premium";

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <FadeIn>
          <Link href="/" className="text-sm text-primary font-medium">
            ← Accueil
          </Link>
          <h1 className="text-4xl font-serif font-bold mt-4 mb-8">{title}</h1>
          <div className="prose prose-neutral max-w-none space-y-4 text-muted-foreground leading-relaxed">{children}</div>
        </FadeIn>
      </main>
    </div>
  );
}

export default function AboutPage() {
  return (
    <LegalShell title="À propos d’Étude+">
      <p>
        Étude+ est une plateforme tunisienne de révision scolaire, du collège au Bac. Banque de questions, examens pratiques,
        annales et flashcards — alignés sur le programme officiel.
      </p>
      <p>Pas de classes live, pas de marketplace professeurs : juste un espace clair pour réviser et suivre tes notes /20.</p>
    </LegalShell>
  );
}
