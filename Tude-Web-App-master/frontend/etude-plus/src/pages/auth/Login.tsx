import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, getDashboardPath } from "@/hooks/use-auth";
import { Button, Card, Input, Label, FadeIn } from "@/components/ui/Premium";
import { BookPlus, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export function Login() {
  const { t } = useTranslation();
  const { loginFn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setIsLoading(true);
    try {
      const user = await loginFn({ ...data, rememberMe });
      setLocation(getDashboardPath(user.role));
    } catch (e: any) {
      const msg = e?.data?.error ?? e?.message ?? t("login.invalidCredentials");
      toast({ title: t("login.loginFailed"), description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -skew-y-6 transform origin-top-left -z-10" />

      <FadeIn className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("login.backHome")}
        </Link>

        <Card className="p-8 shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
              <BookPlus className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-center">{t("login.title")}</h1>
            <p className="text-muted-foreground mt-2 text-center">{t("login.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label>{t("login.email")}</Label>
              <Input {...register("email")} placeholder={t("login.emailPlaceholder")} type="email" autoComplete="email" />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">{t("login.password")}</Label>
              <Input type="password" {...register("password")} placeholder="••••••••" autoComplete="current-password" />
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setRememberMe(v => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${rememberMe ? "bg-primary border-primary" : "border-border bg-background"}`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-muted-foreground" onClick={() => setRememberMe(v => !v)}>
                {t("login.rememberMe")}
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              {t("login.submit")}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-muted-foreground text-sm">
              {t("login.noAccount")}{" "}
              <Link href="/select-role" className="text-primary font-semibold hover:underline">
                {t("login.register")}
              </Link>
            </p>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
