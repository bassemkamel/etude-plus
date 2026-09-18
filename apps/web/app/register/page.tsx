"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Home, Mail } from "lucide-react";
import { Button, Card, Input, Label, FadeIn } from "@/components/ui/Premium";
import { LoadingScreen } from "@/components/guards";
import { LevelPicker } from "@/components/shared/LevelPicker";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/toast";
import { isSectionLevel } from "@etudeplus/shared";

type Step = "form" | "verify" | "level";

function StepBar({ current }: { current: Step }) {
  const { t } = useTranslation();
  const steps = [
    { id: "form", label: t("register.stepProfile") },
    { id: "verify", label: t("register.stepEmail") },
    { id: "level", label: t("register.gradeLevel") },
  ];
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground border-2 border-border"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium max-w-[90px] text-center ${active ? "text-primary" : done ? "text-green-600" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`w-12 sm:w-16 h-0.5 mx-1 mb-4 ${i < idx ? "bg-green-400" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function RegisterForm() {
  const { t } = useTranslation();
  const { refresh, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [niveau, setNiveau] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const score = useMemo(() => strength(password), [password]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role !== "student") {
      router.replace("/admin");
      return;
    }
    if (user.studentProfile?.gradeLevel && step === "form") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, step, router]);

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const otpValue = otp.join("");

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (firstName.trim().length < 2) return toast({ title: t("common.error"), description: t("register.errorFirstName"), variant: "destructive" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast({ title: t("common.error"), description: t("register.errorEmail"), variant: "destructive" });
    if (password.length < 8) return toast({ title: t("common.error"), description: t("register.errorPassword"), variant: "destructive" });
    if (!terms) return toast({ title: t("common.error"), description: t("register.errorTerms"), variant: "destructive" });
    setLoading(true);
    try {
      await api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ firstName: firstName.trim(), email: email.toLowerCase().trim(), password, termsAccepted: true }),
      });
      setCooldown(30);
      setStep("verify");
    } catch (err) {
      toast({ title: t("common.error"), description: (err as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(code = otpValue) {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await api("/api/v1/auth/otp/verify", { method: "POST", body: JSON.stringify({ email: email.toLowerCase().trim(), code }) });
      await refresh();
      setStep("level");
    } catch (err) {
      toast({ title: t("common.error"), description: (err as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (cooldown) return;
    setLoading(true);
    try {
      await api("/api/v1/auth/otp/send", { method: "POST", body: JSON.stringify({ email: email.toLowerCase().trim() }) });
      setCooldown(30);
      toast({ title: t("register.codeSent"), description: t("register.checkInbox") });
    } catch (err) {
      toast({ title: t("common.error"), description: (err as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function finishLevel() {
    if (!niveau) return toast({ title: t("common.error"), description: t("register.errorLevel"), variant: "destructive" });
    if (isSectionLevel(niveau) && !section) return toast({ title: t("common.error"), description: t("register.errorSection"), variant: "destructive" });
    setLoading(true);
    try {
      await api("/api/v1/students/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ gradeLevel: niveau, educationSection: section ?? "" }),
      });
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      toast({ title: t("common.error"), description: (err as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function setOtpDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) otpRefs.current[i + 1]?.focus();
    const code = next.join("");
    if (code.length === 6) void verifyOtp(code);
  }

  const wrap = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -skew-y-6 origin-top-left -z-10" />
      <FadeIn className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => (step === "form" ? router.push("/") : setStep(step === "level" ? "verify" : "form"))}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
              <Home className="w-4 h-4" /> {t("common.home")}
            </Link>
          </div>
        </div>
        <StepBar current={step} />
        {children}
      </FadeIn>
    </div>
  );

  if (step === "verify") {
    return wrap(
      <Card className="shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("register.verifyTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("register.verifySent")} <span className="font-semibold text-foreground">{email}</span>
        </p>
        <div className="flex justify-center gap-2 mb-6">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el; }}
              value={d}
              onChange={(e) => setOtpDigit(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              maxLength={1}
              className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
            />
          ))}
        </div>
        <Button className="w-full" size="lg" isLoading={loading} onClick={() => void verifyOtp()} disabled={otpValue.length !== 6}>
          {t("register.confirmCreate")}
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          {t("register.codeExpiry")}{" "}
          <button type="button" disabled={cooldown > 0} onClick={() => void resend()} className="text-primary font-semibold disabled:text-muted-foreground">
            {cooldown > 0 ? `${t("register.resendCode")} (${cooldown}s)` : t("register.resendCode")}
          </button>
        </p>
      </Card>,
    );
  }

  if (step === "level") {
    return wrap(
      <Card className="shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-1">{t("register.gradeLevel")}</h2>
        <p className="text-muted-foreground mb-6">{t("register.gradeLevelHint")}</p>
        <LevelPicker
          niveauValue={niveau}
          sectionValue={section}
          onChange={(n, s) => {
            setNiveau(n);
            setSection(s);
          }}
        />
        <div className="flex gap-3 mt-8">
          <Button variant="ghost" className="flex-1" onClick={() => router.replace("/dashboard")}>
            Plus tard
          </Button>
          <Button className="flex-1" size="lg" isLoading={loading} onClick={() => void finishLevel()}>
            Accéder à mon espace
          </Button>
        </div>
      </Card>,
    );
  }

  return wrap(
    <Card className="shadow-xl p-8">
      <h2 className="text-2xl font-bold mb-1">{t("register.createStudentAccount")}</h2>
      <p className="text-muted-foreground mb-6">3 champs, 30 secondes. Ton niveau vient juste après.</p>
      <form onSubmit={submitAccount} className="space-y-4">
        <div>
          <Label>{t("register.firstName")}</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Amine" autoComplete="given-name" />
        </div>
        <div>
          <Label>{t("register.emailAddress")}</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" autoComplete="email" />
        </div>
        <div>
          <Label>{t("register.password")}</Label>
          <div className="relative">
            <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("register.passwordMin")} autoComplete="new-password" />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? (score >= 3 ? "bg-green-500" : "bg-primary") : "bg-muted"}`} />
            ))}
          </div>
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer select-none text-sm text-muted-foreground">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 accent-amber-500" />
          <span>
            {t("register.termsPrefix")}{" "}
            <Link href="/terms" className="text-primary font-semibold">
              {t("register.termsLink")}
            </Link>{" "}
            {t("register.termsAnd")}{" "}
            <Link href="/privacy" className="text-primary font-semibold">
              {t("register.privacyLink")}
            </Link>
            .
          </span>
        </label>
        <Button type="submit" className="w-full" size="lg" isLoading={loading}>
          Créer mon compte
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("register.alreadyRegistered")}{" "}
        <Link href="/login" className="text-primary font-semibold">
          {t("register.signIn")}
        </Link>
      </p>
    </Card>,
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RegisterForm />
    </Suspense>
  );
}
