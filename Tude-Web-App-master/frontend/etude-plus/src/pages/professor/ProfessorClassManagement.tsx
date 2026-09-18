import { useState, useRef } from "react";
import { PracticeQuestionsTab } from "@/components/shared/PracticeQuestionsTab";
import { StartClassButton, LiveBadge } from "@/components/shared/SessionButton";
import { useRoute, Link } from "wouter";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge, Input, Label } from "@/components/ui/Premium";
import {
  Video, FileText, Plus, Users, Settings, Clock, Calendar,
  FileQuestion, ClipboardList, BookOpen, LayoutDashboard,
  Trash2, PlayCircle, Download, Eye, X, Check, Save, AlertCircle,
  Star, MessageSquare, Megaphone, XCircle,
} from "lucide-react";
import {
  useGetClass,
  useListClassSessions,
  useListClassMaterials,
  useListClassQuizzes,
  useListClassTests,
  useListClassAssignments,
  useListClassEnrollments,
  useCreateClassSession,
  useCreateMaterial,
  useCreateQuiz,
  useCreateTest,
  useCreateAssignment,
  getToken,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatTND } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="p-12 text-center">
      <Icon className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {action}
    </Card>
  );
}

function QuizTestBuilder({ mode, form, setForm, blankQ, isPending, onCancel, onSubmit, t }: {
  mode: "quiz" | "test";
  form: any; setForm: any; blankQ: () => any;
  isPending: boolean; onCancel: () => void; onSubmit: (publish: boolean) => void;
  t: (key: string, opts?: any) => string;
}) {
  const Q_TYPES = [
    { value: "multiple_choice", label: t("prof.classManagement.qTypeQCM"), desc: t("prof.classManagement.qTypeQCMDesc") },
    { value: "true_false", label: t("prof.classManagement.qTypeTrueFalse"), desc: t("prof.classManagement.qTypeTrueFalseDesc") },
    { value: "short_answer", label: t("prof.classManagement.qTypeShort"), desc: t("prof.classManagement.qTypeShortDesc") },
    { value: "long_answer", label: t("prof.classManagement.qTypeLong"), desc: t("prof.classManagement.qTypeLongDesc") },
    { value: "numeric", label: t("prof.classManagement.qTypeNumeric"), desc: t("prof.classManagement.qTypeNumericDesc") },
  ] as const;

  const totalPoints = form.questions.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0);

  function setQ(idx: number, patch: any) {
    setForm((f: any) => ({
      ...f,
      questions: f.questions.map((q: any, i: number) => i === idx ? { ...q, ...patch } : q),
    }));
  }
  function addQ() {
    setForm((f: any) => ({ ...f, questions: [...f.questions, blankQ()] }));
  }
  function removeQ(idx: number) {
    setForm((f: any) => ({ ...f, questions: f.questions.filter((_: any, i: number) => i !== idx) }));
  }
  function setOption(qi: number, oi: number, val: string) {
    setForm((f: any) => ({
      ...f,
      questions: f.questions.map((q: any, i: number) =>
        i === qi ? { ...q, options: q.options.map((o: string, j: number) => j === oi ? val : o) } : q
      ),
    }));
  }
  function addOption(qi: number) {
    setForm((f: any) => ({
      ...f,
      questions: f.questions.map((q: any, i: number) =>
        i === qi ? { ...q, options: [...q.options, ""] } : q
      ),
    }));
  }
  function removeOption(qi: number, oi: number) {
    setForm((f: any) => ({
      ...f,
      questions: f.questions.map((q: any, i: number) =>
        i === qi ? { ...q, options: q.options.filter((_: any, j: number) => j !== oi), correct: Math.max(0, q.correct - (oi < q.correct ? 1 : 0)) } : q
      ),
    }));
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>{mode === "quiz" ? t("prof.classManagement.quizTitleLabel") : t("prof.classManagement.testTitleLabel")}</Label>
          <Input placeholder={mode === "quiz" ? t("prof.classManagement.quizTitlePlaceholder") : t("prof.classManagement.testTitlePlaceholder")} value={form.title} onChange={(e: any) => setForm((f: any) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <Label>{t("prof.classManagement.dueDateOptional")}</Label>
          <Input type="date" value={form.dueDate} onChange={(e: any) => setForm((f: any) => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div className="flex items-end">
          <div className="bg-muted rounded-xl px-4 py-2 text-sm font-semibold w-full text-center">
            {form.questions.length} {t("prof.classManagement.questionCount")} • {totalPoints} pts
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">{t("prof.classManagement.questionsSection")}</h4>
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
          {form.questions.map((q: any, qi: number) => (
            <div key={qi} className="border-2 border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                <Input className="flex-1" placeholder={t("prof.classManagement.questionPlaceholder")} value={q.text} onChange={(e: any) => setQ(qi, { text: e.target.value })} />
                {form.questions.length > 1 && (
                  <button onClick={() => removeQ(qi)} className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pl-10">
                {Q_TYPES.map(qtype => (
                  <button key={qtype.value} onClick={() => setQ(qi, { type: qtype.value, options: qtype.value === "true_false" ? [t("prof.classManagement.true"), t("prof.classManagement.false")] : qtype.value === "multiple_choice" ? q.options : [], correct: 0 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${q.type === qtype.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                    {qtype.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("prof.classManagement.points")}:</span>
                  <Input type="number" min="1" className="w-16 text-center text-sm h-8" value={q.points} onChange={(e: any) => setQ(qi, { points: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              {(q.type === "multiple_choice") && (
                <div className="pl-10 space-y-2">
                  {q.options.map((opt: string, oi: number) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button onClick={() => setQ(qi, { correct: oi })}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${q.correct === oi ? "border-green-500 bg-green-500" : "border-border hover:border-green-400"}`}>
                        {q.correct === oi && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <Input placeholder={`${t("prof.classManagement.optionLabel")} ${oi + 1}${q.correct === oi ? ` (${t("prof.classManagement.correct")})` : ""}`} value={opt} onChange={(e: any) => setOption(qi, oi, e.target.value)} className="flex-1 text-sm" />
                      {q.options.length > 2 && (
                        <button onClick={() => removeOption(qi, oi)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <button onClick={() => addOption(qi)} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> {t("prof.classManagement.addOption")}
                    </button>
                  )}
                </div>
              )}

              {q.type === "true_false" && (
                <div className="pl-10 flex gap-3">
                  {[t("prof.classManagement.true"), t("prof.classManagement.false")].map((opt, oi) => (
                    <button key={oi} onClick={() => setQ(qi, { correct: oi })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${q.correct === oi ? (oi === 0 ? "border-green-500 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700") : "border-border hover:border-primary/50"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {(q.type === "short_answer" || q.type === "long_answer" || q.type === "numeric") && (
                <div className="pl-10">
                  <Input placeholder={q.type === "numeric" ? t("prof.classManagement.numericAnswerPlaceholder") : t("prof.classManagement.modelAnswerPlaceholder")} value={q.modelAnswer} onChange={(e: any) => setQ(qi, { modelAnswer: e.target.value })} className="text-sm" />
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={addQ} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
          <Plus className="w-4 h-4" /> {t("prof.classManagement.addQuestion")}
        </button>
      </div>

      <div className="flex gap-3 pt-2 border-t border-border">
        <Button variant="outline" className="flex-1" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button variant="outline" className="flex-1" disabled={isPending} onClick={() => onSubmit(false)}>
          <Save className="w-4 h-4 mr-2" /> {t("prof.classManagement.draft")}
        </Button>
        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={isPending} onClick={() => onSubmit(true)}>
          {isPending ? "..." : <><Check className="w-4 h-4 mr-2" />{t("prof.classManagement.publish")}</>}
        </Button>
      </div>
    </div>
  );
}

export function ProfessorClassManagement() {
  const { t } = useTranslation();
  const [, params] = useRoute("/professor/classes/:id");
  const classId = params?.id ? parseInt(params.id) : 0;
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [annForm, setAnnForm] = useState({ title: "", body: "" });
  const [showAddRecording, setShowAddRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"recorded_lecture" | "recorded_question">("recorded_lecture");
  const [recordingForm, setRecordingForm] = useState({ title: "", description: "" });
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingUploadProgress, setRecordingUploadProgress] = useState<"idle" | "uploading" | "done">("idle");
  const recordingFileRef = useRef<HTMLInputElement>(null);

  // Settings tab controlled state
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsPrice, setSettingsPrice] = useState("");
  const [settingsDurationHours, setSettingsDurationHours] = useState("");
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // File upload ref for materials
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done">("idle");

  const { data: cls, isLoading: loadingClass } = useGetClass(classId, { query: { enabled: !!classId } as any });
  const { data: sessions = [], isLoading: loadingSessions } = useListClassSessions(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: materials = [], isLoading: loadingMaterials } = useListClassMaterials(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: quizzes = [], isLoading: loadingQuizzes } = useListClassQuizzes(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: tests = [], isLoading: loadingTests } = useListClassTests(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: assignments = [], isLoading: loadingAssignments } = useListClassAssignments(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: enrollments = [], isLoading: loadingEnrollments } = useListClassEnrollments(classId, { query: { enabled: !!classId } as any }) as any;

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["class-reviews", classId],
    enabled: !!classId,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/reviews?classId=${classId}`);
      return res.ok ? res.json() : [];
    },
  });

  const createSession = useCreateClassSession();
  const createMaterial = useCreateMaterial();
  const createQuiz = useCreateQuiz();
  const createTest = useCreateTest();
  const createAssignment = useCreateAssignment();

  const saveClassSettings = useMutation({
    mutationFn: async (data: { title: string; description: string; price: number; durationHours: number }) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/classes/${classId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("prof.classManagement.saveError"));
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/classes/${classId}`] });
      toast({ title: t("prof.classManagement.saveSuccess"), description: t("prof.classManagement.saveSuccessDesc") });
    },
    onError: (err: any) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const startSession = async (sessionId: number) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/classes/sessions/${sessionId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d?.error ?? "Erreur lors du démarrage");
    }
    qc.invalidateQueries({ queryKey: [`/api/classes/${classId}/sessions`] });
    toast({ title: "Cours démarré", description: "Le statut est maintenant EN DIRECT." });
  };

  const cancelSession = useMutation({
    mutationFn: async (sessionId: number) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/classes/${classId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error(t("prof.classManagement.cancelError"));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/classes/${classId}/sessions`] });
      toast({ title: t("prof.classManagement.sessionCancelled"), description: t("prof.classManagement.sessionCancelledDesc") });
    },
    onError: () => toast({ title: t("common.error"), description: t("prof.classManagement.cancelError"), variant: "destructive" }),
  });

  const postAnnouncement = useMutation({
    mutationFn: async (data: { title: string; body: string }) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/announcements/class/${classId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(t("prof.classManagement.announceError"));
      return res.json();
    },
    onSuccess: () => {
      setShowAnnouncement(false);
      setAnnForm({ title: "", body: "" });
      toast({ title: t("prof.classManagement.announceSuccess"), description: t("prof.classManagement.announceSuccessDesc") });
    },
    onError: () => toast({ title: t("common.error"), description: t("prof.classManagement.announceError"), variant: "destructive" }),
  });

  const [sessionForm, setSessionForm] = useState({ title: "", description: "", price: "", durationHours: "2", scheduledAt: "" });
  const [matForm, setMatForm] = useState({ title: "", description: "", type: "pdf" });
  const [assignForm, setAssignForm] = useState({ title: "", instructions: "", dueDate: "" });

  type QType = "multiple_choice" | "short_answer" | "long_answer" | "numeric" | "true_false";
  type Question = { type: QType; text: string; points: number; options: string[]; correct: number; modelAnswer: string };
  const blankQ = (): Question => ({ type: "multiple_choice", text: "", points: 2, options: ["", "", "", ""], correct: 0, modelAnswer: "" });
  const [quizForm, setQuizForm] = useState({ title: "", dueDate: "", questions: [blankQ()] as Question[] });
  const [testForm, setTestForm] = useState({ title: "", dueDate: "", questions: [blankQ()] as Question[] });

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key] });

  const tabs = [
    { id: "overview", label: t("prof.classManagement.tabOverview"), icon: LayoutDashboard },
    { id: "live", label: t("prof.classManagement.tabLive"), icon: Video },
    { id: "materials", label: t("prof.classManagement.tabMaterials"), icon: FileText },
    { id: "recordings", label: t("prof.classManagement.tabRecordings"), icon: PlayCircle },
    { id: "quizzes", label: t("prof.classManagement.tabQuizzes"), icon: FileQuestion },
    { id: "tests", label: t("prof.classManagement.tabTests"), icon: ClipboardList },
    { id: "assignments", label: t("prof.classManagement.tabAssignments"), icon: BookOpen },
    { id: "students", label: `${t("prof.classManagement.tabStudents")} (${enrollments.length})`, icon: Users },
    { id: "reviews", label: `${t("prof.classManagement.tabReviews")}${reviews.length > 0 ? ` (${reviews.length})` : ""}`, icon: Star },
    { id: "practice", label: t("prof.classManagement.tabPractice"), icon: BookOpen },
    { id: "settings", label: t("prof.classManagement.tabSettings"), icon: Settings },
  ];

  if (!classId || loadingClass) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-xl" />
          <div className="h-40 bg-muted rounded-2xl" />
          <div className="h-10 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!cls) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("prof.classManagement.notFound")}</h2>
          <Link href="/professor/classes"><Button className="mt-2">{t("prof.classManagement.backToCourses")}</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <FadeIn>
        <Link href="/professor/classes" className="text-sm font-medium text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-1 transition-colors">
          ← {t("prof.classManagement.backToCourses")}
        </Link>

        <PageHeader
          title={cls.title}
          description={`${cls.subject} • ${cls.gradeLevel} • ${cls.city}`}
          action={<Badge variant={cls.isPublished ? "success" : "secondary"} className="text-sm px-4 py-1">{cls.isPublished ? t("prof.classes.published") : t("prof.classes.draft")}</Badge>}
        />

        <div className="flex border-b border-border mb-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {activeTab === "overview" && (
          <FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: t("prof.classManagement.enrolledStudents"), value: enrollments.length, icon: Users, color: "bg-blue-100 text-blue-600" },
                { label: t("prof.classManagement.completedSessions"), value: sessions.filter((s: any) => s.status === "ended").length, icon: Video, color: "bg-green-100 text-green-600" },
                { label: t("prof.classManagement.materials"), value: materials.length, icon: FileText, color: "bg-orange-100 text-orange-600" },
                { label: t("prof.classManagement.pricePerSession"), value: `${cls.price} TND`, icon: Clock, color: "bg-purple-100 text-purple-600" },
              ].map(s => (
                <Card key={s.label} className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">{t("prof.classManagement.courseDetails")}</h3>
                <dl className="space-y-3 text-sm">
                  {[
                    [t("prof.classManagement.detailSubject"), cls.subject],
                    [t("prof.classManagement.detailLevel"), cls.gradeLevel],
                    [t("prof.classManagement.detailCity"), cls.city],
                    [t("prof.classManagement.detailPrice"), `${cls.price} TND / ${t("prof.classManagement.session")}`],
                    [t("prof.classManagement.detailDuration"), `${cls.durationHours}h ${t("prof.classManagement.perSession")}`],
                    [t("prof.classManagement.detailType"), cls.isRecurring ? t("prof.classManagement.recurring") : t("prof.classManagement.oneTime")],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab("settings")}>
                  {t("prof.classManagement.editInfo")}
                </Button>
              </Card>
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">{t("prof.classManagement.description")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{cls.description}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setActiveTab("live")}>
                    <Video className="w-4 h-4 mr-2" /> {t("prof.classManagement.sessions")}
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("students")}>
                    <Users className="w-4 h-4 mr-2" /> {t("prof.classManagement.students")}
                  </Button>
                </div>
              </Card>
            </div>
          </FadeIn>
        )}

        {/* ─── LIVE SESSIONS ─── */}
        {activeTab === "live" && (
          <FadeIn>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{t("prof.classManagement.liveSessions")}</h3>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAnnouncement(true)}>
                  <Megaphone className="w-4 h-4 mr-2" /> {t("prof.classManagement.announceToStudents")}
                </Button>
                <Button onClick={() => setShowCreateSession(true)}>
                  <Plus className="w-4 h-4 mr-2" /> {t("prof.classManagement.scheduleSession")}
                </Button>
              </div>
            </div>
            {loadingSessions ? (
              <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}</div>
            ) : sessions.length === 0 ? (
              <EmptyState icon={Video} title={t("prof.classManagement.noSessions")} description={t("prof.classManagement.noSessionsDesc")}
                action={<Button onClick={() => setShowCreateSession(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.createSession")}</Button>} />
            ) : (
              <div className="space-y-4">
                {sessions.map((s: any) => (
                  <Card key={s.id} className={`p-6 ${s.status === "ended" ? "opacity-60" : "border-primary/20"}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {s.status === "live" ? (
                            <LiveBadge />
                          ) : (
                            <Badge className={s.status === "scheduled" ? "bg-blue-100 text-blue-700" : ""} variant={s.status === "ended" ? "secondary" : undefined}>
                              {s.status === "scheduled" ? t("prof.classManagement.statusScheduled") : t("prof.classManagement.statusEnded")}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">{s.price} TND</span>
                        </div>
                        <h4 className="text-lg font-bold mb-1">{s.title}</h4>
                        {s.description && <p className="text-sm text-muted-foreground mb-2">{s.description}</p>}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{fmtDT(s.scheduledAt)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{s.durationHours}h</span>
                        </div>
                      </div>
                      <div className="flex gap-3 items-center flex-wrap">
                        {(s.status === "scheduled" || s.status === "live") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              disabled={cancelSession.isPending}
                              onClick={() => {
                                if (confirm(t("prof.classManagement.cancelConfirm", { title: s.title }))) {
                                  cancelSession.mutate(s.id);
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> {t("prof.classManagement.cancel")}
                            </Button>
                            <StartClassButton
                              session={s}
                              userName={user?.fullName ?? "Professeur"}
                              onStart={startSession}
                            />
                          </>
                        )}
                        {s.status === "ended" && (
                          <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" />{t("prof.classManagement.summary")}</Button>
                        )}
                        {s.status === "cancelled" && (
                          <Badge className="bg-red-100 text-red-700">{t("prof.classManagement.statusCancelled")}</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </FadeIn>
        )}

        {/* ─── MATERIALS ─── */}
        {activeTab === "materials" && (
          <FadeIn>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{t("prof.classManagement.courseMaterials")}</h3>
              <Button onClick={() => setShowAddMaterial(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.add")}</Button>
            </div>
            {loadingMaterials ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : materials.length === 0 ? (
              <EmptyState icon={FileText} title={t("prof.classManagement.noMaterials")} description={t("prof.classManagement.noMaterialsDesc")}
                action={<Button onClick={() => setShowAddMaterial(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.addMaterial")}</Button>} />
            ) : (
              <Card className="divide-y divide-border overflow-hidden">
                {materials.map((m: any) => (
                  <div key={m.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{m.title}</h4>
                        {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                        {m.createdAt && <p className="text-xs text-muted-foreground">{t("prof.classManagement.addedOn")} {fmt(m.createdAt)}</p>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!m.fileUrl}
                      onClick={() => { if (m.fileUrl) window.open(`${API_URL}/storage${m.fileUrl}`, "_blank"); }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </Card>
            )}
          </FadeIn>
        )}

        {/* ─── RECORDINGS ─── */}
        {activeTab === "recordings" && (
          <FadeIn>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">{t("prof.classManagement.recordings")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t("prof.classManagement.recordingsDesc")}</p>
              </div>
              <Button onClick={() => { setShowAddRecording(true); setRecordingFile(null); setRecordingUploadProgress("idle"); setRecordingForm({ title: "", description: "" }); }}>
                <Plus className="w-4 h-4 mr-2" /> {t("prof.classManagement.addRecording")}
              </Button>
            </div>
            {loadingMaterials ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : materials.filter((m: any) => m.type === "recorded_lecture" || m.type === "recorded_question").length === 0 ? (
              <EmptyState icon={PlayCircle} title={t("prof.classManagement.noRecordings")}
                description={t("prof.classManagement.noRecordingsDesc")}
                action={<Button onClick={() => setShowAddRecording(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.add")}</Button>} />
            ) : (
              <div className="space-y-3">
                {materials.filter((m: any) => m.type === "recorded_lecture" || m.type === "recorded_question").map((m: any) => (
                  <Card key={m.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${m.type === "recorded_lecture" ? "bg-purple-100" : "bg-orange-100"}`}>
                        <PlayCircle className={`w-5 h-5 ${m.type === "recorded_lecture" ? "text-purple-600" : "text-orange-600"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{m.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.type === "recorded_lecture" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                            {m.type === "recorded_lecture" ? t("prof.classManagement.recordedLecture") : t("prof.classManagement.recordedQuestion")}
                          </span>
                        </div>
                        {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                        <p className="text-xs text-muted-foreground">{t("prof.classManagement.addedOn")} {fmt(m.createdAt)}</p>
                      </div>
                    </div>
                    {m.fileUrl && (
                      <Button variant="outline" size="sm" onClick={() => window.open(`${API_URL}/storage${m.fileUrl}`, "_blank")}>
                        <Eye className="w-4 h-4 mr-2" /> {t("prof.classManagement.view")}
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </FadeIn>
        )}

        {/* ─── QUIZZES ─── */}
        {activeTab === "quizzes" && (
          <FadeIn>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{t("prof.classManagement.tabQuizzes")}</h3>
              <Button onClick={() => setShowCreateQuiz(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.createQuiz")}</Button>
            </div>
            {loadingQuizzes ? (
              <div className="space-y-3">{[1].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : quizzes.length === 0 ? (
              <EmptyState icon={FileQuestion} title={t("prof.classManagement.noQuizzes")} description={t("prof.classManagement.noQuizzesDesc")}
                action={<Button onClick={() => setShowCreateQuiz(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.createQuiz")}</Button>} />
            ) : (
              <div className="space-y-4">
                {quizzes.map((q: any) => (
                  <Card key={q.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                        <FileQuestion className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{q.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {q.questions?.length ?? 0} {t("prof.classManagement.questionsLabel")}{q.dueDate ? ` • ${t("prof.classManagement.before")} ${fmt(q.dueDate)}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={q.isPublished ? "success" : "secondary"}>{q.isPublished ? t("prof.classManagement.published") : t("prof.classManagement.draft")}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </FadeIn>
        )}

        {/* ─── TESTS ─── */}
        {activeTab === "tests" && (
          <FadeIn>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{t("prof.classManagement.tabTests")}</h3>
              <Button onClick={() => setShowCreateTest(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.createTest")}</Button>
            </div>
            {loadingTests ? (
              <div className="space-y-3">{[1].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : tests.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t("prof.classManagement.noTests")} description={t("prof.classManagement.noTestsDesc")}
                action={<Button onClick={() => setShowCreateTest(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.createTest")}</Button>} />
            ) : (
              <div className="space-y-4">
                {tests.map((tst: any) => (
                  <Card key={tst.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{tst.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {tst.questions?.length ?? 0} {t("prof.classManagement.questionsLabel")}{tst.dueDate ? ` • ${t("prof.classManagement.before")} ${fmt(tst.dueDate)}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={tst.isPublished ? "success" : "secondary"}>{tst.isPublished ? t("prof.classManagement.published") : t("prof.classManagement.draft")}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </FadeIn>
        )}

        {/* ─── ASSIGNMENTS ─── */}
        {activeTab === "assignments" && (
          <FadeIn>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{t("prof.classManagement.tabAssignments")}</h3>
              <Button onClick={() => setShowCreateAssignment(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.createAssignment")}</Button>
            </div>
            {loadingAssignments ? (
              <div className="space-y-3">{[1].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : assignments.length === 0 ? (
              <EmptyState icon={BookOpen} title={t("prof.classManagement.noAssignments")} description={t("prof.classManagement.noAssignmentsDesc")}
                action={<Button onClick={() => setShowCreateAssignment(true)}><Plus className="w-4 h-4 mr-2" />{t("prof.classManagement.createAssignment")}</Button>} />
            ) : (
              <div className="space-y-4">
                {assignments.map((a: any) => (
                  <Card key={a.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{a.title}</h4>
                        {a.instructions && <p className="text-xs text-muted-foreground line-clamp-1">{a.instructions}</p>}
                        {a.dueDate && <p className="text-xs text-muted-foreground">{t("prof.classManagement.before")} {fmt(a.dueDate)}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </FadeIn>
        )}

        {/* ─── STUDENTS ─── */}
        {activeTab === "students" && (
          <FadeIn>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{t("prof.classManagement.enrolledStudents")}</h3>
              <Badge variant="secondary" className="text-base px-4 py-1">{enrollments.length} {t("prof.classManagement.studentUnit")}{enrollments.length !== 1 ? "s" : ""}</Badge>
            </div>
            {loadingEnrollments ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : enrollments.length === 0 ? (
              <EmptyState icon={Users} title={t("prof.classManagement.noStudents")} description={t("prof.classManagement.noStudentsDesc")} />
            ) : (
              <Card className="overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-semibold">{t("prof.classManagement.colStudent")}</th>
                      <th className="px-6 py-4 font-semibold hidden md:table-cell">{t("prof.classManagement.colEnrollDate")}</th>
                      <th className="px-6 py-4 font-semibold text-right">{t("prof.classManagement.colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrollments.map((e: any) => (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                              {e.student?.fullName?.charAt(0) ?? "?"}
                            </div>
                            <p className="font-semibold">{e.student?.fullName ?? `${t("prof.classManagement.studentUnit")} #${e.studentId}`}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{e.createdAt ? fmt(e.createdAt) : "—"}</td>
                        <td className="px-6 py-4 text-right">
                          <Badge variant={(e.status === "active" || e.status === "paid") ? "success" : "secondary"}>
                            {(e.status === "active" || e.status === "paid") ? t("prof.classManagement.statusActive") : e.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </FadeIn>
        )}

        {/* ─── REVIEWS ─── */}
        {activeTab === "reviews" && (
          <FadeIn>
            <div className="max-w-2xl space-y-6">
              {reviews.length > 0 && (() => {
                const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
                const ratingCounts = [5,4,3,2,1].map(star => ({
                  star,
                  count: reviews.filter((r: any) => Math.round(r.rating) === star).length,
                }));
                return (
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      {t("prof.classManagement.globalRating")}
                    </h3>
                    <div className="flex gap-8 items-center">
                      <div className="text-center shrink-0">
                        <p className="text-6xl font-bold text-primary">{avg.toFixed(1)}</p>
                        <div className="flex gap-0.5 justify-center my-2">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} className={`w-5 h-5 ${n <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{reviews.length} {t("prof.classManagement.reviewsLabel")}</p>
                      </div>
                      <div className="flex-1 space-y-2">
                        {ratingCounts.map(({ star, count }) => (
                          <div key={star} className="flex items-center gap-3 text-sm">
                            <span className="w-10 text-right text-muted-foreground">{star} ★</span>
                            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${reviews.length > 0 ? (count / reviews.length) * 100 : 0}%` }} />
                            </div>
                            <span className="w-5 text-muted-foreground">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {reviews.length === 0 ? (
                <Card className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">{t("prof.classManagement.noReviews")}</h3>
                  <p className="text-muted-foreground">{t("prof.classManagement.noReviewsDesc")}</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <Card key={r.id} className="p-5">
                      <div className="flex gap-4">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                          {r.student?.profilePhoto
                            ? <img src={`${API_URL}/storage${r.student.profilePhoto}`} alt="" className="w-full h-full object-cover" />
                            : r.student?.fullName?.charAt(0) ?? "?"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-bold text-sm">{r.student?.fullName ?? t("prof.classManagement.studentUnit")}</p>
                            {r.createdAt && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-0.5 mb-2">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} className={`w-4 h-4 ${n <= Math.round(r.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{r.rating}/5</span>
                          </div>
                          {r.comment && (
                            <p className="text-sm text-muted-foreground leading-relaxed italic">"{r.comment}"</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {/* ─── PRACTICE QUESTIONS ─── */}
        {activeTab === "practice" && cls && (
          <FadeIn>
            <PracticeQuestionsTab classId={cls.id} readOnly />
          </FadeIn>
        )}

        {/* ─── SETTINGS ─── */}
        {activeTab === "settings" && (() => {
          if (!settingsInitialized && cls) {
            setSettingsTitle(cls.title ?? "");
            setSettingsDescription(cls.description ?? "");
            setSettingsPrice(String(cls.price ?? ""));
            setSettingsDurationHours(String(cls.durationHours ?? ""));
            setSettingsInitialized(true);
          }
          return (
            <FadeIn>
              <div className="max-w-2xl space-y-6">
                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-5 border-b border-border pb-3">{t("prof.classManagement.courseInfo")}</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>{t("prof.classManagement.courseTitle")}</Label>
                      <Input value={settingsTitle} onChange={e => setSettingsTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t("prof.classManagement.descriptionLabel")}</Label>
                      <textarea
                        className="flex min-h-[100px] w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary resize-none"
                        value={settingsDescription}
                        onChange={e => setSettingsDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{t("prof.classManagement.priceTND")}</Label>
                        <Input type="number" value={settingsPrice} onChange={e => setSettingsPrice(e.target.value)} />
                      </div>
                      <div>
                        <Label>{t("prof.classManagement.durationHours")}</Label>
                        <Input type="number" value={settingsDurationHours} onChange={e => setSettingsDurationHours(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </Card>
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    disabled={saveClassSettings.isPending}
                    onClick={() => {
                      saveClassSettings.mutate({
                        title: settingsTitle,
                        description: settingsDescription,
                        price: parseFloat(settingsPrice) || 0,
                        durationHours: parseFloat(settingsDurationHours) || 1,
                      });
                    }}
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {saveClassSettings.isPending ? t("prof.classManagement.saving") : t("prof.classManagement.save")}
                  </Button>
                </div>
              </div>
            </FadeIn>
          );
        })()}

        {/* ─── MODALS ─── */}

        <Modal open={showCreateSession} onClose={() => setShowCreateSession(false)} title={t("prof.classManagement.scheduleSessionTitle")}>
          <div className="space-y-4">
            <div><Label>{t("prof.classManagement.sessionTitle")}</Label><Input placeholder={t("prof.classManagement.sessionTitlePlaceholder")} value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>{t("prof.classManagement.descriptionLabel")}</Label>
              <textarea className="flex min-h-[80px] w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary resize-none" placeholder={t("prof.classManagement.sessionDescPlaceholder")} value={sessionForm.description} onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>{t("prof.classManagement.priceTND")}</Label><Input type="number" placeholder={String(cls.price)} value={sessionForm.price} onChange={e => setSessionForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div><Label>{t("prof.classManagement.durationHours")}</Label><Input type="number" placeholder="2" value={sessionForm.durationHours} onChange={e => setSessionForm(f => ({ ...f, durationHours: e.target.value }))} /></div>
            </div>
            <div><Label>{t("prof.classManagement.dateTime")}</Label><Input type="datetime-local" value={sessionForm.scheduledAt} onChange={e => setSessionForm(f => ({ ...f, scheduledAt: e.target.value }))} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateSession(false)}>{t("common.cancel")}</Button>
              <Button className="flex-1" disabled={createSession.isPending}
                onClick={() => {
                  if (!sessionForm.title || !sessionForm.scheduledAt) return;
                  createSession.mutate({
                    id: classId,
                    data: {
                      title: sessionForm.title,
                      description: sessionForm.description,
                      price: parseFloat(sessionForm.price) || cls.price,
                      durationHours: parseFloat(sessionForm.durationHours) || 2,
                      scheduledAt: new Date(sessionForm.scheduledAt).toISOString(),
                    }
                  }, {
                    onSuccess: () => {
                      invalidate(`/api/classes/${classId}/sessions`);
                      setShowCreateSession(false);
                      setSessionForm({ title: "", description: "", price: "", durationHours: "2", scheduledAt: "" });
                    }
                  });
                }}>
                {createSession.isPending ? "..." : t("prof.classManagement.schedule")}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={showAddMaterial} onClose={() => { setShowAddMaterial(false); setSelectedFile(null); setUploadProgress("idle"); }} title={t("prof.classManagement.addMaterialTitle")}>
          <div className="space-y-4">
            <div><Label>{t("prof.classManagement.titleLabel")}</Label><Input placeholder={t("prof.classManagement.materialTitlePlaceholder")} value={matForm.title} onChange={e => setMatForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>{t("prof.classManagement.descriptionOptional")}</Label><Input placeholder={t("prof.classManagement.briefDescription")} value={matForm.description} onChange={e => setMatForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                {selectedFile ? selectedFile.name : t("prof.classManagement.dropOrBrowse")}
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
                hidden
                ref={fileInputRef}
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {selectedFile ? t("prof.classManagement.changeFile") : t("prof.classManagement.chooseFile")}
              </Button>
              {uploadProgress === "uploading" && (
                <p className="text-xs text-primary mt-2">{t("prof.classManagement.uploading")}</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAddMaterial(false); setSelectedFile(null); setUploadProgress("idle"); }}>{t("common.cancel")}</Button>
              <Button className="flex-1" disabled={createMaterial.isPending || uploadProgress === "uploading"}
                onClick={async () => {
                  if (!matForm.title) return;
                  let fileUrl: string | null = null;

                  if (selectedFile) {
                    try {
                      setUploadProgress("uploading");
                      const token = getToken();
                      const reqRes = await fetch(`${API_URL}/storage/uploads/request-url`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ name: selectedFile.name, contentType: selectedFile.type, size: selectedFile.size }),
                      });
                      const reqData = await reqRes.json();

                      if (reqData.local) {
                        const base64Content = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(selectedFile);
                        });
                        const uploadRes = await fetch(`${API_URL}/storage/uploads/direct`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ objectPath: reqData.objectPath, content: base64Content, contentType: selectedFile.type }),
                        });
                        const uploadData = await uploadRes.json();
                        fileUrl = uploadData.objectPath ?? reqData.objectPath;
                      } else if (reqData.uploadUrl) {
                        await fetch(reqData.uploadUrl, {
                          method: "PUT",
                          headers: { "Content-Type": selectedFile.type },
                          body: selectedFile,
                        });
                        fileUrl = reqData.objectPath;
                      }
                      setUploadProgress("done");
                    } catch (err) {
                      setUploadProgress("idle");
                      toast({ title: t("common.error"), description: t("prof.classManagement.uploadFileFailed"), variant: "destructive" });
                      return;
                    }
                  }

                  createMaterial.mutate({
                    id: classId,
                    data: { title: matForm.title, description: matForm.description || null, fileUrl } as any,
                  }, {
                    onSuccess: () => {
                      invalidate(`/api/classes/${classId}/materials`);
                      setShowAddMaterial(false);
                      setMatForm({ title: "", description: "", type: "pdf" });
                      setSelectedFile(null);
                      setUploadProgress("idle");
                    },
                    onError: (err: any) => {
                      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                    },
                  });
                }}>
                {createMaterial.isPending || uploadProgress === "uploading" ? "..." : t("prof.classManagement.addBtn")}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ─── QUIZ BUILDER MODAL ─── */}
        <Modal open={showCreateQuiz} onClose={() => setShowCreateQuiz(false)} title={t("prof.classManagement.createQuizTitle")}>
          <QuizTestBuilder
            mode="quiz"
            form={quizForm}
            setForm={setQuizForm as any}
            blankQ={blankQ}
            isPending={createQuiz.isPending}
            onCancel={() => setShowCreateQuiz(false)}
            t={t}
            onSubmit={(publish) => {
              if (!quizForm.title) return;
              const questions = quizForm.questions.filter(q => q.text.trim()).map(q =>
                q.type === "true_false"
                  ? { type: "multiple_choice" as const, text: q.text, options: ["Vrai", "Faux"], correctAnswer: String(q.correct), points: q.points }
                  : { type: q.type as any, text: q.text, options: q.options.filter(Boolean), correctAnswer: q.type === "multiple_choice" ? String(q.correct) : (q.modelAnswer || null), points: q.points }
              );
              createQuiz.mutate(
                { id: classId, data: { title: quizForm.title, dueDate: quizForm.dueDate || null, questions, isPublished: publish } as any },
                { onSuccess: () => { invalidate(`/api/classes/${classId}/quizzes`); setShowCreateQuiz(false); setQuizForm({ title: "", dueDate: "", questions: [blankQ()] }); } }
              );
            }}
          />
        </Modal>

        {/* ─── TEST BUILDER MODAL ─── */}
        <Modal open={showCreateTest} onClose={() => setShowCreateTest(false)} title={t("prof.classManagement.createTestTitle")}>
          <QuizTestBuilder
            mode="test"
            form={testForm}
            setForm={setTestForm as any}
            blankQ={blankQ}
            isPending={createTest.isPending}
            onCancel={() => setShowCreateTest(false)}
            t={t}
            onSubmit={(publish) => {
              if (!testForm.title) return;
              const questions = testForm.questions.filter(q => q.text.trim()).map(q =>
                q.type === "true_false"
                  ? { type: "multiple_choice" as const, text: q.text, options: ["Vrai", "Faux"], correctAnswer: String(q.correct), points: q.points }
                  : { type: q.type as any, text: q.text, options: q.options.filter(Boolean), correctAnswer: q.type === "multiple_choice" ? String(q.correct) : (q.modelAnswer || null), points: q.points }
              );
              createTest.mutate(
                { id: classId, data: { title: testForm.title, dueDate: testForm.dueDate || null, questions, isPublished: publish } as any },
                { onSuccess: () => { invalidate(`/api/classes/${classId}/tests`); setShowCreateTest(false); setTestForm({ title: "", dueDate: "", questions: [blankQ()] }); } }
              );
            }}
          />
        </Modal>

        <Modal open={showCreateAssignment} onClose={() => setShowCreateAssignment(false)} title={t("prof.classManagement.createAssignmentTitle")}>
          <div className="space-y-4">
            <div><Label>{t("prof.classManagement.assignmentTitle")}</Label><Input placeholder={t("prof.classManagement.assignmentTitlePlaceholder")} value={assignForm.title} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>{t("prof.classManagement.instructions")}</Label>
              <textarea className="flex min-h-[100px] w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary resize-none" placeholder={t("prof.classManagement.instructionsPlaceholder")} value={assignForm.instructions} onChange={e => setAssignForm(f => ({ ...f, instructions: e.target.value }))} />
            </div>
            <div><Label>{t("prof.classManagement.dueDateOptional")}</Label><Input type="date" value={assignForm.dueDate} onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateAssignment(false)}>{t("common.cancel")}</Button>
              <Button className="flex-1" disabled={createAssignment.isPending}
                onClick={() => {
                  if (!assignForm.title) return;
                  createAssignment.mutate({
                    id: classId,
                    data: { title: assignForm.title, instructions: assignForm.instructions || null, dueDate: assignForm.dueDate || null }
                  }, {
                    onSuccess: () => {
                      invalidate(`/api/classes/${classId}/assignments`);
                      setShowCreateAssignment(false);
                      setAssignForm({ title: "", instructions: "", dueDate: "" });
                    }
                  });
                }}>
                {createAssignment.isPending ? "..." : t("prof.classManagement.create")}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ─── RECORDING UPLOAD MODAL ─── */}
        <Modal open={showAddRecording} onClose={() => { setShowAddRecording(false); setRecordingFile(null); setRecordingUploadProgress("idle"); }} title={t("prof.classManagement.addRecordingTitle")}>
          <div className="space-y-4">
            <div>
              <Label>{t("prof.classManagement.recordingType")}</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setRecordingType("recorded_lecture")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${recordingType === "recorded_lecture" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-border hover:border-muted-foreground"}`}
                >
                  <PlayCircle className="w-6 h-6" />
                  <span className="text-sm font-semibold">{t("prof.classManagement.recordedLecture")}</span>
                  <span className="text-xs text-muted-foreground text-center">{t("prof.classManagement.recordedLectureDesc")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingType("recorded_question")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${recordingType === "recorded_question" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-border hover:border-muted-foreground"}`}
                >
                  <FileQuestion className="w-6 h-6" />
                  <span className="text-sm font-semibold">{t("prof.classManagement.recordedQuestion")}</span>
                  <span className="text-xs text-muted-foreground text-center">{t("prof.classManagement.recordedQuestionDesc")}</span>
                </button>
              </div>
            </div>

            <div><Label>{t("prof.classManagement.titleLabel")}</Label><Input placeholder={recordingType === "recorded_lecture" ? t("prof.classManagement.recordedLecturePlaceholder") : t("prof.classManagement.recordedQuestionPlaceholder")} value={recordingForm.title} onChange={e => setRecordingForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>{t("prof.classManagement.descriptionOptional")}</Label><Input placeholder={t("prof.classManagement.briefDescription")} value={recordingForm.description} onChange={e => setRecordingForm(f => ({ ...f, description: e.target.value }))} /></div>

            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => recordingFileRef.current?.click()}
            >
              <PlayCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              {recordingFile ? (
                <div>
                  <p className="text-sm font-medium text-foreground">{recordingFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{(recordingFile.size / 1024 / 1024).toFixed(1)} Mo</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("prof.classManagement.clickToChooseVideo")}</p>
              )}
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                hidden
                ref={recordingFileRef}
                onChange={e => setRecordingFile(e.target.files?.[0] ?? null)}
              />
              {recordingUploadProgress === "uploading" && (
                <p className="text-xs text-primary mt-3 font-medium animate-pulse">{t("prof.classManagement.uploading")}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAddRecording(false); setRecordingFile(null); setRecordingUploadProgress("idle"); }}>{t("common.cancel")}</Button>
              <Button
                className={`flex-1 ${recordingType === "recorded_lecture" ? "bg-purple-600 hover:bg-purple-700" : "bg-orange-500 hover:bg-orange-600"}`}
                disabled={createMaterial.isPending || recordingUploadProgress === "uploading" || !recordingForm.title}
                onClick={async () => {
                  if (!recordingForm.title) return;
                  let fileUrl: string | null = null;

                  if (recordingFile) {
                    try {
                      setRecordingUploadProgress("uploading");
                      const token = getToken();
                      const reqRes = await fetch(`${API_URL}/storage/uploads/request-url`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ name: recordingFile.name, contentType: recordingFile.type, size: recordingFile.size }),
                      });
                      const reqData = await reqRes.json();

                      if (reqData.local) {
                        const base64Content = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(recordingFile);
                        });
                        const uploadRes = await fetch(`${API_URL}/storage/uploads/direct`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ objectPath: reqData.objectPath, content: base64Content, contentType: recordingFile.type }),
                        });
                        const uploadData = await uploadRes.json();
                        fileUrl = uploadData.objectPath ?? reqData.objectPath;
                      } else if (reqData.uploadUrl) {
                        await fetch(reqData.uploadUrl, {
                          method: "PUT",
                          headers: { "Content-Type": recordingFile.type },
                          body: recordingFile,
                        });
                        fileUrl = reqData.objectPath;
                      }
                      setRecordingUploadProgress("done");
                    } catch {
                      setRecordingUploadProgress("idle");
                      toast({ title: t("common.error"), description: t("prof.classManagement.uploadVideoFailed"), variant: "destructive" });
                      return;
                    }
                  }

                  createMaterial.mutate({
                    id: classId,
                    data: { title: recordingForm.title, description: recordingForm.description || null, fileUrl, type: recordingType } as any,
                  }, {
                    onSuccess: () => {
                      invalidate(`/api/classes/${classId}/materials`);
                      setShowAddRecording(false);
                      setRecordingForm({ title: "", description: "" });
                      setRecordingFile(null);
                      setRecordingUploadProgress("idle");
                    },
                    onError: (err: any) => {
                      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                    },
                  });
                }}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {createMaterial.isPending || recordingUploadProgress === "uploading" ? t("prof.classManagement.publishing") : t("prof.classManagement.publishRecording")}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ─── ANNOUNCEMENT MODAL ─── */}
        <Modal open={showAnnouncement} onClose={() => setShowAnnouncement(false)} title={t("prof.classManagement.announceModalTitle")}>
          <div className="space-y-4">
            <div><Label>{t("prof.classManagement.announceTitleLabel")}</Label><Input placeholder={t("prof.classManagement.announceTitlePlaceholder")} value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <Label>{t("prof.classManagement.announceMessage")}</Label>
              <textarea
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t("prof.classManagement.announceMessagePlaceholder")}
                value={annForm.body}
                onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAnnouncement(false)}>{t("common.cancel")}</Button>
              <Button className="flex-1" disabled={postAnnouncement.isPending || !annForm.title || !annForm.body}
                onClick={() => postAnnouncement.mutate(annForm)}>
                <Megaphone className="w-4 h-4 mr-2" /> {postAnnouncement.isPending ? t("prof.classManagement.publishing") : t("prof.classManagement.publish")}
              </Button>
            </div>
          </div>
        </Modal>
      </FadeIn>
    </DashboardLayout>
  );
}
