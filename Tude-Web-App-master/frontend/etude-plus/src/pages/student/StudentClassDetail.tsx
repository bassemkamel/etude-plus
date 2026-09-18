import { useState } from "react";
import { useRoute, Link } from "wouter";
import { JoinClassButton, LiveBadge } from "@/components/shared/SessionButton";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge } from "@/components/ui/Premium";
import { useTranslation } from "react-i18next";
import {
  PlayCircle, FileText, FileQuestion, Calendar, Download, Clock, Video,
  CheckCircle2, BookOpen, Upload, AlertCircle, ChevronLeft, ClipboardList,
  Star, Send, Loader2, X, CheckCircle, XCircle, MessageSquare, ThumbsUp,
} from "lucide-react";
import { ClassAI } from "@/components/ai/ClassAI";
import { PracticeQuestionsTab } from "@/components/shared/PracticeQuestionsTab";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getToken, useGetClass, useListClassMaterials, useListClassQuizzes,
  useListClassTests, useListClassAssignments, useListClassSessions,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
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

// ── Star Rating Component ─────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${(hovered || value) >= n ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Quiz Taking Modal ─────────────────────────────────────────────────────────

interface QuizAnswer { questionId: number; answer: string }
interface QuizResult { questionId: number; text: string; correct: boolean | null; studentAnswer: string; correctAnswer: string | null }

function QuizModal({
  quiz,
  classId,
  type = "quizzes",
  onClose,
  onDone,
}: {
  quiz: any;
  classId: number;
  type?: "quizzes" | "tests";
  onClose: () => void;
  onDone: () => void;
}) {
  const questions: any[] = quiz.questions ?? [];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; results: QuizResult[] } | null>(null);
  const [error, setError] = useState("");

  const setAnswer = (qId: number, val: string) =>
    setAnswers(prev => ({ ...prev, [qId]: val }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = questions.map(q => ({ questionId: q.id, answer: answers[q.id] ?? "" }));
      const data = await apiFetch(`${API_URL}/classes/${classId}/${type}/${quiz.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      });
      setResult(data);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const percent = result ? Math.round((result.score / result.maxScore) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">{quiz.title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {result ? (
            <div className="text-center">
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold ${percent >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {percent}%
              </div>
              <h3 className="text-xl font-bold mb-1">
                {result.score} / {result.maxScore} points
              </h3>
              <p className="text-muted-foreground mb-6">
                {percent >= 80 ? "Excellent travail !" : percent >= 60 ? "Bon résultat !" : "Continue à t'entraîner !"}
              </p>

              <div className="space-y-3 text-left">
                {result.results.map((r, i) => (
                  <div
                    key={r.questionId}
                    className={`p-4 rounded-xl border ${r.correct === true ? "border-green-200 bg-green-50" : r.correct === false ? "border-red-200 bg-red-50" : "border-border bg-muted/30"}`}
                  >
                    <div className="flex items-start gap-3">
                      {r.correct === true ? (
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      ) : r.correct === false ? (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">Q{i + 1}. {r.text}</p>
                        {r.correct !== null ? (
                          <>
                            <p className="text-xs text-muted-foreground">Ta réponse : <span className={r.correct ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>{r.studentAnswer || "—"}</span></p>
                            {!r.correct && r.correctAnswer && (
                              <p className="text-xs text-green-700 font-semibold mt-0.5">Bonne réponse : {r.correctAnswer}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Réponse ouverte – en attente de correction</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Ce quiz ne contient pas encore de questions.</p>
              ) : (
                questions.map((q: any, i: number) => (
                  <div key={q.id} className="space-y-3">
                    <p className="font-semibold text-sm">
                      <span className="text-primary font-bold">Q{i + 1}.</span> {q.text}
                    </p>

                    {(q.type === "mcq") && q.options && (
                      <div className="grid gap-2">
                        {q.options.map((opt: string, oi: number) => (
                          <label
                            key={oi}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${answers[q.id] === opt ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => setAnswer(q.id, opt)}
                              className="accent-primary"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "true_false" && (
                      <div className="flex gap-3">
                        {["Vrai", "Faux"].map(opt => (
                          <label
                            key={opt}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-colors ${answers[q.id] === opt ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40"}`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => setAnswer(q.id, opt)}
                              className="accent-primary"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {(q.type === "open" || q.type === "short" || !q.type) && (
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={e => setAnswer(q.id, e.target.value)}
                        placeholder="Votre réponse..."
                        rows={3}
                        className="w-full rounded-xl border border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          {result ? (
            <Button onClick={onClose}>Fermer</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={submitting || questions.length === 0}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi…</> : <><Send className="w-4 h-4 mr-2" />Soumettre</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  cls,
  onClose,
  onDone,
}: {
  cls: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { setError("Veuillez sélectionner une note."); return; }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`${API_URL}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          professorId: cls.professor?.id,
          classId: cls.id,
          rating,
          comment: comment.trim() || null,
        }),
      });
      setDone(true);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">Évaluer le professeur</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-lg">Merci pour votre avis !</p>
              <p className="text-muted-foreground text-sm mt-1">Votre évaluation a été enregistrée.</p>
            </div>
          ) : (
            <>
              <div>
                <p className="font-semibold mb-3 text-sm">Votre note</p>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <p className="font-semibold mb-2 text-sm">Commentaire (optionnel)</p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Partagez votre expérience avec ce professeur..."
                  rows={4}
                  className="w-full rounded-xl border border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-3">
          {done ? (
            <Button onClick={onClose}>Fermer</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi…</> : "Envoyer"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function StudentClassDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/student/classes/:id");
  const [activeTab, setActiveTab] = useState("overview");
  const classId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();

  const { data: cls, isLoading } = useGetClass(classId, { query: { enabled: !!classId } as any });
  const { data: allMaterials = [] } = useListClassMaterials(classId, { query: { enabled: !!classId } as any }) as any;
  const materials = (allMaterials as any[]).filter((m: any) => !m.type || m.type === "document");
  const recordings = (allMaterials as any[]).filter((m: any) => m.type === "recorded_lecture" || m.type === "recorded_question");
  const { data: quizzes = [] } = useListClassQuizzes(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: tests = [] } = useListClassTests(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: assignments = [] } = useListClassAssignments(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: allSessions = [] } = useListClassSessions(classId, { query: { enabled: !!classId } as any }) as any;

  // Quiz state
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [submittedQuizIds, setSubmittedQuizIds] = useState<Set<number>>(new Set());

  // Test state
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [submittedTestIds, setSubmittedTestIds] = useState<Set<number>>(new Set());

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const upcomingSessions = allSessions.filter((s: any) => s.status === "scheduled" || s.status === "live")
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const pastSessions = allSessions.filter((s: any) => s.status === "ended")
    .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const publishedQuizzes = quizzes.filter((q: any) => q.isPublished);
  const publishedTests = tests.filter((t: any) => t.isPublished);
  const publishedAssignments = assignments.filter((a: any) => a.isPublished);

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["class-reviews", classId],
    enabled: !!classId,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/reviews?classId=${classId}`);
      return res.ok ? res.json() : [];
    },
  });

  const tabs = [
    { id: "overview", label: t("student.classDetail.tabOverview") },
    { id: "live", label: t("student.classDetail.tabLive") },
    { id: "recordings", label: `${t("student.classDetail.tabRecordings")}${recordings.length > 0 ? ` (${recordings.length})` : ""}` },
    { id: "materials", label: `${t("student.classDetail.tabMaterials")}${materials.length > 0 ? ` (${materials.length})` : ""}` },
    { id: "quizzes", label: `${t("student.classDetail.tabQuizzes")}${publishedQuizzes.length > 0 ? ` (${publishedQuizzes.length})` : ""}` },
    { id: "tests", label: `${t("student.classDetail.tabTests")}${publishedTests.length > 0 ? ` (${publishedTests.length})` : ""}` },
    { id: "assignments", label: `${t("student.classDetail.tabAssignments")}${publishedAssignments.length > 0 ? ` (${publishedAssignments.length})` : ""}` },
    { id: "reviews", label: `${t("student.classDetail.tabReviews")}${reviews.length > 0 ? ` (${reviews.length})` : ""}` },
    { id: "ai", label: "✨ IA" },
    { id: "practice", label: t("student.classDetail.tabPractice") },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-muted rounded-xl" />
          <div className="h-40 bg-muted rounded-2xl" />
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
          <h2 className="text-2xl font-bold mb-2">Cours introuvable</h2>
          <p className="text-muted-foreground mb-6">Ce cours n'existe pas ou vous n'y avez pas accès.</p>
          <Link href="/student/classes"><Button>← Retour à mes cours</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Modals */}
      {activeQuiz && (
        <QuizModal
          quiz={activeQuiz}
          classId={classId}
          onClose={() => setActiveQuiz(null)}
          onDone={() => {
            setSubmittedQuizIds(prev => new Set(prev).add(activeQuiz.id));
            setActiveQuiz(null);
          }}
        />
      )}

      {activeTest && (
        <QuizModal
          quiz={activeTest}
          classId={classId}
          type="tests"
          onClose={() => setActiveTest(null)}
          onDone={() => {
            setSubmittedTestIds(prev => new Set(prev).add(activeTest.id));
            setActiveTest(null);
          }}
        />
      )}

      {showReview && (
        <ReviewModal
          cls={cls}
          onClose={() => setShowReview(false)}
          onDone={() => { setReviewDone(true); setShowReview(false); }}
        />
      )}

      <FadeIn>
        <Link href="/student/classes" className="text-sm font-medium text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {t("student.classDetail.backToClasses")}
        </Link>

        <PageHeader
          title={cls.title}
          description={`Par ${cls.professor?.fullName ?? "Professeur"} • ${cls.subject} • ${cls.gradeLevel}`}
        />

        <div className="flex border-b border-border mb-8 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <FadeIn>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4">À propos de ce cours</h3>
                    <p className="text-muted-foreground leading-relaxed">{cls.description}</p>
                    <dl className="mt-6 space-y-3 text-sm border-t border-border pt-5">
                      {[
                        ["Matière", cls.subject],
                        ["Niveau", cls.gradeLevel],
                        ["Ville", cls.city],
                        ["Durée", `${cls.durationHours}h par session`],
                        ["Prix", `${cls.price} TND`],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Enregistrements", count: recordings.length, icon: PlayCircle, tab: "recordings" },
                      { label: "Supports", count: materials.length, icon: FileText, tab: "materials" },
                      { label: "Quiz", count: publishedQuizzes.length, icon: FileQuestion, tab: "quizzes" },
                      { label: "Contrôles", count: publishedTests.length, icon: ClipboardList, tab: "tests" },
                    ].map(item => (
                      <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                        className="p-5 border-2 border-border rounded-2xl hover:border-primary/50 text-left transition-colors">
                        <item.icon className="w-6 h-6 text-primary mb-2" />
                        <p className="text-2xl font-bold">{item.count}</p>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4">Votre Professeur</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
                        {cls.professor?.fullName?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <p className="font-bold">{cls.professor?.fullName}</p>
                        <p className="text-sm text-muted-foreground">{cls.professor?.city}</p>
                      </div>
                    </div>
                    {cls.nextSession && (
                      <div className="bg-primary/5 rounded-xl p-4 mt-4">
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Prochaine session</p>
                        <p className="font-semibold text-sm">{cls.nextSession.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(cls.nextSession.scheduledAt), "EEEE d MMMM à HH:mm", { locale: fr })}
                        </p>
                        <button onClick={() => setActiveTab("live")} className="mt-3 text-xs text-primary font-semibold hover:underline">
                          Voir la session →
                        </button>
                      </div>
                    )}
                  </Card>

                  {/* Review card */}
                  <Card className="p-6 border-amber-200 bg-amber-50/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <h3 className="font-bold text-base">Votre avis compte !</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Aidez d'autres élèves à choisir ce cours. Partagez votre expérience comme un Google Review.
                    </p>
                    {reviewDone ? (
                      <div className="flex items-center gap-2 text-green-700 text-sm font-semibold bg-green-50 border border-green-200 rounded-xl p-3">
                        <CheckCircle className="w-5 h-5" /> Merci pour votre avis !
                      </div>
                    ) : (
                      <>
                        <Button className="w-full mb-2 bg-amber-500 hover:bg-amber-600" onClick={() => setShowReview(true)}>
                          <Star className="w-4 h-4 mr-2" /> Évaluer le professeur et le cours
                        </Button>
                        <button onClick={() => setActiveTab("reviews")} className="w-full text-xs text-center text-muted-foreground hover:text-primary transition-colors">
                          Voir les {reviews.length} avis →
                        </button>
                      </>
                    )}
                  </Card>
                </div>
              </div>
            </FadeIn>
          )}

          {/* LIVE SESSION TAB */}
          {activeTab === "live" && (
            <FadeIn>
              {allSessions.length === 0 ? (
                <Card className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-muted-foreground opacity-30 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Aucune session prévue</h3>
                  <p className="text-muted-foreground">Le professeur n'a pas encore programmé de session live.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {upcomingSessions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-4">Sessions à venir</h3>
                      <div className="space-y-4">
                        {upcomingSessions.map((s: any) => (
                          <Card key={s.id} className={`p-6 ${s.status === "live" ? "border-red-300 shadow-lg shadow-red-100" : "border-primary/20"}`}>
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {s.status === "live" ? (
                                    <LiveBadge />
                                  ) : (
                                    <Badge variant="secondary">Programmée</Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">{s.price} TND</span>
                                </div>
                                <h4 className="text-xl font-bold mb-1">{s.title}</h4>
                                {s.description && <p className="text-muted-foreground text-sm mb-3">{s.description}</p>}
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    {format(new Date(s.scheduledAt), "EEEE d MMMM", { locale: fr })}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-primary" />
                                    {format(new Date(s.scheduledAt), "HH:mm")}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Video className="w-4 h-4 text-primary" />
                                    {s.durationHours}h
                                  </span>
                                </div>
                              </div>
                              <JoinClassButton
                                session={s}
                                userName={user?.fullName ?? "Étudiant"}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastSessions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-4 text-muted-foreground">Sessions passées</h3>
                      <div className="space-y-3">
                        {pastSessions.map((s: any) => (
                          <Card key={s.id} className="p-4 flex items-center justify-between opacity-60">
                            <div>
                              <p className="font-semibold">{s.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(s.scheduledAt), "d MMMM yyyy", { locale: fr })} • {s.durationHours}h
                              </p>
                            </div>
                            <Badge variant="secondary">Terminée</Badge>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FadeIn>
          )}

          {/* RECORDINGS TAB */}
          {activeTab === "recordings" && (
            <FadeIn>
              {recordings.length === 0 ? (
                <Card className="p-12 text-center">
                  <PlayCircle className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Aucun enregistrement disponible</h3>
                  <p className="text-muted-foreground">Le professeur n'a pas encore publié de cours ou questions enregistrés.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {recordings.map((m: any) => (
                    <Card key={m.id} className="p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.type === "recorded_lecture" ? "bg-purple-100" : "bg-orange-100"}`}>
                          <PlayCircle className={`w-6 h-6 ${m.type === "recorded_lecture" ? "text-purple-600" : "text-orange-600"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold">{m.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.type === "recorded_lecture" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                              {m.type === "recorded_lecture" ? "Cours enregistré" : "Question enregistrée"}
                            </span>
                          </div>
                          {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                          {m.createdAt && (
                            <p className="text-xs text-muted-foreground">Publié le {format(new Date(m.createdAt), "dd/MM/yyyy")}</p>
                          )}
                        </div>
                      </div>
                      {m.fileUrl ? (
                        <Button size="sm" onClick={() => window.open(`${API_URL}/storage${m.fileUrl}`, "_blank")}>
                          <PlayCircle className="w-4 h-4 mr-2" /> Regarder
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>Non disponible</Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </FadeIn>
          )}

          {/* MATERIALS TAB */}
          {activeTab === "materials" && (
            <FadeIn>
              {materials.length > 0 ? (
                <Card className="overflow-hidden">
                  <div className="divide-y divide-border">
                    {materials.map((m: any) => (
                      <div key={m.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold">{m.title}</h4>
                            {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                            {m.createdAt && (
                              <p className="text-xs text-muted-foreground">Ajouté le {format(new Date(m.createdAt), "dd/MM/yyyy")}</p>
                            )}
                          </div>
                        </div>
                        {m.fileUrl ? (
                          <Button variant="ghost" size="sm" onClick={() => window.open(`${API_URL}/storage${m.fileUrl}`, "_blank")}>
                            <Download className="w-5 h-5 text-primary" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled>
                            <Download className="w-5 h-5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Aucun support disponible</h3>
                  <p className="text-muted-foreground">Le professeur n'a pas encore ajouté de supports de cours.</p>
                </Card>
              )}
            </FadeIn>
          )}

          {/* QUIZZES TAB */}
          {activeTab === "quizzes" && (
            <FadeIn>
              {publishedQuizzes.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {publishedQuizzes.map((q: any) => {
                    const done = submittedQuizIds.has(q.id);
                    return (
                      <Card key={q.id} className="p-6">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                          {done ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <FileQuestion className="w-6 h-6 text-primary" />}
                        </div>
                        <h4 className="font-bold text-lg mb-2">{q.title}</h4>
                        <p className="text-sm text-muted-foreground mb-1">{(q.questions as any[])?.length ?? 0} questions</p>
                        {q.dueDate && (
                          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> Avant le {format(new Date(q.dueDate), "dd/MM/yyyy")}
                          </p>
                        )}
                        {done ? (
                          <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mt-2">
                            <CheckCircle2 className="w-4 h-4" /> Soumis avec succès
                          </div>
                        ) : (
                          <Button className="w-full mt-2" onClick={() => setActiveQuiz(q)}>
                            Commencer le quiz
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <FileQuestion className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Aucun quiz disponible</h3>
                  <p className="text-muted-foreground">Le professeur n'a pas encore publié de quiz.</p>
                </Card>
              )}
            </FadeIn>
          )}

          {/* TESTS TAB */}
          {activeTab === "tests" && (
            <FadeIn>
              {publishedTests.length > 0 ? (
                <div className="space-y-4">
                  {publishedTests.map((t: any) => {
                    const done = submittedTestIds.has(t.id);
                    return (
                      <Card key={t.id} className="p-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                              {done ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <ClipboardList className="w-6 h-6 text-orange-600" />}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">{t.title}</h4>
                              <p className="text-sm text-muted-foreground">{(t.questions as any[])?.length ?? 0} questions</p>
                              {t.dueDate && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Calendar className="w-4 h-4" /> Avant le {format(new Date(t.dueDate), "dd MMMM yyyy", { locale: fr })}
                                </p>
                              )}
                            </div>
                          </div>
                          {done ? (
                            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Soumis
                            </div>
                          ) : (
                            <Button onClick={() => setActiveTest(t)}>Commencer</Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <ClipboardList className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Aucun contrôle disponible</h3>
                  <p className="text-muted-foreground">Le professeur n'a pas encore publié de contrôles.</p>
                </Card>
              )}
            </FadeIn>
          )}

          {/* ASSIGNMENTS TAB */}
          {activeTab === "assignments" && (
            <FadeIn>
              {publishedAssignments.length > 0 ? (
                <div className="space-y-4">
                  {publishedAssignments.map((a: any) => (
                    <Card key={a.id} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg mb-1">{a.title}</h4>
                            {a.instructions && (
                              <p className="text-sm text-muted-foreground mb-2">{a.instructions}</p>
                            )}
                            {a.dueDate && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                À rendre avant le {format(new Date(a.dueDate), "dd MMMM yyyy", { locale: fr })}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button size="sm" className="shrink-0">
                          <Upload className="w-4 h-4 mr-2" /> Remettre
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Aucun devoir disponible</h3>
                  <p className="text-muted-foreground">Le professeur n'a pas encore publié de devoirs.</p>
                </Card>
              )}
            </FadeIn>
          )}

          {/* AVIS TAB */}
          {activeTab === "reviews" && (
            <FadeIn>
              <div className="max-w-2xl space-y-6">
                {/* Leave a review prompt */}
                {!reviewDone && (
                  <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                        <Star className="w-6 h-6 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">Laissez un avis</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Votre retour aide les autres élèves à faire leur choix. Soyez honnête, précis, et constructif — comme sur Google !
                        </p>
                        <Button onClick={() => setShowReview(true)} className="bg-amber-500 hover:bg-amber-600">
                          <MessageSquare className="w-4 h-4 mr-2" /> Écrire un avis
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {reviewDone && (
                  <Card className="p-5 border-green-200 bg-green-50">
                    <div className="flex items-center gap-3 text-green-700">
                      <CheckCircle className="w-6 h-6" />
                      <div>
                        <p className="font-bold">Merci pour votre avis !</p>
                        <p className="text-sm text-green-600">Votre évaluation a été enregistrée et aide la communauté.</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Summary */}
                {reviews.length > 0 && (() => {
                  const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
                  const ratingCounts = [5,4,3,2,1].map(star => ({
                    star,
                    count: reviews.filter((r: any) => Math.round(r.rating) === star).length,
                  }));
                  return (
                    <Card className="p-6">
                      <h3 className="font-bold text-lg mb-5">Note globale</h3>
                      <div className="flex gap-8 items-center">
                        <div className="text-center shrink-0">
                          <p className="text-6xl font-bold text-primary">{avg.toFixed(1)}</p>
                          <div className="flex gap-0.5 justify-center my-2">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} className={`w-5 h-5 ${n <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">{reviews.length} avis</p>
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

                {/* Reviews list */}
                {reviews.length === 0 ? (
                  <Card className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Aucun avis pour l'instant</h3>
                    <p className="text-muted-foreground">Soyez le premier à évaluer ce cours !</p>
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
                              <p className="font-bold text-sm">{r.student?.fullName ?? "Élève"}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.createdAt ? format(new Date(r.createdAt), "d MMM yyyy", { locale: fr }) : ""}
                              </p>
                            </div>
                            <div className="flex gap-0.5 mb-2">
                              {[1,2,3,4,5].map(n => (
                                <Star key={n} className={`w-4 h-4 ${n <= Math.round(r.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                            {r.comment && (
                              <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                            )}
                            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors">
                              <ThumbsUp className="w-3 h-3" /> Utile
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </FadeIn>
          )}

          {/* AI TAB */}
          {activeTab === "ai" && cls && (
            <FadeIn>
              <ClassAI
                subject={cls.subject ?? "Général"}
                gradeLevel={cls.gradeLevel ?? "Lycée"}
                classTitle={cls.title ?? ""}
              />
            </FadeIn>
          )}

          {/* PRACTICE QUESTIONS TAB */}
          {activeTab === "practice" && cls && (
            <FadeIn>
              <PracticeQuestionsTab classId={cls.id} userId={(cls as any).studentId ?? undefined} />
            </FadeIn>
          )}
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
