"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { BookPlus, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button, Card, Input, Label, FadeIn } from "@/components/ui/Premium";
import { GuestOnly, LoadingScreen } from "@/components/guards";
import { api, ApiError } from "@/lib/api";
import { dashboardPath, useAuth, type User } from "@/hooks/use-auth";
import { toast } from "@/components/ui/toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function LoginForm() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await api<User>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      router.replace(next || dashboardPath(user.role));
    } catch (err) {
      const e = err as ApiError;
      toast({
        title: t("login.loginFailed"),
        description: e.message || t("login.invalidCredentials"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -skew-y-6 origin-top-left -z-10" />
      <FadeIn className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("login.backHome")}
          </Link>
          <LanguageSwitcher />
        </div>
        <Card className="p-8 shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
              <BookPlus className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-center">{t("login.title")}</h1>
            <p className="text-muted-foreground mt-2 text-center">{t("login.subtitle")}</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label>{t("login.email")}</Label>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.emailPlaceholder")} required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="mb-0">{t("login.password")}</Label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              {t("login.submit")}
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-muted-foreground text-sm">
              {t("login.noAccount")}{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                {t("login.register")}
              </Link>
            </p>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GuestOnly>
      <Suspense fallback={<LoadingScreen />}>
        <LoginForm />
      </Suspense>
    </GuestOnly>
  );
}
