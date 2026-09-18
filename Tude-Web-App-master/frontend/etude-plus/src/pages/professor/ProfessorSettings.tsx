import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Input, Label } from "@/components/ui/Premium";
import { ProfileCard } from "@/components/shared/ProfileCard";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getToken, changePassword } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound, Loader2, BookOpen, Save, ShieldCheck, AlertCircle, Clock,
  RefreshCw, CheckCircle2, PlusCircle, Upload, FileText, X, Eye,
} from "lucide-react";
import { Link } from "wouter";
import { ALL_SUBJECTS, LEVEL_TREE, getLevelLabel } from "@/lib/educationConfig";
import { useTranslation } from "react-i18next";

// ── helpers ──────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(url: string, opts?: RequestInit) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  return res;
}

async function uploadFile(file: File): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const reqRes = await fetch(`${API_URL}/storage/uploads/request-url`, {
    method: "POST", headers,
    body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size }),
  });
  const reqData = await reqRes.json();

  if (reqData.local) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const up = await fetch(`${API_URL}/storage/uploads/direct`, {
      method: "POST", headers,
      body: JSON.stringify({ objectPath: reqData.objectPath, content: base64, contentType: file.type }),
    });
    const upData = await up.json();
    return upData.objectPath ?? reqData.objectPath;
  } else if (reqData.uploadUrl) {
    await fetch(reqData.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    return reqData.objectPath;
  }
  throw new Error("Upload failed");
}

// ── ChangePasswordCard ────────────────────────────────────────────────────────

function ChangePasswordCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast({ title: t("common.error"), description: t("prof.settings.passwordMismatch"), variant: "destructive" }); return; }
    if (next.length < 8) { toast({ title: t("common.error"), description: t("prof.settings.passwordMin"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast({ title: t("prof.settings.passwordUpdated") });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <KeyRound className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-lg">{t("prof.settings.changePassword")}</h3>
      </div>
      <form onSubmit={handle} className="space-y-4 max-w-sm">
        <div><Label>{t("prof.settings.currentPassword")}</Label><Input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" /></div>
        <div><Label>{t("prof.settings.newPassword")}</Label><Input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder={t("prof.settings.minCharsPlaceholder")} /></div>
        <div><Label>{t("prof.settings.confirm")}</Label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t("prof.settings.repeatPassword")} /></div>
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("prof.settings.updating")}</> : t("prof.settings.changePasswordBtn")}
        </Button>
      </form>
    </Card>
  );
}

// ── ProfessionalCard ──────────────────────────────────────────────────────────

function ProfessionalCard() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const prof = (user as any)?.professorProfile;
  const [bio, setBio] = useState(prof?.bio ?? "");
  const [qualifications, setQualifications] = useState(prof?.qualifications ?? "");
  const [saving, setSaving] = useState(false);

  if (!prof) return null;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/users/${(user as any).id}`, {
        method: "PUT",
        body: JSON.stringify({ bio, qualifications }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).error ?? t("common.error")); }
      await refreshUser();
      toast({ title: t("prof.settings.professionalProfileUpdated") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{t("prof.settings.professionalProfile")}</h3>
          <p className="text-xs text-muted-foreground">{t("prof.settings.professionalProfileDesc")}</p>
        </div>
      </div>

      {/* Current approved subjects + levels */}
      {(prof.subjects?.length > 0 || prof.gradeLevels?.length > 0) && (
        <div className="mb-5 p-4 bg-muted/50 rounded-xl space-y-3">
          {prof.subjects?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t("prof.settings.approvedSubjects")}</p>
              <div className="flex flex-wrap gap-1.5">
                {prof.subjects.map((s: string) => (
                  <span key={s} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
          {prof.gradeLevels?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t("prof.settings.approvedLevels")}</p>
              <div className="flex flex-wrap gap-1.5">
                {prof.gradeLevels.map((g: string) => (
                  <span key={g} className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{getLevelLabel(g)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handle} className="space-y-5">
        <div>
          <Label>{t("prof.settings.biography")}</Label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            placeholder={t("prof.settings.biographyPlaceholder")}
            className="flex w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary resize-none"
          />
        </div>
        <div>
          <Label>{t("prof.settings.qualifications")}</Label>
          <Input value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder={t("prof.settings.qualificationsPlaceholder")} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("prof.settings.saving")}</> : <><Save className="w-4 h-4 mr-2" />{t("common.save")}</>}
        </Button>
      </form>
    </Card>
  );
}

// ── VerificationStatusCard ────────────────────────────────────────────────────

function VerificationStatusCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const prof = (user as any)?.professorProfile;
  const status: string = prof?.status ?? "pending";

  const cfg = {
    pending: { icon: <Clock className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 border-amber-200", label: t("prof.settings.verif.pendingLabel"), desc: t("prof.settings.verif.pendingDesc"), cta: t("prof.settings.verif.pendingCta") },
    kyc_submitted: { icon: <ShieldCheck className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50 border-blue-200", label: t("prof.settings.verif.submittedLabel"), desc: t("prof.settings.verif.submittedDesc"), cta: t("prof.settings.verif.submittedCta") },
    approved: { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, bg: "bg-green-50 border-green-200", label: t("prof.settings.verif.approvedLabel"), desc: t("prof.settings.verif.approvedDesc"), cta: null as string | null },
    rejected: { icon: <AlertCircle className="w-5 h-5 text-red-500" />, bg: "bg-red-50 border-red-200", label: t("prof.settings.verif.rejectedLabel"), desc: t("prof.settings.verif.rejectedDesc"), cta: t("prof.settings.verif.rejectedCta") },
    needs_revision: { icon: <RefreshCw className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 border-amber-200", label: t("prof.settings.verif.revisionLabel"), desc: t("prof.settings.verif.revisionDesc"), cta: t("prof.settings.verif.revisionCta") },
  };
  const c = cfg[status as keyof typeof cfg] ?? cfg.pending;

  return (
    <Card className={`p-6 border-2 ${c.bg}`}>
      <div className="flex items-center gap-3 mb-1">{c.icon}<h3 className="font-bold">{t("prof.settings.verif.title")}</h3></div>
      <p className="text-sm text-muted-foreground mb-1 ml-8">{c.label}</p>
      <p className="text-sm text-muted-foreground ml-8">{c.desc}</p>
      {c.cta && (
        <div className="mt-4 ml-8">
          <Link href="/professor/kyc"><Button variant="outline" size="sm">{c.cta}</Button></Link>
        </div>
      )}
    </Card>
  );
}

// ── SubjectRequestCard ────────────────────────────────────────────────────────

function SubjectRequestCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const prof = (user as any)?.professorProfile;
  const profId: number | undefined = prof?.id;

  const approvedSubjects: string[] = prof?.subjects ?? [];
  const approvedLevels: string[] = prof?.gradeLevels ?? [];

  // New selections (exclude already approved)
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [newLevels, setNewLevels] = useState<string[]>([]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch existing requests
  const { data: requests = [], refetch } = useQuery<any[]>({
    queryKey: ["subject-requests", profId],
    queryFn: async () => {
      if (!profId) return [];
      const res = await apiFetch(`${API_URL}/professors/${profId}/subject-requests`);
      return res.ok ? res.json() : [];
    },
    enabled: !!profId,
  });

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubjects.length === 0) { toast({ title: t("common.error"), description: t("prof.settings.subjectReq.errorSelectSubject"), variant: "destructive" }); return; }
    if (!docFile) { toast({ title: t("common.error"), description: t("prof.settings.subjectReq.errorDocRequired"), variant: "destructive" }); return; }

    setUploading(true);
    let docUrl: string;
    try {
      docUrl = await uploadFile(docFile);
    } catch {
      toast({ title: t("common.error"), description: t("prof.settings.subjectReq.errorUploadFailed"), variant: "destructive" });
      setUploading(false);
      return;
    }
    setUploading(false);
    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/professors/${profId}/subject-requests`, {
        method: "POST",
        body: JSON.stringify({ subjects: newSubjects, gradeLevels: newLevels, documentUrl: docUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("common.error"));
      toast({ title: t("prof.settings.subjectReq.requestSent"), description: t("prof.settings.subjectReq.requestSentDesc") });
      setNewSubjects([]); setNewLevels([]); setDocFile(null); setShowForm(false);
      refetch();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (!prof || prof.status !== "approved") return null;

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;
  const availableSubjects = ALL_SUBJECTS.filter(s => !approvedSubjects.includes(s));
  const hasPending = requests.some((r: any) => r.status === "pending");

  return (
    <Card className="p-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <PlusCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{t("prof.settings.subjectReq.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("prof.settings.subjectReq.subtitle")}</p>
          </div>
        </div>
        {!showForm && !hasPending && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <PlusCircle className="w-4 h-4" /> {t("prof.settings.subjectReq.newRequest")}
          </Button>
        )}
      </div>

      {/* Past requests */}
      {requests.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("prof.settings.subjectReq.pastRequests")}</p>
          {requests.map((r: any) => (
            <div key={r.id} className={`p-3 rounded-xl border text-sm flex items-start gap-3 ${
              r.status === "approved" ? "bg-green-50 border-green-200" :
              r.status === "rejected" ? "bg-red-50 border-red-200" :
              "bg-amber-50 border-amber-200"
            }`}>
              {r.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> :
               r.status === "rejected" ? <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> :
               <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {r.status === "approved" ? t("prof.settings.subjectReq.statusApproved") : r.status === "rejected" ? t("prof.settings.subjectReq.statusRejected") : t("prof.settings.subjectReq.statusPending")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("prof.settings.subjectReq.subjects")} : {r.subjects.join(", ")}
                  {r.gradeLevels?.length > 0 && ` • ${t("prof.settings.subjectReq.levels")} : ${r.gradeLevels.map(getLevelLabel).join(", ")}`}
                </p>
                {r.adminNotes && (
                  <p className="text-xs mt-1 italic">{t("prof.settings.subjectReq.adminNote")} : {r.adminNotes}</p>
                )}
                {r.documentUrl && (
                  <a href={`${API_URL}/storage${r.documentUrl}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                    <Eye className="w-3 h-3" /> {t("prof.settings.subjectReq.viewDocument")}
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground shrink-0">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
            </div>
          ))}
        </div>
      )}

      {hasPending && !showForm && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Clock className="w-4 h-4 inline mr-1.5" />
          {t("prof.settings.subjectReq.pendingWarning")}
        </div>
      )}

      {/* Form */}
      {showForm && !hasPending && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New subjects */}
          <div>
            <Label>{t("prof.settings.subjectReq.subjectsToAdd")} <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              {t("prof.settings.subjectReq.subjectsToAddHint")}
            </p>
            {availableSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("prof.settings.subjectReq.allSubjectsTaught")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSubjects.map(s => (
                  <button key={s} type="button" onClick={() => toggle(newSubjects, setNewSubjects, s)}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      newSubjects.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New levels (optional) */}
          <div>
            <Label>{t("prof.settings.subjectReq.levelsToAdd")}</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">{t("prof.settings.subjectReq.levelsToAddHint")}</p>
            <div className="space-y-2">
              {LEVEL_TREE.map(group => {
                const available = group.levels.filter(({ key }) => !approvedLevels.includes(key));
                if (available.length === 0) return null;
                return (
                  <div key={group.id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {available.map(({ key, label }) => (
                        <button key={key} type="button" onClick={() => toggle(newLevels, setNewLevels, key)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                            newLevels.includes(key) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supporting document */}
          <div>
            <Label>{t("prof.settings.subjectReq.supportingDoc")} <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              {t("prof.settings.subjectReq.supportingDocHint")}
            </p>
            <div
              className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                docFile ? "border-green-400 bg-green-50" : "border-dashed border-border hover:border-primary/40"
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
              <div className="flex items-center gap-3">
                {docFile
                  ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  : <Upload className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{docFile ? docFile.name : t("prof.settings.subjectReq.clickToChooseFile")}</p>
                  {docFile && <p className="text-xs text-green-600 mt-0.5">{(docFile.size / 1024).toFixed(0)} KB</p>}
                </div>
                {docFile && (
                  <button type="button" onClick={e => { e.stopPropagation(); setDocFile(null); }}
                    className="ml-auto p-1 rounded hover:bg-destructive/10 text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting || uploading || newSubjects.length === 0 || !docFile} className="gap-2">
              {(submitting || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {uploading ? t("prof.settings.subjectReq.uploadingDoc") : submitting ? t("prof.settings.subjectReq.submitting") : t("prof.settings.subjectReq.submitRequest")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setNewSubjects([]); setNewLevels([]); setDocFile(null); }}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}

      {!showForm && !hasPending && requests.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("prof.settings.subjectReq.emptyDesc")}
        </p>
      )}

      {!showForm && !hasPending && requests.length > 0 && requests.every((r: any) => r.status !== "pending") && (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-1.5 mt-2">
          <PlusCircle className="w-4 h-4" /> {t("prof.settings.subjectReq.newRequest")}
        </Button>
      )}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProfessorSettings() {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader title={t("prof.settings.title")} description={t("prof.settings.description")} />
        <div className="max-w-3xl space-y-6">
          <VerificationStatusCard />
          <ProfileCard />
          <ProfessionalCard />
          <SubjectRequestCard />
          <ChangePasswordCard />
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
