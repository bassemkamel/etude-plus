import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Badge, Button, Input, Label } from "@/components/ui/Premium";
import {
  Users, Search, ShieldOff, ShieldCheck, UserX, X, UserPlus, Eye,
  Star, CreditCard, ClipboardList, KeyRound, Loader2, Trash2,
  ChevronDown, CheckCircle2, XCircle, Clock, FileText, Download, MapPin, BookOpen, User, AlertCircle, UserCog,
} from "lucide-react";
import { getToken } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ── Types & Constants ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
  professor: "Professeur",
  student: "Élève",
};
const ROLE_VARIANT: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  super_admin: "destructive",
  admin: "default",
  professor: "success",
  student: "secondary",
};
const KYC_CONFIG = {
  approved:      { label: "Vérifié",      badge: "success" as const,     icon: ShieldCheck, color: "text-green-600" },
  pending:       { label: "En attente",   badge: "secondary" as const,   icon: Clock,       color: "text-orange-600" },
  kyc_submitted: { label: "Docs soumis",  badge: "secondary" as const,   icon: FileText,    color: "text-blue-600" },
  rejected:      { label: "Refusé",       badge: "destructive" as const, icon: XCircle,     color: "text-red-600" },
};

// ── API Helper ────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "";
const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

async function adminFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  return data;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function useUserAction(action: "suspend" | "unsuspend") {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (userId: number) =>
      adminFetch(`${SUPABASE_FN}/admin-users?id=${userId}&action=${action}`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: action === "suspend" ? "Compte suspendu" : "Compte réactivé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

function useChangeRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      adminFetch(`${SUPABASE_FN}/admin-users?id=${userId}&action=change-role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Rôle modifié", description: "Prend effet immédiatement (prochaine requête API)." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

function useDeleteUser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (userId: number) =>
      adminFetch(`${SUPABASE_FN}/admin-users?id=${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Compte supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

function useRejectProfessor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      adminFetch(`${SUPABASE_FN}/professors/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professors"] });
      toast({ title: "Professeur refusé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

function useApproveProfessor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) =>
      adminFetch(`${SUPABASE_FN}/professors/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professors"] });
      toast({ title: "Approuvé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ── KYC Document Modal ────────────────────────────────────────────────────────

function DocLink({ label, objectPath }: { label: string; objectPath?: string | null }) {
  if (!objectPath) return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="text-xs text-muted-foreground">Non soumis</p></div>
    </div>
  );
  const url = `${SUPABASE_FN}/storage${objectPath}`;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
      <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-800">{label}</p>
        <p className="text-xs text-green-600 truncate">{objectPath.split("/").pop()}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-green-100 text-green-700" title="Ouvrir"><Eye className="w-4 h-4" /></a>
        <a href={url} download className="p-1.5 rounded-lg hover:bg-green-100 text-green-700" title="Télécharger"><Download className="w-4 h-4" /></a>
      </div>
    </div>
  );
}

function KYCModal({ prof, onClose }: { prof: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approveMutation = useApproveProfessor();
  const rejectMutation = useRejectProfessor();

  const status = prof.status as keyof typeof KYC_CONFIG;
  const cfg = KYC_CONFIG[status] ?? KYC_CONFIG.pending;
  const canAct = status === "pending" || status === "kyc_submitted";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-lg">{prof.user?.fullName ?? `Prof #${prof.id}`}</h3>
            <p className="text-xs text-muted-foreground">Dossier KYC · Professeur #{prof.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className={`p-3 rounded-xl flex items-center gap-3 text-sm font-semibold ${cfg.color} bg-current/10`}
            style={{ background: status === "approved" ? "#f0fdf4" : status === "rejected" ? "#fef2f2" : status === "kyc_submitted" ? "#eff6ff" : "#fff7ed" }}>
            <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
            <span className={cfg.color}>Statut : {cfg.label}</span>
          </div>

          {prof.documentNotes && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div><p className="font-semibold mb-1">Motif de refus</p><p>{prof.documentNotes}</p></div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Email", prof.user?.email], ["Téléphone", prof.user?.phone],
              ["Ville", prof.user?.city], ["Matières", prof.subjects?.join(", ")],
              ["Niveaux", prof.gradeLevels?.join(", ")],
              ["Expérience", prof.yearsOfExperience ? `${prof.yearsOfExperience} ans` : null],
              ["Qualifications", prof.qualifications],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={String(k)} className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{k}</p>
                <p className="font-semibold text-sm">{v}</p>
              </div>
            ))}
          </div>

          {prof.bio && (
            <div><p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Biographie</p>
              <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4 leading-relaxed">{prof.bio}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">Documents soumis</p>
            <div className="space-y-2">
              <DocLink label="Pièce d'identité nationale" objectPath={prof.idDocumentUrl} />
              <DocLink label="Certificat d'enseignement" objectPath={prof.teachingCertUrl} />
              {prof.additionalDocUrl && <DocLink label="Document complémentaire" objectPath={prof.additionalDocUrl} />}
            </div>
          </div>

          {canAct && showRejectForm && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-red-800">Motif du refus (optionnel)</p>
              <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)}
                placeholder="Documents illisibles, certificat expiré..."
                className="w-full rounded-lg border border-red-200 bg-white p-3 text-sm resize-none min-h-[80px] focus:outline-none"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)} className="flex-1">Annuler</Button>
                <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={rejectMutation.isPending}
                  onClick={() => { rejectMutation.mutate({ id: prof.id, notes: rejectNotes }); onClose(); }}>
                  Confirmer le refus
                </Button>
              </div>
            </div>
          )}
        </div>

        {canAct && !showRejectForm && (
          <div className="flex gap-3 px-6 py-4 border-t border-border">
            <Button variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowRejectForm(true)}>
              <X className="w-4 h-4 mr-2" /> Refuser
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate(prof.id, { onSuccess: onClose })}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── User Detail Modal ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-border/40 last:border-0 gap-4">
      <dt className="text-muted-foreground text-sm shrink-0">{label}</dt>
      <dd className="font-semibold text-sm text-right">{value ?? "—"}</dd>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function UserDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [section, setSection] = useState<"info" | "security" | "classes" | "grades" | "reviews" | "transactions">("info");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user-details", userId],
    queryFn: () => adminFetch(`${SUPABASE_FN}/admin-users?id=${userId}`),
    retry: false,
  });

  const resetPassword = async () => {
    if (newPassword.length < 8) { toast({ title: "Erreur", description: "Minimum 8 caractères.", variant: "destructive" }); return; }
    setResetting(true);
    try {
      await adminFetch(`${SUPABASE_FN}/admin-users?id=${userId}&action=reset-password`, { method: "PATCH", body: JSON.stringify({ password: newPassword }) });
      toast({ title: "Mot de passe réinitialisé", description: `Nouveau mot de passe : ${newPassword}` });
      setNewPassword("");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setResetting(false); }
  };

  const u = data?.user;
  const grades: any[] = data?.grades ?? [];
  const reviews: any[] = data?.reviews ?? [];
  const transactions: any[] = data?.transactions ?? [];
  const enrollments: any[] = data?.enrollments ?? [];
  const profProfile = data?.professorProfile;
  const profClasses: any[] = data?.professorClasses ?? [];
  const studentProfile = data?.studentProfile;

  const isProfessor = u?.role === "professor";
  const isStudent = u?.role === "student";

  const sections = [
    { id: "info",         label: "Profil",                    icon: User },
    { id: "security",     label: "Sécurité",                  icon: KeyRound },
    { id: "classes",      label: isProfessor ? `Cours (${profClasses.length})` : `Inscrits (${enrollments.length})`, icon: BookOpen },
    { id: "grades",       label: `Notes (${grades.length})`,  icon: ClipboardList },
    { id: "reviews",      label: `Avis (${reviews.length})`,  icon: Star },
    { id: "transactions", label: `TX (${transactions.length})`, icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/15 text-primary font-bold text-lg flex items-center justify-center">
              {u?.fullName?.charAt(0) ?? "?"}
            </div>
            <div>
              <h2 className="font-bold text-base">{u?.fullName ?? <span className="text-muted-foreground">Chargement…</span>}</h2>
              <p className="text-xs text-muted-foreground">{u?.email} · <span className="font-medium">{ROLE_LABELS[u?.role] ?? u?.role}</span> · ID #{userId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto shrink-0 bg-muted/20">
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${section === s.id ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <s.icon className="w-3.5 h-3.5" />{s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement du profil complet…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">Impossible de charger les données</p>
              <p className="text-sm text-muted-foreground mt-1">{(error as any).message}</p>
            </div>
          ) : (
            <>
              {/* ─── PROFIL ─── */}
              {section === "info" && u && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Informations générales</p>
                    <dl>
                      <InfoRow label="ID" value={`#${u.id}`} />
                      <InfoRow label="Nom complet" value={u.fullName} />
                      <InfoRow label="Email" value={u.email} />
                      <InfoRow label="Rôle" value={<Badge variant={ROLE_VARIANT[u.role] ?? "secondary"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>} />
                      <InfoRow label="Ville" value={u.city ?? "—"} />
                      <InfoRow label="Statut" value={u.isSuspended ? <span className="text-red-600 font-bold">⛔ Suspendu</span> : <span className="text-green-600 font-bold">✅ Actif</span>} />
                      <InfoRow label="Inscrit le" value={u.createdAt ? format(new Date(u.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : "—"} />
                    </dl>
                  </div>

                  {/* Student profile */}
                  {isStudent && studentProfile && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Profil étudiant</p>
                      <dl>
                        <InfoRow label="Niveau scolaire" value={studentProfile.gradeLevel ?? "—"} />
                        <InfoRow label="École" value={studentProfile.schoolName ?? "—"} />
                        <InfoRow label="Matières préférées" value={(studentProfile.preferredSubjects ?? []).join(", ") || "—"} />
                      </dl>
                    </div>
                  )}

                  {/* Professor profile */}
                  {isProfessor && profProfile && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Profil professeur</p>
                      <dl>
                        <InfoRow label="Statut KYC" value={profProfile.status} />
                        <InfoRow label="Vérifié" value={profProfile.isVerified ? "✅ Oui" : "❌ Non"} />
                        <InfoRow label="Matières" value={(profProfile.subjects ?? []).join(", ") || "—"} />
                        <InfoRow label="Niveaux" value={(profProfile.gradeLevels ?? []).join(", ") || "—"} />
                        <InfoRow label="Expérience" value={profProfile.yearsOfExperience ? `${profProfile.yearsOfExperience} ans` : "—"} />
                        <InfoRow label="Qualifications" value={profProfile.qualifications ?? "—"} />
                        <InfoRow label="Note moyenne" value={profProfile.rating ? `${Number(profProfile.rating).toFixed(1)} / 5 ⭐` : "—"} />
                        <InfoRow label="Avis reçus" value={profProfile.totalReviews ?? 0} />
                        <InfoRow label="Total élèves" value={profProfile.totalStudents ?? 0} />
                      </dl>
                      {profProfile.bio && (
                        <div className="mt-3 p-4 bg-muted rounded-xl text-sm text-muted-foreground leading-relaxed">
                          {profProfile.bio}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── SÉCURITÉ ─── */}
              {section === "security" && u && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <p className="font-bold mb-1">⚠️ Mots de passe chiffrés (bcrypt)</p>
                    <p>Les mots de passe sont hashés en one-way avec bcrypt (12 rounds). Il est <strong>impossible techniquement</strong> de lire le mot de passe original. Vous pouvez uniquement le réinitialiser ci-dessous.</p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Hash bcrypt stocké en base</p>
                    <div className="relative bg-muted rounded-xl p-3">
                      <p className={`font-mono text-xs break-all ${showPwd ? "text-foreground" : "blur-sm select-none"}`}>{u.passwordHash}</p>
                      <button onClick={() => setShowPwd(v => !v)}
                        className="absolute right-2 top-2 text-xs text-primary underline font-semibold">
                        {showPwd ? "Masquer" : "Révéler"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">Ce hash ne peut pas être inversé — c'est une fonction unidirectionnelle.</p>
                  </div>

                  <div className="border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-primary" />
                      <p className="font-bold text-sm">Définir un nouveau mot de passe</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Le nouveau mot de passe sera immédiatement actif. Communiquez-le à l'utilisateur.</p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Nouveau mot de passe (min. 8 caractères)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="flex-1 font-mono"
                      />
                      <Button onClick={resetPassword} disabled={resetting || newPassword.length < 8}>
                        {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── COURS / INSCRIPTIONS ─── */}
              {section === "classes" && (
                isProfessor ? (
                  profClasses.length === 0
                    ? <EmptyState icon={BookOpen} text="Ce professeur n'a créé aucun cours." />
                    : (
                      <div className="space-y-3">
                        {profClasses.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-4 border border-border rounded-xl">
                            <div>
                              <p className="font-semibold text-sm">{c.title}</p>
                              <p className="text-xs text-muted-foreground">{c.subject} · {c.enrolledCount ?? 0} élèves inscrits</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{c.price} TND</p>
                              <div className="flex gap-1 justify-end mt-1">
                                {c.isPublished ? <Badge variant="success" className="text-[10px]">Publié</Badge> : <Badge variant="secondary" className="text-[10px]">Brouillon</Badge>}
                                {c.isArchived && <Badge variant="destructive" className="text-[10px]">Archivé</Badge>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                ) : (
                  enrollments.length === 0
                    ? <EmptyState icon={BookOpen} text="Cet étudiant n'est inscrit à aucun cours." />
                    : (
                      <div className="space-y-3">
                        {enrollments.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between p-4 border border-border rounded-xl">
                            <div>
                              <p className="font-semibold text-sm">{e.class?.title ?? `Cours #${e.classId}`}</p>
                              <p className="text-xs text-muted-foreground">{e.class?.subject ?? ""} · Inscrit le {e.paidAt ? format(new Date(e.paidAt), "dd MMM yyyy", { locale: fr }) : "—"}</p>
                            </div>
                            <Badge variant={e.status === "paid" ? "success" : "secondary"}>{e.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )
                )
              )}

              {/* ─── NOTES ─── */}
              {section === "grades" && (
                grades.length === 0
                  ? <EmptyState icon={ClipboardList} text="Aucune note enregistrée." />
                  : (
                    <div className="space-y-3">
                      {grades.map((g: any) => {
                        const pct = g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0;
                        const good = pct >= 60;
                        return (
                          <div key={g.id} className="flex items-center justify-between p-4 border border-border rounded-xl">
                            <div>
                              <p className="font-semibold text-sm">{g.assessmentTitle}</p>
                              <p className="text-xs text-muted-foreground capitalize">{g.assessmentType} · {g.gradedAt ? format(new Date(g.gradedAt), "dd/MM/yyyy HH:mm") : "—"}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-lg ${good ? "text-green-600" : "text-red-600"}`}>{g.score} / {g.maxScore}</p>
                              <p className="text-xs text-muted-foreground">{pct}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
              )}

              {/* ─── AVIS ─── */}
              {section === "reviews" && (
                reviews.length === 0
                  ? <EmptyState icon={Star} text="Aucun avis reçu." />
                  : (
                    <div className="space-y-3">
                      {reviews.map((r: any) => (
                        <div key={r.id} className="p-4 border border-border rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{r.student?.fullName ?? "Élève anonyme"}</p>
                              <p className="text-xs text-muted-foreground">{r.student?.email}</p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(n => (
                                <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                          </div>
                          {r.comment && <p className="text-sm text-muted-foreground italic bg-muted rounded-lg px-3 py-2">"{r.comment}"</p>}
                          <p className="text-xs text-muted-foreground mt-2">{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr }) : ""}</p>
                        </div>
                      ))}
                    </div>
                  )
              )}

              {/* ─── TRANSACTIONS ─── */}
              {section === "transactions" && (
                transactions.length === 0
                  ? <EmptyState icon={CreditCard} text="Aucune transaction." />
                  : (
                    <div className="space-y-3">
                      {transactions.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between p-4 border border-border rounded-xl">
                          <div>
                            <p className="font-semibold text-sm">{t.class?.title ?? `Cours #${t.classId}`}</p>
                            <p className="text-xs text-muted-foreground">TX #{t.id} · {t.createdAt ? format(new Date(t.createdAt), "dd/MM/yyyy HH:mm") : "—"}</p>
                            {t.paymentMethod && <p className="text-xs text-muted-foreground">{t.paymentMethod}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-base">{t.amount} TND</p>
                            {t.platformFee != null && <p className="text-xs text-emerald-600">Commission : {t.platformFee} TND</p>}
                            <Badge variant={t.status === "completed" ? "success" : t.status === "failed" ? "destructive" : "secondary"} className="mt-1">{t.status}</Badge>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t border-border font-bold text-sm">
                        <span>Total dépensé</span>
                        <span>{transactions.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0).toFixed(2)} TND</span>
                      </div>
                    </div>
                  )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({ user: u, onCancel, onConfirm, loading }: { user: any; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto"><Trash2 className="w-6 h-6 text-red-600" /></div>
        <h3 className="font-bold text-lg text-center">Supprimer ce compte ?</h3>
        <p className="text-sm text-center text-muted-foreground">
          <span className="font-semibold text-foreground">{u.fullName}</span> ({u.email}) sera définitivement supprimé. Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={loading} onClick={onConfirm}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) { toast({ title: "Erreur", description: "Tous les champs requis.", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const data = await adminFetch(`${SUPABASE_FN}/admin-users`, { method: "POST", body: JSON.stringify({ fullName, email, password, role }) });
      toast({ title: "Compte créé", description: data.email });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setFullName(""); setEmail(""); setPassword(""); setRole("student");
      onClose();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-bold">Créer un compte</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div><Label>Nom complet</Label><Input placeholder="Mohamed Ben Ali" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" placeholder="user@etude.tn" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label>Mot de passe</Label><Input type="password" placeholder="Minimum 8 caractères" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <div>
            <Label>Rôle</Label>
            <select className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary" value={role} onChange={e => setRole(e.target.value)}>
              <option value="student">Élève</option>
              <option value="professor">Professeur</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" disabled={creating}>{creating ? "Création..." : "Créer"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabKey = "all" | "student" | "professor" | "admin";

export function AdminUsers() {
  const { user: currentUser, startImpersonation } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const handleImpersonate = async (targetUser: any) => {
    try {
      const data = await adminFetch(`${SUPABASE_FN}/admin-users?id=${targetUser.id}&action=impersonate`, { method: "PATCH" });
      await startImpersonation(data.token, data.user);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [kycProf, setKycProf] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminFetch(`${SUPABASE_FN}/admin-users`),
    staleTime: 60 * 1000,
  });
  const { data: professorsData } = useQuery({
    queryKey: ["professors"],
    queryFn: () => adminFetch(`${SUPABASE_FN}/professors`),
    staleTime: 60 * 1000,
  });
  const suspendMutation = useUserAction("suspend");
  const unsuspendMutation = useUserAction("unsuspend");
  const changeRoleMutation = useChangeRole();
  const deleteMutation = useDeleteUser();

  const allUsers: any[] = usersData?.users ?? [];
  const professors: any[] = professorsData?.professors ?? [];

  // Build professor profile map: userId → professorProfile
  const profByUserId: Record<number, any> = {};
  professors.forEach((p: any) => { if (p.userId) profByUserId[p.userId] = p; });

  const tabFilters: Record<TabKey, (u: any) => boolean> = {
    all: () => true,
    student: (u) => u.role === "student",
    professor: (u) => u.role === "professor",
    admin: (u) => u.role === "admin" || u.role === "super_admin",
  };

  const filtered = allUsers.filter(u => {
    if (!tabFilters[tab](u)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const counts = {
    all: allUsers.length,
    student: allUsers.filter(u => u.role === "student").length,
    professor: allUsers.filter(u => u.role === "professor").length,
    admin: allUsers.filter(u => u.role === "admin" || u.role === "super_admin").length,
  };

  const pendingKYC = professors.filter((p: any) => p.status === "pending" || p.status === "kyc_submitted");

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "all", label: "Tous", badge: counts.all },
    { key: "student", label: "Étudiants", badge: counts.student },
    { key: "professor", label: "Professeurs", badge: counts.professor },
    { key: "admin", label: "Admins", badge: counts.admin },
  ];

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title="Utilisateurs"
          description="Tous les comptes — gestion complète."
          action={
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-muted rounded-xl text-sm font-semibold">{filtered.length} compte{filtered.length !== 1 ? "s" : ""}</span>
              {isSuperAdmin && <Button onClick={() => setShowCreate(true)}><UserPlus className="w-4 h-4 mr-2" /> Créer un compte</Button>}
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
              {t.badge !== undefined && (
                <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{t.badge}</span>
              )}
              {t.key === "professor" && pendingKYC.length > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 font-bold">{pendingKYC.length} KYC</span>
              )}
            </button>
          ))}
        </div>

        {/* Professor KYC pending banner */}
        {tab === "professor" && pendingKYC.length > 0 && (
          <div className="mb-5 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-900 text-sm">{pendingKYC.length} dossier(s) KYC en attente</p>
                <p className="text-xs text-orange-700">Cliquez sur le badge KYC d'un professeur pour examiner son dossier</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher par nom ou email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {usersLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun utilisateur trouvé.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Utilisateur</th>
                  <th className="px-6 py-4 font-semibold">Rôle</th>
                  <th className="px-6 py-4 font-semibold hidden lg:table-cell">Inscrit le</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  {tab === "professor" && <th className="px-6 py-4 font-semibold">KYC</th>}
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u: any) => {
                  const isSelf = u.id === currentUser?.id;
                  const canAct = !isSelf && (isSuperAdmin ? u.role !== "super_admin" : u.role !== "super_admin" && u.role !== "admin");
                  const profProfile = profByUserId[u.id];
                  const kycStatus = profProfile?.status as keyof typeof KYC_CONFIG | undefined;
                  const kycCfg = kycStatus ? KYC_CONFIG[kycStatus] : null;

                  return (
                    <tr key={u.id} className={`hover:bg-muted/40 transition-colors ${u.isSuspended ? "opacity-60" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {u.fullName?.charAt(0) ?? "?"}
                          </div>
                          <div>
                            <p className="font-semibold">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isSuperAdmin && !isSelf ? (
                          <div className="relative group inline-block">
                            <button
                              onClick={() => setChangingRoleId(changingRoleId === u.id ? null : u.id)}
                              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            >
                              <Badge variant={ROLE_VARIANT[u.role] ?? "secondary"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </button>
                            {changingRoleId === u.id && (
                              <div className="absolute left-0 top-8 z-20 bg-background border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                                {["student", "professor", "admin", "super_admin"].map(r => (
                                  <button key={r}
                                    onClick={() => { changeRoleMutation.mutate({ userId: u.id, role: r }); setChangingRoleId(null); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${u.role === r ? "font-bold text-primary" : ""}`}>
                                    {ROLE_LABELS[r]}
                                    {u.role === r && " ✓"}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant={ROLE_VARIANT[u.role] ?? "secondary"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs hidden lg:table-cell">
                        {u.createdAt ? format(new Date(u.createdAt), "dd MMM yyyy", { locale: fr }) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {u.isSuspended
                          ? <Badge variant="destructive"><UserX className="w-3 h-3 mr-1" />Suspendu</Badge>
                          : <Badge variant="success"><ShieldCheck className="w-3 h-3 mr-1" />Actif</Badge>}
                      </td>
                      {tab === "professor" && (
                        <td className="px-6 py-4">
                          {kycCfg ? (
                            <button
                              onClick={() => profProfile && setKycProf(profProfile)}
                              className="hover:opacity-80 transition-opacity"
                            >
                              <Badge variant={kycCfg.badge} className={`gap-1 ${(kycStatus === "pending" || kycStatus === "kyc_submitted") ? "animate-pulse ring-1 ring-orange-300" : ""}`}>
                                <kycCfg.icon className="w-3 h-3" />{kycCfg.label}
                              </Badge>
                            </button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setDetailUserId(u.id)} title="Voir les détails"
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {isSuperAdmin && !isSelf && u.role !== "super_admin" && (
                            <button onClick={() => handleImpersonate(u)} title="Agir en tant que cet utilisateur"
                              className="w-8 h-8 rounded-lg hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-colors">
                              <UserCog className="w-4 h-4" />
                            </button>
                          )}
                          {canAct && (
                            u.isSuspended ? (
                              <button onClick={() => unsuspendMutation.mutate(u.id)} title="Réactiver"
                                disabled={unsuspendMutation.isPending}
                                className="w-8 h-8 rounded-lg hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors disabled:opacity-50">
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => suspendMutation.mutate(u.id)} title="Suspendre"
                                disabled={suspendMutation.isPending}
                                className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors disabled:opacity-50">
                                <ShieldOff className="w-4 h-4" />
                              </button>
                            )
                          )}
                          {isSuperAdmin && canAct && (
                            <button onClick={() => setDeleteTarget(u)} title="Supprimer"
                              className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </FadeIn>

      {/* Modals */}
      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} />
      {detailUserId !== null && <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />}
      {kycProf && <KYCModal prof={kycProf} onClose={() => setKycProf(null)} />}
      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
          onConfirm={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        />
      )}

      {/* Close role dropdown on outside click */}
      {changingRoleId !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setChangingRoleId(null)} />
      )}
    </DashboardLayout>
  );
}
