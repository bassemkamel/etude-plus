import Link from "next/link";
import { Button } from "@/components/ui/Premium";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center p-8 text-center">
      <p className="text-sm font-bold tracking-widest text-primary uppercase mb-3">404</p>
      <h1 className="text-4xl font-serif font-bold mb-3">Page introuvable</h1>
      <p className="text-muted-foreground mb-8">Ce chemin n’existe pas sur Étude+.</p>
      <Link href="/"><Button>Retour à l’accueil</Button></Link>
    </div>
  );
}
