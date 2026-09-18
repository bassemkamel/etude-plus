"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookPlus } from "lucide-react";
import { Button, Card, Input, Label, FadeIn } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/v1/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
      toast({ title: "Si un compte existe, un code a été envoyé." });
    } catch (err) {
      toast({ title: (err as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/v1/auth/password/reset", { method: "POST", body: JSON.stringify({ email, code, newPassword: password }) });
      toast({ title: "Mot de passe mis à jour" });
      router.replace("/login");
    } catch (err) {
      toast({ title: (err as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center p-4">
      <FadeIn className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Link>
        <Card className="p-8 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <BookPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif font-bold mb-6">Mot de passe oublié</h1>
          {!sent ? (
            <form onSubmit={send} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button className="w-full" isLoading={loading}>Envoyer le code</Button>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-4">
              <div>
                <Label>Code à 6 chiffres</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
              </div>
              <div>
                <Label>Nouveau mot de passe</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
              </div>
              <Button className="w-full" isLoading={loading}>Réinitialiser</Button>
            </form>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
