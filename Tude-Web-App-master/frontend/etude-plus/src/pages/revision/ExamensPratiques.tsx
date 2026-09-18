/**
 * Examens Pratiques
 * Source of truth: questions table via GET /api/revision/content/questions
 * Presents all questions for the subject in exam format (no immediate feedback).
 * Student self-grades each question, then submits for a score on 20.
 * Results saved to POST /api/progress/attempts (type = "practice").
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Premium";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { subjectToSlug, subjectFromSlug } from "@/lib/educationConfig";
import {
  BookOpen, ChevronRight, ClipboardList, ArrowLeft, ArrowRight,
  Eye, EyeOff, CheckCircle2, XCircle, MinusCircle,
  Calculator, AlertCircle, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function apiFetch(path: string) {
  const token = getToken();
  const fullUrl = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(fullUrl, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    console.error(`[ExamensPratiques] ${res.status} ${res.statusText} — ${fullUrl}`);
    throw new Error(`HTTP ${res.status} — ${fullUrl}`);
  }
  return res.json();
}

type SelfMark = "correct" | "partial" | "incorrect";

interface QuestionPart { id: number; label: string; text: string; marks: number; orderIndex: number }
interface MarkSchemeEntry { id: number; partLabel: string; answer: string; marksBreakdown: string | null; orderIndex: number }
interface Question {
  id: number;
  topic: string;
  type: string;
  difficulty: string;
  questionText: string;
  context: string | null;
  requiresCalculator: boolean;
  totalMarks: number | null;
  estimatedTimeMinutes: number | null;
  parts: QuestionPart[];
  markScheme: MarkSchemeEntry[];
}

const DIFFICULTY_COLOR: Record<string, string> = {
  facile:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  moyen:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  difficile: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const MARK_OPTION_DEFS: { value: SelfMark; labelKey: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: "correct",   labelKey: "revisionPages.annales.markCorrect",   icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800" },
  { value: "partial",   labelKey: "revisionPages.annales.markPartial",   icon: MinusCircle,  color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800" },
  { value: "incorrect", labelKey: "revisionPages.annales.markIncorrect", icon: XCircle,      color: "text-red-600 bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800" },
];

export function ExamensPratiques() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/examens-pratiques");
  const subject = params?.subject ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject)) : "";
  const slug = subjectToSlug(subject);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const MARK_OPTIONS = MARK_OPTION_DEFS.map(opt => ({ ...opt, label: t(opt.labelKey) }));

  const gradeLevel: string = (user as any)?.studentProfile?.gradeLevel ?? "";
  const sectionKey: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  // ui state
  const [examStarted, setExamStarted] = useState(false);
  const [showScheme, setShowScheme] = useState<Record<number, boolean>>({});
  const [selfMarks, setSelfMarks] = useState<Record<number, SelfMark>>({});
  const [submitted, setSubmitted] = useState(false);
  // shuffledQuestions holds the randomized order for this attempt — resets on each new exam
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  /**
   * Examens Pratiques fetches from the same questions table as Banque de Questions,
   * but with intentional differences:
   *  - No topic/difficulty/type filter → cross-topic draw from the full subject pool
   *  - Client-side shuffle → different order every attempt (no stable repetition)
   *  - limit=100 so we have a large pool to draw from, then cap at 15 after shuffle
   *
   * Banque de Questions: filtered by topic+difficulty, one question at a time,
   * immediate feedback, stable ordering.
   * Examens Pratiques: unfiltered, randomized, all-at-once, reveal-then-grade, mandatory submit.
   */
  const { data: rawQuestions = [], isLoading, isError } = useQuery<Question[]>({
    queryKey: ["exam-pratiques-pool", subject, gradeLevel, sectionKey],
    queryFn: () => apiFetch(
      // No topic or difficulty params — intentionally cross-topic
      `https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1/revision-questions?subject=${encodeURIComponent(subject)}&gradeLevel=${encodeURIComponent(gradeLevel)}${sectionKey ? `&sectionKey=${encodeURIComponent(sectionKey)}` : ""}&limit=100`
    ),
    enabled: !!subject && !!gradeLevel && examStarted,
    staleTime: 10 * 60 * 1000,
  });

  // Shuffle once when the pool arrives for this exam attempt
  useEffect(() => {
    if (rawQuestions.length === 0) return;
    const shuffled = [...rawQuestions].sort(() => Math.random() - 0.5).slice(0, 15);
    setShuffledQuestions(shuffled);
  }, [rawQuestions]);

  const questions = shuffledQuestions;

  const saveAttempt = useMutation({
    mutationFn: async (body: object) => {
      const token = getToken();
      const res = await fetch(`${API_URL}/progress/attempts`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save attempt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-overview"] });
      queryClient.invalidateQueries({ queryKey: ["progress-history"] });
    },
  });

  function handleSubmit() {
    const markedCount = Object.keys(selfMarks).length;
    if (markedCount === 0) {
      toast({ title: t("revisionPages.examensPratiques.noEval"), description: t("revisionPages.examensPratiques.evalFirst") });
      return;
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.totalMarks ?? 1), 0);
    const marksAwarded = questions.reduce((sum, q) => {
      const mark = selfMarks[q.id];
      const qMarks = q.totalMarks ?? 1;
      if (mark === "correct") return sum + qMarks;
      if (mark === "partial") return sum + Math.floor(qMarks / 2);
      return sum;
    }, 0);
    const correctCount = Object.values(selfMarks).filter(m => m === "correct").length;

    const answers = questions.map(q => ({
      questionId: q.id,
      subject,
      topic: q.topic,
      isCorrect: selfMarks[q.id] === "correct",
      marksAwarded: (() => {
        const mark = selfMarks[q.id];
        const qMarks = q.totalMarks ?? 1;
        if (mark === "correct") return qMarks;
        if (mark === "partial") return Math.floor(qMarks / 2);
        return 0;
      })(),
      marksAvailable: q.totalMarks ?? 1,
    }));

    saveAttempt.mutate({
      type: "practice",
      subject,
      gradeLevel,
      sectionKey,
      totalMarks,
      marksAwarded,
      questionsCount: questions.length,
      correctCount,
      answers,
    });
    setSubmitted(true);
  }

  // ── Result screen ────────────────────────────────────────────────────────────
  if (submitted && saveAttempt.data) {
    const grade = saveAttempt.data.gradeOutOf20;
    const gradeColor = grade >= 15 ? "text-green-600" : grade >= 10 ? "text-amber-600" : "text-red-600";
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">{t("revisionPages.examensPratiques.resultTitle")}</h1>
            <p className="text-muted-foreground">{subject}</p>
          </div>
          {grade !== null && (
            <div>
              <p className={`text-6xl font-bold ${gradeColor}`}>{grade.toFixed(1)}</p>
              <p className="text-xl text-muted-foreground">/20</p>
            </div>
          )}
          <p className="text-muted-foreground">
            {Object.values(selfMarks).filter(m => m === "correct").length} {t("revisionPages.annales.correct")} ·{" "}
            {Object.values(selfMarks).filter(m => m === "partial").length} {t("revisionPages.annales.partial")} ·{" "}
            {Object.values(selfMarks).filter(m => m === "incorrect").length} {t("revisionPages.annales.incorrect")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => { setExamStarted(false); setSubmitted(false); setSelfMarks({}); setShowScheme({}); setShuffledQuestions([]); }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
            >
              {t("revisionPages.examensPratiques.restart")}
            </button>
            <Link href="/student/progress">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                {t("revisionPages.examensPratiques.viewProgress")} <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Landing screen (before exam start) ──────────────────────────────────────
  if (!examStarted) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
              <BookOpen className="w-4 h-4" />
              <Link href="/revision" className="hover:text-foreground transition-colors">{t("revisionPages.examensPratiques.breadcrumbHub")}</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/revision/${slug}`} className="hover:text-foreground transition-colors">{subject}</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{t("revisionPages.examensPratiques.breadcrumbSection")}</span>
            </div>
            <h1 className="text-2xl font-bold">{t("revisionPages.examensPratiques.title", { subject })}</h1>
            <p className="text-muted-foreground mt-1">
              {t("revisionPages.examensPratiques.subtitle")}
            </p>
          </div>

          {!gradeLevel && (
            <Card className="p-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">{t("revisionPages.examensPratiques.levelNotSet")}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <Link href="/student/settings" className="underline">{t("revisionPages.examensPratiques.configureLevel")}</Link> {t("revisionPages.examensPratiques.toAccessExams")}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {gradeLevel && (
            <Card className="p-8 flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold">{t("revisionPages.examensPratiques.readyTitle")}</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t("revisionPages.examensPratiques.readyDesc", { subject })}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                    {t("revisionPages.examensPratiques.randomDraw")}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                    {t("revisionPages.examensPratiques.allChapters")}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                    {t("revisionPages.examensPratiques.scoredOn20")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setExamStarted(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                {t("revisionPages.examensPratiques.startExam")} <ArrowRight className="w-4 h-4" />
              </button>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── Exam screen ──────────────────────────────────────────────────────────────
  const markedCount = Object.keys(selfMarks).length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => { setExamStarted(false); setSelfMarks({}); setShowScheme({}); setShuffledQuestions([]); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> {t("revisionPages.examensPratiques.back")}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("revisionPages.examensPratiques.examTitle", { subject })}</h1>
              {!isLoading && questions.length > 0 && (
                <p className="text-sm text-muted-foreground">{questions.length} question{questions.length > 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 text-sm">
          <p className="font-semibold text-green-800 dark:text-green-300">{t("revisionPages.examensPratiques.examMode")}</p>
          <p className="text-muted-foreground mt-0.5">
            {t("revisionPages.examensPratiques.examModeDesc")}
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        )}

        {isError && (
          <Card className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground opacity-40 mx-auto mb-3" />
            <p className="font-semibold">{t("revisionPages.examensPratiques.loadError")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("revisionPages.examensPratiques.checkConnection")}</p>
          </Card>
        )}

        {!isLoading && !isError && questions.length === 0 && (
          <Card className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">{t("revisionPages.examensPratiques.noQuestions")}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {t("revisionPages.examensPratiques.noQuestionsDesc", { subject })}
            </p>
          </Card>
        )}

        {!isLoading && questions.length > 0 && (
          <div className="space-y-5">
            {questions.map((q, qi) => {
              const mark = selfMarks[q.id];
              const schemeVisible = showScheme[q.id];

              return (
                <Card
                  key={q.id}
                  className={cn(
                    "p-5 space-y-4 transition-all",
                    mark === "correct"   && "border-green-300 dark:border-green-800",
                    mark === "partial"   && "border-amber-300 dark:border-amber-800",
                    mark === "incorrect" && "border-red-300 dark:border-red-800",
                  )}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {qi + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", DIFFICULTY_COLOR[q.difficulty] ?? "bg-muted text-muted-foreground")}>
                          {q.difficulty}
                        </span>
                        {q.requiresCalculator && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calculator className="w-3 h-3" /> {t("revisionPages.examensPratiques.calculator")}
                          </span>
                        )}
                        {q.totalMarks && (
                          <span className="text-xs text-muted-foreground">{q.totalMarks} pt{q.totalMarks > 1 ? "s" : ""}</span>
                        )}
                      </div>
                      {q.context && (
                        <div
                          className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border"
                          dangerouslySetInnerHTML={{ __html: q.context }}
                        />
                      )}
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {q.questionText}
                      </p>
                    </div>
                  </div>

                  {/* Parts */}
                  {q.parts.length > 0 && (
                    <div className="ml-11 space-y-3">
                      {q.parts.map(part => (
                        <div key={part.id} className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                            {part.label}
                          </span>
                          <div>
                            <p className="text-sm">{part.text}</p>
                            <p className="text-xs text-muted-foreground">{part.marks} pt{part.marks > 1 ? "s" : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Corrigé toggle + self-mark */}
                  <div className="ml-11 space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowScheme(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      {schemeVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {schemeVisible ? t("revisionPages.examensPratiques.hideSolution") : t("revisionPages.examensPratiques.showSolution")}
                    </button>

                    {schemeVisible && q.markScheme.length > 0 && (
                      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-2">
                        <p className="text-xs font-bold text-green-800 dark:text-green-300">{t("revisionPages.examensPratiques.solution")}</p>
                        {q.markScheme.map(ms => (
                          <div key={ms.id} className="flex gap-2 text-sm">
                            {q.parts.length > 1 && (
                              <span className="font-bold text-green-700 dark:text-green-400 shrink-0">{ms.partLabel}.</span>
                            )}
                            <div>
                              <p className="text-green-900 dark:text-green-200">{ms.answer}</p>
                              {ms.marksBreakdown && (
                                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">{ms.marksBreakdown}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {schemeVisible && q.markScheme.length === 0 && (
                      <p className="text-xs text-muted-foreground">{t("revisionPages.examensPratiques.solutionNA")}</p>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                        {t("revisionPages.examensPratiques.assessAnswer")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MARK_OPTIONS.map(opt => {
                          const Icon = opt.icon;
                          const selected = mark === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setSelfMarks(prev => ({ ...prev, [q.id]: opt.value }))}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                                opt.color,
                                selected && "ring-2 ring-offset-1 ring-current shadow-sm"
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Submit footer */}
        {!isLoading && questions.length > 0 && (
          <div className="sticky bottom-4">
            <Card className="p-4 flex items-center justify-between shadow-lg bg-card/95 backdrop-blur">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{markedCount}</span> / {questions.length} question{questions.length > 1 ? "s" : ""} évaluée{markedCount > 1 ? "s" : ""}
              </p>
              <button
                onClick={handleSubmit}
                disabled={markedCount === 0 || saveAttempt.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saveAttempt.isPending ? t("revisionPages.examensPratiques.saving") : t("revisionPages.examensPratiques.submitExam")}
                <Trophy className="w-4 h-4" />
              </button>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
