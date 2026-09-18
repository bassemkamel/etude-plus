import { useState } from "react";
import { sendCode, verifyCode } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useAuth, getDashboardPath } from "@/hooks/use-auth";
import { Button, Card, Input, Label, FadeIn } from "@/components/ui/Premium";
import {
  ArrowLeft, Loader2, CheckCircle2, Home, Mail, KeyRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TUNISIA_CITIES } from "@/lib/constants";
import { isSectionLevel } from "@/lib/educationConfig";
import { LevelPicker } from "@/components/shared/LevelPicker";
import { useTranslation } from "react-i18next";

// ─── Step types ───────────────────────────────────────────────────────────────

type SharedStep = "form" | "verify-email";
type ProfStep = SharedStep | "done";
type StudentStep = SharedStep | "done";

// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: string }) {
  const { t } = useTranslation();
  const steps = [
    { id: "form",         label: t("register.stepProfile") },
    { id: "verify-email", label: t("register.stepEmail") },
    { id: "done",         label: t("register.stepDone") },
  ];
  const idx = steps.findIndex(s => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done   ? "bg-green-500 text-white" :
                active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                         "bg-muted text-muted-foreground border-2 border-border"
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? "text-primary" : done ? "text-green-600" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-14 h-0.5 mx-1 mb-4 ${i < idx ? "bg-green-400" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function Register() {
  const { t } = useTranslation();
  const { registerFn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // MVP: professor role suppressed — always default to student regardless of query param
  const [role, setRole] = useState<"student" | "professor">("student");

  // Step state
  const [step, setStep] = useState<string>("form");

  // Form fields (controlled)
  const [firstName, setFirstName]         = useState("");
  const [lastName, setLastName]           = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity]                   = useState("Tunis");
  const [niveauKey, setNiveauKey]         = useState("");
  const [sectionKey, setSectionKey]       = useState<string | null>(null);
  const [schoolName, setSchoolName]       = useState("");

  // Email verification
  const [otpCode, setOtpCode]             = useState("");
  const [otpLoading, setOtpLoading]       = useState(false);
  const [sendingCode, setSendingCode]     = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [devCode, setDevCode]             = useState<string | null>(null);

  const [isLoading, setIsLoading]         = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ── Validation ───────────────────────────────────────────────────────────────

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  function validateForm(): string | null {
    if (!firstName.trim() || firstName.trim().length < 2) return t("register.errorFirstName");
    if (!lastName.trim() || lastName.trim().length < 2) return t("register.errorLastName");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t("register.errorEmail");
    if (password.length < 8) return t("register.errorPassword");
    if (password !== confirmPassword) return t("register.errorPasswordMatch");
    if (!city) return t("register.errorCity");
    if (role === "student" && !niveauKey) return t("register.errorLevel");
    if (role === "student" && isSectionLevel(niveauKey) && !sectionKey) return t("register.errorSection");
    if (!termsAccepted) return t("register.errorTerms");
    return null;
  }

  // ── Step 1 → Send OTP ────────────────────────────────────────────────────────

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) { toast({ title: t("common.error"), description: err, variant: "destructive" }); return; }

    setSendingCode(true);
    try {
      const data = await sendCode({ email: email.toLowerCase().trim() });
      setRegisteredEmail(email.toLowerCase().trim());
      if (data.devCode) setDevCode(data.devCode);
      setStep("verify-email");
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSendingCode(false);
    }
  };

  // ── Step 2 → Verify OTP → Register ──────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { toast({ title: t("common.error"), description: t("register.errorCodeLength"), variant: "destructive" }); return; }
    setOtpLoading(true);
    try {
      // Verify code
      await verifyCode({ email: registeredEmail, code: otpCode });

      // Create account
      setIsLoading(true);
      const payload: any = {
        email: registeredEmail, password, role, fullName: fullName.trim(), city,
        termsAccepted: true,
      };
      if (role === "student") {
        payload.gradeLevel = niveauKey;
        payload.educationSection = sectionKey || undefined;
        payload.schoolName = schoolName || undefined;
      } else {
        payload.subjects = [];
        payload.gradeLevels = [];
      }

      const registeredUser = await registerFn(payload);

      // MVP: professor post-registration redirect suppressed
      setStep("done");
      setTimeout(() => setLocation(getDashboardPath(registeredUser.role)), 800);
    } catch (e: any) {
      const msg = e?.data?.error ?? e?.message ?? t("common.error");
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setOtpLoading(false);
      setIsLoading(false);
    }
  };

  const wrapper = (children: React.ReactNode) => (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -skew-y-6 transform origin-top-left -z-10" />
      <FadeIn className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step === "form" ? history.back() : setStep("form")} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </button>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-4 h-4" /> {t("common.home")}
          </Link>
        </div>
        <StepBar current={step} />
        {children}
      </FadeIn>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Step: Email verification
  // ══════════════════════════════════════════════════════════════════════════════
  if (step === "verify-email") {
    return wrapper(
      <Card className="shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("register.verifyTitle")}</h2>
        <p className="text-muted-foreground mb-1">
          {t("register.verifySent")}
        </p>
        <p className="font-semibold text-foreground mb-6">{registeredEmail}</p>

        {/* DEV ONLY — remove before launch */}
        {devCode && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-xl text-center">
            <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">DEV — Code de test</p>
            <p className="text-2xl font-mono font-bold text-yellow-800 tracking-widest mt-1">{devCode}</p>
          </div>
        )}

        <div className="mb-6">
          <Label>{t("register.verificationCode")}</Label>
          <Input
            className="mt-2 text-center text-2xl font-bold tracking-[0.5em] h-14"
            maxLength={6}
            placeholder="000000"
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
            autoFocus
          />
        </div>

        <Button className="w-full" size="lg" disabled={otpLoading || isLoading || otpCode.length !== 6} onClick={handleVerifyOtp}>
          {otpLoading || isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("register.verifying")}</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> {t("register.confirmCreate")}</>}
        </Button>

        <button
          className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          onClick={async () => {
            setSendingCode(true);
            try {
              const resendData = await sendCode({ email: registeredEmail });
              if (resendData.devCode) setDevCode(resendData.devCode);
              toast({ title: t("register.codeSent"), description: t("register.checkInbox") });
            } finally { setSendingCode(false); }
          }}
          disabled={sendingCode}
        >
          {sendingCode ? t("register.sending") : t("register.resendCode")}
        </button>

        <p className="text-xs text-muted-foreground mt-4">{t("register.codeExpiry")}</p>
      </Card>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Step: Form (Step 1)
  // ══════════════════════════════════════════════════════════════════════════════
  return wrapper(
    <Card className="shadow-xl overflow-hidden">
      {/* MVP: role toggle suppressed — student-only registration
      <div className="bg-muted p-2 flex border-b border-border">
        {(["student", "professor"] as const).map(r => (
          <button key={r} type="button" ...>
            {r === "student" ? t("register.iAmStudent") : t("register.iAmProfessor")}
          </button>
        ))}
      </div>
      */}

      <form onSubmit={handleFormSubmit} className="p-8 space-y-5">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold">{t("register.createStudentAccount")}</h1>
        </div>

        {/* First + Last name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("register.firstName")}</Label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t("register.firstName")} className="mt-1.5" />
          </div>
          <div>
            <Label>{t("register.lastName")}</Label>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t("register.lastName")} className="mt-1.5" />
          </div>
        </div>

        {/* Email */}
        <div>
          <Label>{t("register.emailAddress")}</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder={t("login.emailPlaceholder")} className="mt-1.5" />
        </div>

        {/* Password + confirm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>{t("register.password")}</Label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("register.passwordMin")} className="pl-9" />
            </div>
          </div>
          <div>
            <Label>{t("register.confirmPassword")}</Label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t("register.repeatPassword")}
                className={`pl-9 ${confirmPassword && confirmPassword !== password ? "border-red-400" : confirmPassword && confirmPassword === password ? "border-green-400" : ""}`}
              />
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1">{t("register.errorPasswordMatch")}</p>
            )}
          </div>
        </div>

        {/* City */}
        <div>
          <Label>{t("register.city")}</Label>
          <select value={city} onChange={e => setCity(e.target.value)} className="mt-1.5 flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary">
            {TUNISIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* ── STUDENT FIELDS ── */}
        {role === "student" && (
          <>
            <div>
              <Label>{t("register.gradeLevel")} <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">{t("register.gradeLevelHint")}</p>
              <LevelPicker
                niveauValue={niveauKey}
                sectionValue={sectionKey}
                onChange={(n, s) => { setNiveauKey(n); setSectionKey(s); }}
              />
            </div>
            <div>
              <Label>{t("register.schoolName")}</Label>
              <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder={t("register.schoolNamePlaceholder")} className="mt-1.5" />
            </div>
          </>
        )}

        {/* MVP: professor KYC note suppressed */}

        {/* Terms acceptance */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              termsAccepted ? "bg-primary border-primary" : "border-border bg-background group-hover:border-primary/50"
            }`}>
              {termsAccepted && (
                <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
                  <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-600 leading-snug">
            {t("register.termsPrefix")}{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {t("register.termsLink")}
            </a>
            {" "}{t("register.termsAnd")}{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {t("register.privacyLink")}
            </a>
            {" "}{t("register.termsSuffix")}
          </span>
        </label>

        <Button type="submit" className="w-full mt-2" size="lg" disabled={sendingCode}>
          {sendingCode
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("register.sendingCode")}</>
            : <><Mail className="w-4 h-4 mr-2" /> {t("register.continueVerify")}</>}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("register.alreadyRegistered")}{" "}<Link href="/login" className="text-primary font-medium hover:underline">{t("register.signIn")}</Link>
        </p>
      </form>
    </Card>
  );
}
