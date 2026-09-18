import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge } from "@/components/ui/Premium";
import {
  ShieldAlert, ShieldCheck, Eye, X, FileText, CheckCircle2,
  XCircle, Clock, User, MapPin, BookOpen, Download, AlertCircle,
  ChevronDown, ChevronUp, Send, RefreshCw, Plus, BadgeCheck, Copy, Video,
} from "lucide-react";
import { getToken } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getNiveauLabel, getSectionLabel } from "@/lib/educationConfig";

const API_URL = import.meta.env.VITE_API_URL ?? "";

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function DocViewer({ label, objectPath, feedback, onFeedbackChange }: {
  label: string;
  objectPath?: string | null;
  feedback: { status: "approved" | "rejected" | "pending"; reason: string };
  onFeedbackChange: (f: { status: "approved" | "rejected" | "pending"; reason: string }) => void;
}) {
  const url = objectPath ? `${API_URL}/storage${objectPath}` : null;
  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${
      !objectPath ? "border-border bg-muted/30" :
      feedback.status === "approved" ? "border-green-300 bg-green-50" :
      feedback.status === "rejected" ? "border-red-300 bg-red-50" :
      "border-border bg-background"
    }`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            !objectPath ? "bg-muted" :
            feedback.status === "approved" ? "bg-green-100" :
            feedback.status === "rejected" ? "bg-red-100" : "bg-blue-50"
          }`}>
            <FileText className={`w-4 h-4 ${
              !objectPath ? "text-muted-foreground" :
              feedback.status === "approved" ? "text-green-600" :
              feedback.status === "rejected" ? "text-red-600" : "text-blue-600"
            }`} />
          </div>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            {!objectPath && <p className="text-xs text-muted-foreground">Non soumis</p>}
            {objectPath && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{objectPath.split("/").pop()}</p>}
          </div>
        </div>
        {url && (
          <div className="flex gap-1 flex-shrink-0">
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Ouvrir">
              <Eye className="w-4 h-4" />
            </a>
            <a href={url} download className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Télécharger">
              <Download className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      {objectPath && (
        <div className="flex gap-2">
          <button
            onClick={() => onFeedbackChange({ ...feedback, status: "approved" })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
              feedback.status === "approved"
                ? "border-green-500 bg-green-500 text-white"
                : "border-border text-muted-foreground hover:border-green-400 hover:text-green-600"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepter
          </button>
          <button
            onClick={() => onFeedbackChange({ ...feedback, status: "rejected" })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
              feedback.status === "rejected"
                ? "border-red-500 bg-red-500 text-white"
                : "border-border text-muted-foreground hover:border-red-400 hover:text-red-600"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Rejeter
          </button>
        </div>
      )}
      {objectPath && feedback.status === "rejected" && (
        <input
          className="mt-2 w-full text-xs border border-red-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-400 placeholder:text-muted-foreground"
          placeholder="Raison du rejet (ex: document illisible, expiré...)"
          value={feedback.reason}
          onChange={e => onFeedbackChange({ ...feedback, reason: e.target.value })}
        />
      )}
    </div>
  );
}

function ItemReviewer({ name, feedback, onFeedbackChange }: {
  name: string;
  feedback: { status: "approved" | "rejected" | "pending"; reason: string };
  onFeedbackChange: (f: { status: "approved" | "rejected" | "pending"; reason: string }) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 transition-all ${
      feedback.status === "approved" ? "border-green-200 bg-green-50" :
      feedback.status === "rejected" ? "border-red-200 bg-red-50" : "border-border"
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{name}</span>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={() => onFeedbackChange({ ...feedback, status: "approved" })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              feedback.status === "approved"
                ? "border-green-500 bg-green-500 text-white"
                : "border-border text-muted-foreground hover:border-green-400 hover:text-green-600"
            }`}
          >✓ OK</button>
          <button
            onClick={() => onFeedbackChange({ ...feedback, status: "rejected" })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              feedback.status === "rejected"
                ? "border-red-500 bg-red-500 text-white"
                : "border-border text-muted-foreground hover:border-red-400 hover:text-red-600"
            }`}
          >✕ Rejeter</button>
        </div>
      </div>
      {feedback.status === "rejected" && (
        <input
          className="mt-2 w-full text-xs border border-red-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-400 placeholder:text-muted-foreground"
          placeholder="Raison (ex: ce niveau n'est pas justifié par les documents)"
          value={feedback.reason}
          onChange={e => onFeedbackChange({ ...feedback, reason: e.target.value })}
        />
      )}
    </div>
  );
}

const blankFb = () => ({ status: "pending" as "approved" | "rejected" | "pending", reason: "" });

const statusConfig = {
  approved:       { label: "Approuvé",           icon: ShieldCheck, badge: "success" as const,     color: "text-green-600 bg-green-100"  },
  pending:        { label: "En attente",          icon: Clock,       badge: "secondary" as const,   color: "text-orange-600 bg-orange-100"},
  kyc_submitted:  { label: "Documents soumis",   icon: FileText,    badge: "secondary" as const,   color: "text-blue-600 bg-blue-100"    },
  rejected:       { label: "Refusé",             icon: XCircle,     badge: "destructive" as const, color: "text-red-600 bg-red-100"      },
  needs_revision: { label: "Révision requise",   icon: RefreshCw,   badge: "secondary" as const,   color: "text-amber-600 bg-amber-100"  },
};

type FilterKey = "all" | "pending" | "kyc_submitted" | "approved" | "rejected" | "needs_revision";
type TabKey = "professors" | "subject-requests" | "qualifications";

function QualificationRequestsPanel({
  requests,
  isLoading,
  onApprove,
  onReject,
  isPending,
}: {
  requests: any[];
  isLoading: boolean;
  onApprove: (reqId: number) => void;
  onReject: (reqId: number, notes: string) => void;
  isPending: boolean;
}) {
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<Record<number, boolean>>({});

  const pending = requests.filter(r => r.status === "pending");
  const reviewed = requests.filter(r => r.status !== "pending");

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}</div>;
  }

  if (requests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <BadgeCheck className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Aucune demande de qualification pour l'instant.</p>
      </Card>
    );
  }

  const QualCard = ({ req }: { req: any }) => {
    const docUrl = req.documentUrl ? `${API_URL}/storage${req.documentUrl}` : null;
    const isReviewed = req.status !== "pending";
    const niveauLabel = getNiveauLabel(req.niveauKey);
    const sectionLabel = req.sectionKey ? getSectionLabel(req.niveauKey, req.sectionKey) : null;

    return (
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                req.status === "approved" ? "bg-green-100" :
                req.status === "rejected" ? "bg-red-100" : "bg-amber-100"
              }`}>
                {req.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                 req.status === "rejected" ? <XCircle className="w-5 h-5 text-red-600" /> :
                 <Clock className="w-5 h-5 text-amber-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold">{req.professor?.fullName ?? `Professeur #${req.professorId}`}</h3>
                  <Badge variant={req.status === "approved" ? "success" : req.status === "rejected" ? "destructive" : "secondary"}>
                    {req.status === "approved" ? "Approuvé" : req.status === "rejected" ? "Refusé" : "En attente"}
                  </Badge>
                </div>
                {req.professor?.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{req.professor.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Soumis le {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
            {docUrl && (
              <div className="flex gap-1 flex-shrink-0">
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Voir document">
                  <Eye className="w-4 h-4" />
                </a>
                <a href={docUrl} download className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Télécharger">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Niveau / Section / Subjects */}
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Niveau</p>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
                {niveauLabel}
              </span>
              {sectionLabel && (
                <span className="ml-1 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-medium">
                  {sectionLabel}
                </span>
              )}
            </div>
            {req.subjects?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Matières</p>
                <div className="flex flex-wrap gap-1">
                  {req.subjects.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {req.adminNotes && (
            <div className="bg-muted rounded-xl p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-0.5 font-semibold">Note admin</p>
              <p>{req.adminNotes}</p>
            </div>
          )}

          {!isReviewed && (
            <div className="border-t border-border pt-3">
              {showRejectInput[req.id] ? (
                <div className="space-y-2">
                  <input
                    className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
                    placeholder="Raison du refus (optionnel)"
                    value={rejectNotes[req.id] ?? ""}
                    onChange={e => setRejectNotes(p => ({ ...p, [req.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30"
                      disabled={isPending}
                      onClick={() => { onReject(req.id, rejectNotes[req.id] ?? ""); setShowRejectInput(p => ({ ...p, [req.id]: false })); }}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Confirmer le refus
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(p => ({ ...p, [req.id]: false }))}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={isPending}
                    onClick={() => setShowRejectInput(p => ({ ...p, [req.id]: true }))}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Refuser
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isPending}
                    onClick={() => onApprove(req.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approuver
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-3">
            En attente ({pending.length})
          </h3>
          <div className="space-y-4">
            {pending.map(r => <QualCard key={r.id} req={r} />)}
          </div>
        </div>
      )}
      {reviewed.length > 0 && (
        <div>
          <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-3">
            Traitées ({reviewed.length})
          </h3>
          <div className="space-y-4">
            {reviewed.map(r => <QualCard key={r.id} req={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectRequestsPanel({
  requests,
  isLoading,
  onApprove,
  onReject,
  isPending,
}: {
  requests: any[];
  isLoading: boolean;
  onApprove: (reqId: number) => void;
  onReject: (reqId: number, notes: string) => void;
  isPending: boolean;
}) {
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<Record<number, boolean>>({});

  const pending = requests.filter(r => r.status === "pending");
  const reviewed = requests.filter(r => r.status !== "pending");

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}</div>;
  }

  if (requests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Plus className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Aucune demande de matière pour l'instant.</p>
      </Card>
    );
  }

  const RequestCard = ({ req }: { req: any }) => {
    const docUrl = req.documentUrl ? `${API_URL}/storage${req.documentUrl}` : null;
    const isReviewed = req.status !== "pending";

    return (
      <Card key={req.id} className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                req.status === "approved" ? "bg-green-100" :
                req.status === "rejected" ? "bg-red-100" : "bg-amber-100"
              }`}>
                {req.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                 req.status === "rejected" ? <XCircle className="w-5 h-5 text-red-600" /> :
                 <Clock className="w-5 h-5 text-amber-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold">{req.professor?.fullName ?? `Professeur #${req.professorId}`}</h3>
                  <Badge variant={req.status === "approved" ? "success" : req.status === "rejected" ? "destructive" : "secondary"}>
                    {req.status === "approved" ? "Approuvé" : req.status === "rejected" ? "Refusé" : "En attente"}
                  </Badge>
                </div>
                {req.professor?.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{req.professor.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Soumis le {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
            {docUrl && (
              <div className="flex gap-1 flex-shrink-0">
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Voir document">
                  <Eye className="w-4 h-4" />
                </a>
                <a href={docUrl} download className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Télécharger">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Subjects + levels */}
          <div className="flex flex-wrap gap-3">
            {req.subjects?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Matières demandées</p>
                <div className="flex flex-wrap gap-1">
                  {req.subjects.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {req.gradeLevels?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Niveaux demandés</p>
                <div className="flex flex-wrap gap-1">
                  {req.gradeLevels.map((g: string) => (
                    <span key={g} className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">{g}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {req.adminNotes && (
            <div className="bg-muted rounded-xl p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-0.5 font-semibold">Note admin</p>
              <p>{req.adminNotes}</p>
            </div>
          )}

          {!isReviewed && (
            <div className="border-t border-border pt-3">
              {showRejectInput[req.id] ? (
                <div className="space-y-2">
                  <input
                    className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
                    placeholder="Raison du refus (optionnel)"
                    value={rejectNotes[req.id] ?? ""}
                    onChange={e => setRejectNotes(p => ({ ...p, [req.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30"
                      disabled={isPending}
                      onClick={() => { onReject(req.id, rejectNotes[req.id] ?? ""); setShowRejectInput(p => ({ ...p, [req.id]: false })); }}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Confirmer le refus
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(p => ({ ...p, [req.id]: false }))}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={isPending}
                    onClick={() => setShowRejectInput(p => ({ ...p, [req.id]: true }))}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Refuser
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isPending}
                    onClick={() => onApprove(req.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approuver
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-3">
            En attente ({pending.length})
          </h3>
          <div className="space-y-4">
            {pending.map(r => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>
      )}
      {reviewed.length > 0 && (
        <div>
          <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-3">
            Traitées ({reviewed.length})
          </h3>
          <div className="space-y-4">
            {reviewed.map(r => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminProfessors() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("professors");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedProf, setSelectedProf] = useState<any>(null);

  // Per-document feedback state
  const [idDocFb,   setIdDocFb]   = useState(blankFb());
  const [certFb,    setCertFb]    = useState(blankFb());
  const [extraFb,   setExtraFb]   = useState(blankFb());

  // Per-subject / per-grade feedback
  const [subjectFbs,    setSubjectFbs]    = useState<Record<string, { status: "approved" | "rejected" | "pending"; reason: string }>>({});
  const [gradeFbs,      setGradeFbs]      = useState<Record<string, { status: "approved" | "rejected" | "pending"; reason: string }>>({});

  const [showSubjects, setShowSubjects] = useState(true);
  const [showGrades,   setShowGrades]   = useState(true);

  // KYC review state
  const [kycTab, setKycTab] = useState<"identity" | "documents" | "video">("identity");
  const [approvedSubjects, setApprovedSubjects] = useState<Array<{niveauKey: string; sectionKey: string | null; subject: string}>>([]);
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const REJECTION_REASONS = [
    "Documents d'identité illisibles ou invalides",
    "Diplôme universitaire insuffisant",
    "Certificat d'enseignement insuffisant",
    "Vidéo de présentation insuffisante",
    "Matières déclarées non justifiées",
    "Informations incorrectes ou frauduleuses",
  ];

  const toggleRejectionReason = (reason: string) => {
    setRejectionReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const professorsData = { professors: [] };
  const isLoading = false;
  const professors: any[] = [];

  const openModal = (prof: any) => {
    setSelectedProf(prof);
    // Pre-fill from existing reviewFeedback if available
    const fb = prof.reviewFeedback;
    setIdDocFb(fb?.documents?.idDocument ? { status: fb.documents.idDocument.status, reason: fb.documents.idDocument.reason ?? "" } : blankFb());
    setCertFb(fb?.documents?.teachingCert ? { status: fb.documents.teachingCert.status, reason: fb.documents.teachingCert.reason ?? "" } : blankFb());
    setExtraFb(fb?.documents?.additionalDoc ? { status: fb.documents.additionalDoc.status, reason: fb.documents.additionalDoc.reason ?? "" } : blankFb());

    const subs: Record<string, any> = {};
    (prof.subjects ?? []).forEach((s: string) => {
      const existing = fb?.subjects?.find((x: any) => x.name === s);
      subs[s] = existing ? { status: existing.status, reason: existing.reason ?? "" } : blankFb();
    });
    setSubjectFbs(subs);

    const grades: Record<string, any> = {};
    (prof.gradeLevels ?? []).forEach((g: string) => {
      const existing = fb?.gradeLevels?.find((x: any) => x.name === g);
      grades[g] = existing ? { status: existing.status, reason: existing.reason ?? "" } : blankFb();
    });
    setGradeFbs(grades);
    setShowSubjects(true);
    setShowGrades(true);

    // KYC: pre-fill approved subjects from declared subjects
    if (prof.kycDeclaredSubjects && Array.isArray(prof.kycDeclaredSubjects)) {
      const allApproved: Array<{niveauKey: string; sectionKey: string | null; subject: string}> = [];
      for (const entry of prof.kycDeclaredSubjects) {
        for (const subject of entry.subjects ?? []) {
          allApproved.push({ niveauKey: entry.niveauKey, sectionKey: entry.sectionKey ?? null, subject });
        }
      }
      setApprovedSubjects(allApproved);
    } else {
      setApprovedSubjects([]);
    }
    setKycTab("identity");
    setShowRejectPanel(false);
    setShowInfoPanel(false);
    setRejectionReasons([]);
    setOtherReason("");
    setInfoMessage("");
  };

  const closeModal = () => setSelectedProf(null);

  const apiFetch = async (url: string, opts: RequestInit = {}) => {
    const token = getToken();
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error ?? `Erreur ${res.status}`);
    return data;
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: string }) => {
      const docFeedback: any = {};
      if (selectedProf?.idDocumentUrl)      docFeedback.idDocument   = { status: idDocFb.status === "pending" ? "approved" : idDocFb.status, reason: idDocFb.reason };
      if (selectedProf?.teachingCertUrl)    docFeedback.teachingCert = { status: certFb.status  === "pending" ? "approved" : certFb.status,  reason: certFb.reason  };
      if (selectedProf?.additionalDocUrl)   docFeedback.additionalDoc = { status: extraFb.status === "pending" ? "approved" : extraFb.status, reason: extraFb.reason };

      const subjectFeedback = Object.entries(subjectFbs).map(([name, fb]) => ({
        name, status: fb.status === "pending" ? "approved" : fb.status, reason: fb.reason,
      }));
      const gradeFeedback = Object.entries(gradeFbs).map(([name, fb]) => ({
        name, status: fb.status === "pending" ? "approved" : fb.status, reason: fb.reason,
      }));

      return apiFetch(`${API_URL}/professors/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ docFeedback, subjectFeedback, gradeFeedback, decision }),
      });
    },
    onSuccess: (data, { decision }) => {
      qc.invalidateQueries({ queryKey: ["professors"] });
      setSelectedProf((p: any) => p ? { ...p, status: data.status, reviewFeedback: data.reviewFeedback } : null);
      const labels: Record<string, string> = {
        approved: "Professeur approuvé ✓",
        needs_revision: "Révision demandée",
        rejected: "Professeur refusé",
      };
      toast({ title: labels[decision] ?? "Décision enregistrée" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${API_URL}/professors/${id}/approve`, { method: "POST" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["professors"] });
      if (selectedProf?.id === id) setSelectedProf((p: any) => p ? { ...p, status: "approved" } : null);
      toast({ title: "Professeur approuvé" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err?.message, variant: "destructive" }),
  });

  // Subject requests — Railway not available, disabled until migrated
  const { data: subjectRequests = [], isLoading: srLoading } = useQuery<any[]>({
    queryKey: ["professors-subject-requests"],
    queryFn: () => apiFetch(`${API_URL}/professors/subject-requests/all`),
    enabled: false,
  });

  // Qualification requests — Railway not available, disabled until migrated
  const { data: qualRequests = [], isLoading: qualLoading } = useQuery<any[]>({
    queryKey: ["qualifications-requests"],
    queryFn: () => apiFetch(`${API_URL}/qualifications/requests/all`),
    enabled: false,
  });

  const approveQualMutation = useMutation({
    mutationFn: (reqId: number) => apiFetch(`${API_URL}/qualifications/requests/${reqId}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qualifications-requests"] });
      toast({ title: "Qualification approuvée — matières ajoutées au profil" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const rejectQualMutation = useMutation({
    mutationFn: ({ reqId, notes }: { reqId: number; notes: string }) =>
      apiFetch(`${API_URL}/qualifications/requests/${reqId}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qualifications-requests"] });
      toast({ title: "Demande de qualification refusée" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const approveSubjectReqMutation = useMutation({
    mutationFn: (reqId: number) => apiFetch(`${API_URL}/professors/subject-requests/${reqId}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professors-subject-requests"] });
      toast({ title: "Demande approuvée — matières ajoutées au profil" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const rejectSubjectReqMutation = useMutation({
    mutationFn: ({ reqId, notes }: { reqId: number; notes: string }) =>
      apiFetch(`${API_URL}/professors/subject-requests/${reqId}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professors-subject-requests"] });
      toast({ title: "Demande refusée" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const kycReviewMutation = useMutation({
    mutationFn: ({ id, decision, payload }: { id: number; decision: string; payload: any }) =>
      apiFetch(`${API_URL}/professors/${id}/review-kyc`, { method: "POST", body: JSON.stringify({ decision, ...payload }) }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["professors"] });
      if (vars.decision === "approved") {
        toast({ title: "KYC approuvé — professeur vérifié" });
        closeModal();
      } else if (vars.decision === "rejected") {
        toast({ title: "KYC rejeté" });
        closeModal();
      } else {
        toast({ title: "Demande d'informations enregistrée" });
        setShowInfoPanel(false);
      }
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const filtered = filter === "all" ? professors : professors.filter((p: any) => p.status === filter);
  const counts: Record<string, number> = {
    all:            professors.length,
    pending:        professors.filter((p: any) => p.status === "pending").length,
    kyc_submitted:  professors.filter((p: any) => p.status === "kyc_submitted").length,
    approved:       professors.filter((p: any) => p.status === "approved").length,
    rejected:       professors.filter((p: any) => p.status === "rejected").length,
    needs_revision: professors.filter((p: any) => p.status === "needs_revision").length,
  };

  const anyRejected = () => {
    const docRej = [idDocFb, certFb, extraFb].some(f => f.status === "rejected");
    const subRej  = Object.values(subjectFbs).some(f => f.status === "rejected");
    const gradeRej = Object.values(gradeFbs).some(f => f.status === "rejected");
    return docRej || subRej || gradeRej;
  };

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title="Professeurs & Vérification"
          description="Examinez les dossiers soumis et gérez les candidatures des professeurs."
        />

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: "professors",       label: "Professeurs",              count: professors.filter((p: any) => p.kycStatus === "pending").length },
            { key: "subject-requests", label: "Demandes de matières",      count: subjectRequests.filter((r: any) => r.status === "pending").length },
            { key: "qualifications",   label: "Demandes de qualifications", count: qualRequests.filter((r: any) => r.status === "pending").length },
          ] as { key: TabKey; label: string; count: number | null }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all flex items-center gap-2 ${
                tab === t.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === t.key ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── SUBJECT REQUESTS TAB ── */}
        {tab === "subject-requests" && (
          <SubjectRequestsPanel
            requests={subjectRequests}
            isLoading={srLoading}
            onApprove={reqId => approveSubjectReqMutation.mutate(reqId)}
            onReject={(reqId, notes) => rejectSubjectReqMutation.mutate({ reqId, notes })}
            isPending={approveSubjectReqMutation.isPending || rejectSubjectReqMutation.isPending}
          />
        )}

        {/* ── QUALIFICATION REQUESTS TAB ── */}
        {tab === "qualifications" && (
          <QualificationRequestsPanel
            requests={qualRequests}
            isLoading={qualLoading}
            onApprove={reqId => approveQualMutation.mutate(reqId)}
            onReject={(reqId, notes) => rejectQualMutation.mutate({ reqId, notes })}
            isPending={approveQualMutation.isPending || rejectQualMutation.isPending}
          />
        )}

        {tab === "professors" && (<>
        {/* Filter stat cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
          {([
            { key: "all",            label: "Total",           color: "bg-slate-100 text-slate-700"   },
            { key: "pending",        label: "En attente",      color: "bg-orange-100 text-orange-700" },
            { key: "kyc_submitted",  label: "Docs soumis",     color: "bg-blue-100 text-blue-700"     },
            { key: "needs_revision", label: "Révision",        color: "bg-amber-100 text-amber-700"   },
            { key: "approved",       label: "Approuvés",       color: "bg-green-100 text-green-700"   },
            { key: "rejected",       label: "Refusés",         color: "bg-red-100 text-red-700"       },
          ] as { key: FilterKey; label: string; color: string }[]).map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={`p-3 rounded-2xl border-2 text-left transition-all ${filter === s.key ? "border-primary shadow-md" : "border-transparent"} ${s.color}`}>
              <p className="text-2xl font-bold">{counts[s.key] ?? 0}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucun professeur dans cette catégorie.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((prof: any) => {
              const status = prof.status as keyof typeof statusConfig;
              const cfg = statusConfig[status] ?? statusConfig.pending;
              return (
                <Card key={prof.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <cfg.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg">{prof.user?.fullName ?? prof.fullName ?? `Professeur #${prof.id}`}</h3>
                          <Badge variant={cfg.badge}>{cfg.label}</Badge>
                          {prof.kycStatus === "pending" && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">KYC en attente</Badge>}
                          {prof.idDocumentUrl && <Badge variant="outline" className="text-xs">Docs</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {prof.user?.city    && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{prof.user.city}</span>}
                          {prof.subjects?.length > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{prof.subjects.join(", ")}</span>}
                          {prof.user?.email   && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{prof.user.email}</span>}
                          {prof.user?.merchantId && <span className="text-xs font-mono text-muted-foreground/70">{prof.user.merchantId}</span>}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openModal(prof)}>
                      <Eye className="w-4 h-4 mr-1.5" /> Examiner
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        </>)}

        {/* ── DETAIL / REVIEW MODAL ── */}
        <Modal open={!!selectedProf} onClose={closeModal}>
          {selectedProf && (() => {
            const status = selectedProf.status as keyof typeof statusConfig;
            const cfg = statusConfig[status] ?? statusConfig.pending;
            const name = selectedProf.user?.fullName ?? selectedProf.fullName ?? `Professeur #${selectedProf.id}`;
            const canReview = status === "pending" || status === "kyc_submitted" || status === "needs_revision";
            const hasDocs = selectedProf.idDocumentUrl || selectedProf.teachingCertUrl;
            const hasKycData = selectedProf.kycStatus === "pending" || selectedProf.cinFrontUrl;

            // KYC Review UI
            if (hasKycData) {
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
                    <div>
                      <h3 className="text-xl font-bold">{name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedProf.user?.merchantId && (
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                            {selectedProf.user.merchantId}
                            <button onClick={() => { navigator.clipboard.writeText(selectedProf.user.merchantId); toast({ title: "Copié" }); }}
                              className="hover:text-primary"><Copy className="w-3 h-3" /></button>
                          </span>
                        )}
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">KYC soumis</Badge>
                      </div>
                    </div>
                    <button onClick={closeModal} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
                  </div>

                  {/* KYC Tabs */}
                  <div className="flex border-b border-border">
                    {([
                      { key: "identity", label: "Identité" },
                      { key: "documents", label: "Documents & Matières" },
                      { key: "video", label: "Vidéo" },
                    ] as const).map(t => (
                      <button key={t.key} onClick={() => setKycTab(t.key)}
                        className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${kycTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 space-y-4">
                    {/* TAB: Identity */}
                    {kycTab === "identity" && (
                      <div className="space-y-4">
                        {selectedProf.user?.merchantId && (
                          <div className="p-3 bg-muted rounded-xl">
                            <p className="text-xs text-muted-foreground mb-1">Merchant ID</p>
                            <p className="font-bold font-mono text-sm flex items-center gap-2">
                              {selectedProf.user.merchantId}
                              <button onClick={() => { navigator.clipboard.writeText(selectedProf.user.merchantId); toast({ title: "Copié" }); }}
                                className="p-1 rounded hover:bg-muted-foreground/10"><Copy className="w-3.5 h-3.5" /></button>
                            </p>
                          </div>
                        )}
                        {/* CIN photos */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "CIN recto", path: selectedProf.cinFrontUrl },
                            { label: "CIN verso", path: selectedProf.cinBackUrl },
                          ].map(({ label, path }) => (
                            <div key={label} className={`rounded-xl border-2 p-3 ${path ? "border-border" : "border-dashed border-border bg-muted/30"}`}>
                              <p className="text-xs font-semibold mb-2">{label}</p>
                              {path ? (
                                <div className="flex gap-1">
                                  <a href={`${API_URL}/storage${path}`} target="_blank" rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80">
                                    <Eye className="w-4 h-4" /> Voir
                                  </a>
                                  <a href={`${API_URL}/storage${path}`} download
                                    className="p-2 rounded-lg bg-muted hover:bg-muted/80">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">Non soumis</p>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Personal info */}
                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          {[
                            ["Nom légal", selectedProf.legalName],
                            ["Date de naissance", selectedProf.dateOfBirth],
                            ["Téléphone", selectedProf.user?.phone],
                            ["Email", selectedProf.user?.email],
                            ["Ville", selectedProf.user?.city],
                          ].filter(([, v]) => v).map(([k, v]) => (
                            <div key={String(k)} className="bg-muted rounded-xl p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">{k}</p>
                              <p className="font-semibold text-sm">{v}</p>
                            </div>
                          ))}
                        </div>
                        {/* Fallback: old id document */}
                        {!selectedProf.cinFrontUrl && selectedProf.idDocumentUrl && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                            <p className="text-xs font-semibold text-amber-700 mb-2">Document d'identité (ancien format)</p>
                            <a href={`${API_URL}/storage${selectedProf.idDocumentUrl}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 text-amber-700 hover:underline">
                              <Eye className="w-4 h-4" /> Voir le document
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Documents & Subjects */}
                    {kycTab === "documents" && (
                      <div className="space-y-4">
                        {/* Documents */}
                        <div className="space-y-3">
                          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Documents justificatifs</p>
                          {[
                            { label: "Diplôme universitaire", path: selectedProf.universityDiplomaUrl },
                            { label: "Certificat d'enseignement", path: selectedProf.teachingCertUrl },
                          ].map(({ label, path }) => (
                            <div key={label} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${path ? "border-border bg-background" : "border-dashed border-border bg-muted/30"}`}>
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{label}</p>
                                  {path ? <p className="text-xs text-muted-foreground">{path.split("/").pop()}</p> : <p className="text-xs text-muted-foreground">Non soumis</p>}
                                </div>
                              </div>
                              {path && (
                                <div className="flex gap-1">
                                  <a href={`${API_URL}/storage${path}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Eye className="w-4 h-4" /></a>
                                  <a href={`${API_URL}/storage${path}`} download className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Download className="w-4 h-4" /></a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Declared subjects with approval checkboxes */}
                        {selectedProf.kycDeclaredSubjects && selectedProf.kycDeclaredSubjects.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Matières déclarées</p>
                              <span className="text-xs text-green-600 font-medium">{approvedSubjects.length} approuvée{approvedSubjects.length !== 1 ? "s" : ""}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Décochez les matières que vous n'approuvez pas.</p>
                            {selectedProf.kycDeclaredSubjects.map((entry: any) => {
                              const niveauLabel = getNiveauLabel(entry.niveauKey);
                              const sectionLabel = entry.sectionKey ? getSectionLabel(entry.niveauKey, entry.sectionKey) : null;
                              return (
                                <div key={`${entry.niveauKey}-${entry.sectionKey ?? ""}`} className="rounded-xl border border-border overflow-hidden">
                                  <div className="p-3 bg-muted/30 border-b border-border">
                                    <p className="text-sm font-semibold">{niveauLabel}{sectionLabel ? ` — ${sectionLabel}` : ""}</p>
                                  </div>
                                  <div className="p-3 space-y-1">
                                    {entry.subjects?.map((subject: string) => {
                                      const isApproved = approvedSubjects.some(s => s.niveauKey === entry.niveauKey && s.sectionKey === (entry.sectionKey ?? null) && s.subject === subject);
                                      return (
                                        <label key={subject} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-muted/30 rounded px-2">
                                          <input type="checkbox" checked={isApproved}
                                            onChange={e => {
                                              if (e.target.checked) {
                                                setApprovedSubjects(p => [...p, { niveauKey: entry.niveauKey, sectionKey: entry.sectionKey ?? null, subject }]);
                                              } else {
                                                setApprovedSubjects(p => p.filter(s => !(s.niveauKey === entry.niveauKey && s.sectionKey === (entry.sectionKey ?? null) && s.subject === subject)));
                                              }
                                            }}
                                            className="w-4 h-4 accent-primary"
                                          />
                                          <span className="text-sm">{subject}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Video */}
                    {kycTab === "video" && (
                      <div className="space-y-4">
                        {selectedProf.pitchVideoUrl ? (
                          <>
                            <video
                              src={`${API_URL}/storage${selectedProf.pitchVideoUrl}`}
                              controls
                              className="w-full rounded-xl border border-border"
                              style={{ maxHeight: "360px" }}
                            />
                            <a href={`${API_URL}/storage${selectedProf.pitchVideoUrl}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline">
                              <Eye className="w-4 h-4" /> Ouvrir dans un nouvel onglet
                            </a>
                          </>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                            <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>Aucune vidéo soumise</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Decision section — always visible */}
                  {selectedProf.kycStatus === "pending" && (
                    <div className="border-t border-border p-6 space-y-4 sticky bottom-0 bg-background">
                      {!showRejectPanel && !showInfoPanel && (
                        <div className="flex gap-3">
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={kycReviewMutation.isPending}
                            onClick={() => kycReviewMutation.mutate({ id: selectedProf.id, decision: "approved", payload: { approvedSubjects } })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {kycReviewMutation.isPending ? "..." : "Approuver"}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => { setShowRejectPanel(true); setShowInfoPanel(false); }}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Rejeter
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => { setShowInfoPanel(true); setShowRejectPanel(false); }}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" /> Infos
                          </Button>
                        </div>
                      )}

                      {/* Rejection panel */}
                      {showRejectPanel && (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold">Raisons du rejet :</p>
                          <div className="space-y-2">
                            {REJECTION_REASONS.map(reason => (
                              <label key={reason} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={rejectionReasons.includes(reason)}
                                  onChange={() => toggleRejectionReason(reason)}
                                  className="w-4 h-4 accent-destructive" />
                                {reason}
                              </label>
                            ))}
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={!!otherReason}
                                onChange={e => { if (!e.target.checked) setOtherReason(""); }}
                                className="w-4 h-4 accent-destructive" />
                              <input
                                type="text"
                                value={otherReason}
                                onChange={e => setOtherReason(e.target.value)}
                                placeholder="Autre : saisissez la raison..."
                                className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowRejectPanel(false)}
                            >Annuler</Button>
                            <Button
                              size="sm"
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={kycReviewMutation.isPending}
                              onClick={() => {
                                const reasons = [...rejectionReasons, ...(otherReason ? [otherReason] : [])];
                                kycReviewMutation.mutate({ id: selectedProf.id, decision: "rejected", payload: { rejectionReasons: reasons } });
                              }}
                            >
                              {kycReviewMutation.isPending ? "Envoi..." : "Confirmer le rejet"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Info request panel */}
                      {showInfoPanel && (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold">Message au professeur :</p>
                          <textarea
                            value={infoMessage}
                            onChange={e => setInfoMessage(e.target.value)}
                            placeholder="Décrivez les informations ou documents supplémentaires requis..."
                            className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary min-h-[80px] resize-none"
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowInfoPanel(false)}>Annuler</Button>
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                              disabled={kycReviewMutation.isPending || !infoMessage.trim()}
                              onClick={() => kycReviewMutation.mutate({ id: selectedProf.id, decision: "request_info", payload: { message: infoMessage } })}
                            >
                              {kycReviewMutation.isPending ? "Envoi..." : "Envoyer la demande"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            }

            return (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
                  <div>
                    <h3 className="text-xl font-bold">{name}</h3>
                    <p className="text-sm text-muted-foreground">Dossier #{selectedProf.id} · <span className={`font-semibold ${cfg.color.split(" ")[0]}`}>{cfg.label}</span></p>
                  </div>
                  <button onClick={closeModal} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Info grid */}
                  <div>
                    <h4 className="font-bold mb-3 text-xs uppercase text-muted-foreground tracking-wider">Informations professeur</h4>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      {[
                        ["Email",          selectedProf.user?.email],
                        ["Ville",          selectedProf.user?.city ?? selectedProf.city],
                        ["Expérience",     selectedProf.yearsOfExperience ? `${selectedProf.yearsOfExperience} ans` : null],
                        ["Établissement",  selectedProf.currentSchool],
                        ["Qualifications", selectedProf.qualifications],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={String(k)} className="bg-muted rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">{k}</p>
                          <p className="font-semibold text-sm">{v}</p>
                        </div>
                      ))}
                    </div>
                    {selectedProf.bio && (
                      <div className="mt-2 bg-muted rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Biographie</p>
                        <p className="text-sm leading-relaxed">{selectedProf.bio}</p>
                      </div>
                    )}
                  </div>

                  {/* ── DOCUMENTS ── */}
                  <div>
                    <h4 className="font-bold mb-3 text-xs uppercase text-muted-foreground tracking-wider">
                      Documents {canReview && <span className="text-primary normal-case font-normal">(Acceptez ou rejetez chaque document)</span>}
                    </h4>
                    {!hasDocs ? (
                      <div className="bg-muted rounded-xl p-6 text-center text-muted-foreground text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Aucun document soumis.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {canReview ? (
                          <>
                            <DocViewer label="Pièce d'identité nationale" objectPath={selectedProf.idDocumentUrl} feedback={idDocFb} onFeedbackChange={setIdDocFb} />
                            <DocViewer label="Certificat d'enseignement" objectPath={selectedProf.teachingCertUrl} feedback={certFb} onFeedbackChange={setCertFb} />
                            {selectedProf.additionalDocUrl && (
                              <DocViewer label="Document complémentaire" objectPath={selectedProf.additionalDocUrl} feedback={extraFb} onFeedbackChange={setExtraFb} />
                            )}
                          </>
                        ) : (
                          <>
                            {[
                              { label: "Pièce d'identité nationale", path: selectedProf.idDocumentUrl, fb: selectedProf.reviewFeedback?.documents?.idDocument },
                              { label: "Certificat d'enseignement", path: selectedProf.teachingCertUrl, fb: selectedProf.reviewFeedback?.documents?.teachingCert },
                              { label: "Document complémentaire", path: selectedProf.additionalDocUrl, fb: selectedProf.reviewFeedback?.documents?.additionalDoc },
                            ].filter(d => d.path).map(d => (
                              <div key={d.label} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${d.fb?.status === "approved" ? "border-green-200 bg-green-50" : d.fb?.status === "rejected" ? "border-red-200 bg-red-50" : "border-border"}`}>
                                <div className="flex items-center gap-3">
                                  {d.fb?.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : d.fb?.status === "rejected" ? <XCircle className="w-5 h-5 text-red-500" /> : <FileText className="w-5 h-5 text-muted-foreground" />}
                                  <div>
                                    <p className="text-sm font-medium">{d.label}</p>
                                    {d.fb?.reason && <p className="text-xs text-red-600">{d.fb.reason}</p>}
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <a href={`${API_URL}/storage${d.path}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Eye className="w-4 h-4" /></a>
                                  <a href={`${API_URL}/storage${d.path}`} download className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Download className="w-4 h-4" /></a>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── SUBJECTS ── */}
                  {selectedProf.subjects?.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowSubjects(s => !s)}
                        className="flex items-center justify-between w-full font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2"
                      >
                        <span>Matières déclarées {canReview && <span className="text-primary normal-case font-normal">(validez ou rejetez)</span>}</span>
                        {showSubjects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showSubjects && (
                        <div className="space-y-2">
                          {selectedProf.subjects.map((s: string) => (
                            canReview ? (
                              <ItemReviewer key={s} name={s} feedback={subjectFbs[s] ?? blankFb()} onFeedbackChange={f => setSubjectFbs(p => ({ ...p, [s]: f }))} />
                            ) : (
                              <div key={s} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                                selectedProf.reviewFeedback?.subjects?.find((x: any) => x.name === s)?.status === "rejected" ? "border-red-200 bg-red-50 text-red-700" :
                                selectedProf.reviewFeedback?.subjects?.find((x: any) => x.name === s)?.status === "approved" ? "border-green-200 bg-green-50 text-green-700" : "border-border"
                              }`}>
                                {selectedProf.reviewFeedback?.subjects?.find((x: any) => x.name === s)?.status === "approved" ? <CheckCircle2 className="w-4 h-4" /> :
                                 selectedProf.reviewFeedback?.subjects?.find((x: any) => x.name === s)?.status === "rejected" ? <XCircle className="w-4 h-4" /> : null}
                                <span>{s}</span>
                                {selectedProf.reviewFeedback?.subjects?.find((x: any) => x.name === s)?.reason && (
                                  <span className="text-xs ml-auto">— {selectedProf.reviewFeedback.subjects.find((x: any) => x.name === s).reason}</span>
                                )}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── GRADE LEVELS ── */}
                  {selectedProf.gradeLevels?.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowGrades(s => !s)}
                        className="flex items-center justify-between w-full font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2"
                      >
                        <span>Niveaux déclarés {canReview && <span className="text-primary normal-case font-normal">(validez ou rejetez)</span>}</span>
                        {showGrades ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showGrades && (
                        <div className="space-y-2">
                          {selectedProf.gradeLevels.map((g: string) => (
                            canReview ? (
                              <ItemReviewer key={g} name={g} feedback={gradeFbs[g] ?? blankFb()} onFeedbackChange={f => setGradeFbs(p => ({ ...p, [g]: f }))} />
                            ) : (
                              <div key={g} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                                selectedProf.reviewFeedback?.gradeLevels?.find((x: any) => x.name === g)?.status === "rejected" ? "border-red-200 bg-red-50 text-red-700" :
                                selectedProf.reviewFeedback?.gradeLevels?.find((x: any) => x.name === g)?.status === "approved" ? "border-green-200 bg-green-50 text-green-700" : "border-border"
                              }`}>
                                {selectedProf.reviewFeedback?.gradeLevels?.find((x: any) => x.name === g)?.status === "approved" ? <CheckCircle2 className="w-4 h-4" /> :
                                 selectedProf.reviewFeedback?.gradeLevels?.find((x: any) => x.name === g)?.status === "rejected" ? <XCircle className="w-4 h-4" /> : null}
                                <span>{g}</span>
                                {selectedProf.reviewFeedback?.gradeLevels?.find((x: any) => x.name === g)?.reason && (
                                  <span className="text-xs ml-auto">— {selectedProf.reviewFeedback.gradeLevels.find((x: any) => x.name === g).reason}</span>
                                )}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── ACTION BUTTONS ── */}
                  {canReview && (
                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        {anyRejected()
                          ? "Des éléments ont été rejetés — le professeur devra effectuer des corrections."
                          : "Tout est marqué comme accepté — vous pouvez approuver directement."}
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={reviewMutation.isPending}
                          onClick={() => reviewMutation.mutate({ id: selectedProf.id, decision: "rejected" })}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Refus total
                        </Button>
                        {anyRejected() ? (
                          <Button
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ id: selectedProf.id, decision: "needs_revision" })}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {reviewMutation.isPending ? "Envoi..." : "Demander révision"}
                          </Button>
                        ) : (
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={reviewMutation.isPending || approveMutation.isPending}
                            onClick={() => reviewMutation.mutate({ id: selectedProf.id, decision: "approved" })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {reviewMutation.isPending ? "..." : "Tout approuver"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {!canReview && status === "approved" && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
                      <ShieldCheck className="w-5 h-5" />
                      <p className="font-semibold">Ce professeur est approuvé et actif sur la plateforme.</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </Modal>
      </FadeIn>
    </DashboardLayout>
  );
}
