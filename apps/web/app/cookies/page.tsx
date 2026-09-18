"use client";
import { Navbar } from "@/components/layout/Navbar";
import { FadeIn } from "@/components/ui/Premium";
import Link from "next/link";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <FadeIn>
          <Link href="/" className="text-sm text-primary font-medium">← Accueil</Link>
          <h1 className="text-4xl font-serif font-bold mt-4 mb-8">Cookies</h1>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Étude+ utilise des cookies httpOnly <code>etude_access</code> et <code>etude_refresh</code> pour la session. Ils ne servent pas à la publicité.</p>
            <p>La langue (FR / EN / AR) est mémorisée en localStorage.</p>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
