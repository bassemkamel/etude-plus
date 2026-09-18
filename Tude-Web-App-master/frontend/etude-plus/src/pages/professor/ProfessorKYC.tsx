import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button } from "@/components/ui/Premium";
import { useAuth } from "@/hooks/use-auth";
import { getToken } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2, Upload, FileText, X, Eye, Loader2, ChevronRight,
  AlertCircle, Camera, BadgeCheck, ShieldCheck,
} from "lucide-react";

// ─── Upload helpers ───────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function uploadDoc(file: File): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${API_URL}/storage/uploads/request-url`, {
    method: "POST", headers,
    body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size }),
  });
  const { uploadURL, objectPath, local } = await r.json();
  if (local) {
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await fetch(`${API_URL}/storage/uploads/direct`, {
      method: "POST", headers,
      body: JSON.stringify({ objectPath, content: b64, contentType: file.type }),
    });
  } else {
    await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  }
  return objectPath;
}

interface UploadedFile { name: string; objectPath: string }

// ─── Reusable upload slot ──────────────────────────────────────────────────────

function UploadSlot({
  label, subtitle, required, optional, accept, file, uploading, onUpload, onClear, uploadingLabel, chooseLabel, icon: Icon = FileText,
}: {
  label: string; subtitle: string; required?: boolean; optional?: string; accept: string;
  file: UploadedFile | null; uploading: boolean;
  onUpload: (f: File) => void; onClear: () => void;
  uploadingLabel: string; chooseLabel: string;
  icon?: React.ElementType;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${file ? "border-green-400 bg-green-50" : "border-border bg-muted/30 hover:border-primary/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${file ? "bg-green-100" : "bg-muted"}`}>
            {file ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Icon className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">
              {label} {required && <span className="text-destructive">*</span>}
              {!required && optional && <span className="text-xs font-normal text-muted-foreground ml-1">({optional})</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            {file && <p className="text-xs text-green-700 font-medium mt-1 truncate">{file.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {file && (
            <a href={`${API_URL}/storage${file.objectPath}`} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-green-100 text-green-700">
              <Eye className="w-4 h-4" />
            </a>
          )}
          {file ? (
            <button type="button" onClick={onClear} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:border-primary/40 disabled:opacity-50">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? uploadingLabel : chooseLabel}
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" className="hidden" accept={accept}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {steps.map((label, i) => {
          const done = i + 1 < step;
          const active = i + 1 === step;
          return (
            <div key={label} className="flex-1 flex flex-col items-center relative">
              {i < steps.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${done ? "bg-primary" : "bg-border"}`} />
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground border-2 border-border"
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfessorKYC() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const profProfile = (user as any)?.professorProfile;
  const profId: number | undefined = profProfile?.id;
  const kycStatus: string = profProfile?.kycStatus ?? "not_submitted";
  const kycRejectionReasons: string[] = profProfile?.kycRejectionReasons ?? [];

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: Identity
  const [cinFront, setCinFront] = useState<UploadedFile | null>(null);
  const [cinBack, setCinBack] = useState<UploadedFile | null>(null);
  const [uploadingCinFront, setUploadingCinFront] = useState(false);
  const [uploadingCinBack, setUploadingCinBack] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState((user as any)?.phone ?? "");

  // Step 2: Documents
  const [diploma, setDiploma] = useState<UploadedFile | null>(null);
  const [teachingCert, setTeachingCert] = useState<UploadedFile | null>(null);
  const [additionalDoc, setAdditionalDoc] = useState<UploadedFile | null>(null);
  const [uploadingDiploma, setUploadingDiploma] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  // Step 3
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const STEPS = [t("prof.kyc.stepIdentity"), t("prof.kyc.stepDocuments"), t("prof.kyc.stepConfirm")];

  useEffect(() => {
    if (kycStatus === "rejected" && profProfile) {
      if (profProfile.legalName) setLegalName(profProfile.legalName);
      if (profProfile.dateOfBirth) setDateOfBirth(profProfile.dateOfBirth);
      if ((user as any)?.phone) setPhone((user as any).phone);
    }
  }, [kycStatus]);

  useEffect(() => {
    if (kycStatus === "approved") {
      setTimeout(() => setLocation("/professor/dashboard"), 1500);
    }
  }, [kycStatus]);

  // Upload helpers
  async function handleUpload(
    file: File,
    setter: (f: UploadedFile) => void,
    setUploading: (v: boolean) => void,
  ) {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: t("prof.kyc.fileTooLarge"), description: t("prof.kyc.maxSize"), variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const path = await uploadDoc(file);
      setter({ name: file.name, objectPath: path });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  }

  // Validation
  const canProceedStep1 = cinFront && cinBack && legalName.trim().length >= 2 && dateOfBirth && phone.trim().length >= 5;
  const canProceedStep2 = !!diploma;

  async function handleSubmit() {
    if (!certified) {
      toast({ title: t("prof.kyc.certRequired"), description: t("prof.kyc.certRequiredDesc"), variant: "destructive" });
      return;
    }
    if (!profId) return;
    setSubmitting(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/professors/${profId}/submit-kyc`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cinFrontUrl: cinFront!.objectPath,
          cinBackUrl: cinBack!.objectPath,
          universityDiplomaUrl: diploma!.objectPath,
          teachingCertUrl: teachingCert?.objectPath ?? null,
          additionalDocUrl: additionalDoc?.objectPath ?? null,
          legalName: legalName.trim(),
          dateOfBirth,
          phone: phone.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? t("prof.kyc.submitError"));
      }

      await qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setSubmitted(true);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  // ── Status screens ────────────────────────────────────────────────────────

  if (kycStatus === "pending") {
    return (
      <DashboardLayout>
        <FadeIn>
          <PageHeader title={t("prof.kyc.title")} description={t("prof.kyc.pendingDesc")} />
          <div className="max-w-lg space-y-4">
            <Card className="p-8 text-center border-2 border-blue-200 bg-blue-50">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t("prof.kyc.pendingTitle")}</h2>
              <p className="text-muted-foreground">{t("prof.kyc.pendingMsg")}</p>
            </Card>
            <Card className="p-5 border border-border">
              <div className="flex items-start gap-3">
                <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{t("prof.kyc.nextStepTitle")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("prof.kyc.nextStepDesc")}</p>
                </div>
              </div>
            </Card>
          </div>
        </FadeIn>
      </DashboardLayout>
    );
  }

  if (kycStatus === "approved") {
    return (
      <DashboardLayout>
        <FadeIn>
          <PageHeader title={t("prof.kyc.approvedTitle")} description={t("prof.kyc.approvedDesc")} />
          <div className="max-w-lg space-y-4">
            <Card className="p-8 text-center border-2 border-green-200 bg-green-50">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t("prof.kyc.approvedBadge")}</h2>
              <p className="text-muted-foreground mb-6">{t("prof.kyc.approvedMsg")}</p>
              <Button onClick={() => setLocation("/professor/qualifications")} size="lg" className="w-full">
                {t("prof.kyc.submitQualifications")}
              </Button>
            </Card>
          </div>
        </FadeIn>
      </DashboardLayout>
    );
  }

  if (submitted) {
    return (
      <DashboardLayout>
        <FadeIn>
          <div className="max-w-lg space-y-4">
            <Card className="p-8 text-center border-2 border-green-200 bg-green-50">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t("prof.kyc.submittedTitle")}</h2>
              <p className="text-muted-foreground mb-2">{t("prof.kyc.submittedMsg1")}</p>
              <p className="text-muted-foreground mb-6">{t("prof.kyc.submittedMsg2")}</p>
              <Button onClick={() => setLocation("/professor/dashboard")} size="lg" className="w-full">
                {t("prof.kyc.goToDashboard")}
              </Button>
            </Card>
            <Card className="p-5 border border-border">
              <div className="flex items-start gap-3">
                <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{t("prof.kyc.whatNextTitle")}</p>
                  <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                    <li>{t("prof.kyc.whatNext1")}</li>
                    <li>{t("prof.kyc.whatNext2")}</li>
                    <li>{t("prof.kyc.whatNext3")}</li>
                  </ol>
                </div>
              </div>
            </Card>
          </div>
        </FadeIn>
      </DashboardLayout>
    );
  }

  // ── Rejection banner ──────────────────────────────────────────────────────

  const rejectionBanner = kycStatus === "rejected" && (
    <Card className="p-4 border-2 border-red-200 bg-red-50 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800 mb-1">{t("prof.kyc.rejectedBanner")}</p>
          {kycRejectionReasons.length > 0 && (
            <ul className="space-y-1 mb-2">
              {kycRejectionReasons.map((reason, i) => (
                <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-red-600">{t("prof.kyc.rejectedFix")}</p>
        </div>
      </div>
    </Card>
  );

  // ── STEP 1: Identity ──────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <DashboardLayout>
        <FadeIn>
          <PageHeader
            title={t("prof.kyc.step1Title")}
            description={t("prof.kyc.step1Desc")}
          />
          <div className="max-w-2xl">
            {rejectionBanner}
            <ProgressBar step={1} steps={STEPS} />
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold mb-1">{t("prof.kyc.identitySection")}</h2>
                <p className="text-sm text-muted-foreground">{t("prof.kyc.identitySectionDesc")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UploadSlot
                  label={t("prof.kyc.cinFront")} subtitle={t("prof.kyc.cinFrontSubtitle")} required
                  accept=".jpg,.jpeg,.png,.pdf" icon={Camera}
                  file={cinFront} uploading={uploadingCinFront}
                  uploadingLabel={t("prof.kyc.uploading")} chooseLabel={t("prof.kyc.choose")}
                  onUpload={f => handleUpload(f, setCinFront, setUploadingCinFront)}
                  onClear={() => setCinFront(null)}
                />
                <UploadSlot
                  label={t("prof.kyc.cinBack")} subtitle={t("prof.kyc.cinBackSubtitle")} required
                  accept=".jpg,.jpeg,.png,.pdf" icon={Camera}
                  file={cinBack} uploading={uploadingCinBack}
                  uploadingLabel={t("prof.kyc.uploading")} chooseLabel={t("prof.kyc.choose")}
                  onUpload={f => handleUpload(f, setCinBack, setUploadingCinBack)}
                  onClear={() => setCinBack(null)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  {t("prof.kyc.legalName")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" value={legalName} onChange={e => setLegalName(e.target.value)}
                  placeholder={t("prof.kyc.legalNamePlaceholder")}
                  className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("prof.kyc.dateOfBirth")} <span className="text-destructive">*</span></label>
                  <input
                    type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                    className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("prof.kyc.phone")} <span className="text-destructive">*</span></label>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="lg" disabled={!canProceedStep1} onClick={() => setStep(2)} className="gap-2">
                  {t("prof.kyc.continue")} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </FadeIn>
      </DashboardLayout>
    );
  }

  // ── STEP 2: Documents ─────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <DashboardLayout>
        <FadeIn>
          <PageHeader
            title={t("prof.kyc.step2Title")}
            description={t("prof.kyc.step2Desc")}
          />
          <div className="max-w-2xl">
            {rejectionBanner}
            <ProgressBar step={2} steps={STEPS} />
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold mb-1">{t("prof.kyc.docsSection")}</h2>
                <p className="text-sm text-muted-foreground">{t("prof.kyc.docsSectionDesc")}</p>
              </div>

              <div className="space-y-3">
                <UploadSlot
                  label={t("prof.kyc.universityDiploma")} required
                  subtitle={t("prof.kyc.universityDiplomaSubtitle")}
                  accept=".pdf,.jpg,.jpeg,.png"
                  file={diploma} uploading={uploadingDiploma}
                  uploadingLabel={t("prof.kyc.uploading")} chooseLabel={t("prof.kyc.choose")}
                  onUpload={f => handleUpload(f, setDiploma, setUploadingDiploma)}
                  onClear={() => setDiploma(null)}
                />
                <UploadSlot
                  label={t("prof.kyc.teachingCert")}
                  subtitle={t("prof.kyc.teachingCertSubtitle")}
                  accept=".pdf,.jpg,.jpeg,.png"
                  optional={t("prof.kyc.optional")}
                  file={teachingCert} uploading={uploadingCert}
                  uploadingLabel={t("prof.kyc.uploading")} chooseLabel={t("prof.kyc.choose")}
                  onUpload={f => handleUpload(f, setTeachingCert, setUploadingCert)}
                  onClear={() => setTeachingCert(null)}
                />
                <UploadSlot
                  label={t("prof.kyc.additionalDoc")}
                  subtitle={t("prof.kyc.additionalDocSubtitle")}
                  accept=".pdf,.jpg,.jpeg,.png"
                  optional={t("prof.kyc.optional")}
                  file={additionalDoc} uploading={uploadingAdditional}
                  uploadingLabel={t("prof.kyc.uploading")} chooseLabel={t("prof.kyc.choose")}
                  onUpload={f => handleUpload(f, setAdditionalDoc, setUploadingAdditional)}
                  onClear={() => setAdditionalDoc(null)}
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <p className="font-semibold mb-1 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  {t("prof.kyc.twoStepVerifTitle")}
                </p>
                <p>{t("prof.kyc.twoStepVerifDesc")}</p>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" size="lg" onClick={() => setStep(1)}>{t("common.back")}</Button>
                <Button size="lg" disabled={!canProceedStep2} onClick={() => setStep(3)} className="gap-2">
                  {t("prof.kyc.continue")} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </FadeIn>
      </DashboardLayout>
    );
  }

  // ── STEP 3: Review & Submit ───────────────────────────────────────────────

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader title={t("prof.kyc.step3Title")} description={t("prof.kyc.step3Desc")} />
        <div className="max-w-2xl">
          {rejectionBanner}
          <ProgressBar step={3} steps={STEPS} />
          <Card className="p-6 space-y-6">

            {/* Identity summary */}
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> {t("prof.kyc.identitySection")}
              </p>
              <div className="p-4 bg-muted/30 rounded-xl text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("prof.kyc.legalName")}</span>
                  <span className="font-medium">{legalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("prof.kyc.dateOfBirth")}</span>
                  <span className="font-medium">{dateOfBirth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("prof.kyc.phone")}</span>
                  <span className="font-medium">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("prof.kyc.cin")}</span>
                  <span className="font-medium text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t("prof.kyc.cinUploaded")}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents summary */}
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> {t("prof.kyc.docsSection")}
              </p>
              <div className="space-y-2">
                {[
                  { doc: diploma, label: t("prof.kyc.universityDiploma") },
                  { doc: teachingCert, label: t("prof.kyc.teachingCert") },
                  { doc: additionalDoc, label: t("prof.kyc.additionalDoc") },
                ].filter(d => d.doc).map(({ doc, label }) => (
                  <a key={label} href={`${API_URL}/storage${doc!.objectPath}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-800 flex-1 truncate">{label} : {doc!.name}</span>
                    <Eye className="w-4 h-4 text-green-600" />
                  </a>
                ))}
              </div>
            </div>

            {/* Info banner */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-1">
              <p className="font-semibold">{t("prof.kyc.afterApproval")}</p>
              <p>{t("prof.kyc.afterApprovalDesc")}</p>
            </div>

            {/* Certification */}
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-muted/30 rounded-xl">
              <input
                type="checkbox" checked={certified} onChange={e => setCertified(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-primary"
              />
              <span className="text-sm font-medium">{t("prof.kyc.certStatement")}</span>
            </label>

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(2)}>{t("common.back")}</Button>
              <Button size="lg" disabled={!certified || submitting} onClick={handleSubmit} className="gap-2">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("prof.kyc.submitting")}</>
                  : <><CheckCircle2 className="w-4 h-4" /> {t("prof.kyc.submitApplication")}</>
                }
              </Button>
            </div>
          </Card>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
