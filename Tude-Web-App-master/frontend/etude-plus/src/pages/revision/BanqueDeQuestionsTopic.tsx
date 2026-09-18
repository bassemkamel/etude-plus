/**
 * BanqueDeQuestionsTopic — question viewer for a specific chapter/topic.
 *
 * This is the full Q&A experience (was previously in BanqueDeQuestionsSubject).
 * Shows questions for the selected chapter with navigation, self-assessment, and mark scheme.
 * Shows an empty state if the chapter has no questions yet — the chapter still renders.
 */

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { subjectFromSlug, subjectToSlug } from "@/lib/educationConfig";
import { getFallbackQuestions, getQualitativeFeedback } from "@/lib/questionsFallback";
import {
  BookOpen, ChevronRight, ChevronLeft, Eye, EyeOff,
  CheckCircle2, XCircle, MinusCircle, Trophy, ArrowRight,
  AlertCircle, Calculator, BookMarked, Sparkles, Bookmark,
  BookmarkCheck, Hash, Construction,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

async function apiFetch(path: string) {
  const token = getToken();
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

type SelfMark = "correct" | "partial" | "incorrect" | null;

// ── Difficulty badge ──────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    facile:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
    moyen:     "bg-amber-50 text-amber-700 border border-amber-200",
    difficile: "bg-red-50 text-red-700 border border-red-200",
  };
  const label = t(`revision.questionTopic.difficulty.${difficulty}`, { defaultValue: difficulty });
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", styles[difficulty] ?? styles.moyen)}>
      {label}
    </span>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question, selfMark, showMarkScheme,
}: {
  question: any; selfMark: SelfMark; showMarkScheme: boolean;
}) {
  const { t } = useTranslation();
  const ring =
    selfMark === "correct"   ? "ring-2 ring-emerald-400" :
    selfMark === "partial"   ? "ring-2 ring-amber-400" :
    selfMark === "incorrect" ? "ring-2 ring-red-400" : "";

  return (
    <div className={cn("bg-background rounded-2xl border border-border shadow-sm overflow-hidden transition-all", ring)}>
      <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap">
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
          question.requiresCalculator
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-muted text-muted-foreground border-border"
        )}>
          <Calculator className="w-3 h-3" />
          {question.requiresCalculator ? t("revision.questionTopic.withCalc") : t("revision.questionTopic.noCalc")}
        </div>
        <DifficultyBadge difficulty={question.difficulty} />
        {/* Points intentionally hidden from student view per product spec.
            totalMarks is still stored for admin/scoring and used internally. */}
        {question.estimatedTimeMinutes && (
          <span className="text-xs text-muted-foreground ml-auto">~{question.estimatedTimeMinutes} min</span>
        )}
      </div>

      <div
        className="px-6 py-8 space-y-5"
        dir={question.direction === "rtl" ? "rtl" : undefined}
      >
        {/* Instruction (new format) — falls back to nothing for legacy rows */}
        {question.instruction && (
          <p className="text-sm font-semibold text-muted-foreground">{question.instruction}</p>
        )}

        {/* Legacy context block (HTML) — shown only for old DB rows */}
        {question.context && (
          <div
            className="text-sm bg-muted/40 rounded-xl p-4 border border-border leading-relaxed prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: question.context }}
          />
        )}

        <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">
          {question.question ?? question.questionText}
        </p>

        {/* New format: multiple-choice options A/B/C/D */}
        {Array.isArray(question.options) && question.options.length > 0 && (
          <div className="space-y-2 pt-1">
            {question.options.map((opt: any) => (
              <div
                key={opt.label}
                className="flex gap-3 items-start p-3 rounded-xl border border-border bg-muted/20"
              >
                <span className="inline-flex w-7 h-7 rounded-full bg-primary/10 items-center justify-center text-xs font-bold text-primary shrink-0">
                  {opt.label}
                </span>
                <p className="text-sm leading-relaxed flex-1">{opt.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Legacy format: question parts (multi-part exercises) */}
        {Array.isArray(question.parts) && question.parts.length > 0 && (
          <div className="space-y-4 pt-2">
            {question.parts.map((part: any, i: number) => (
              <div key={part.id ?? i} className="flex gap-4">
                <span className="inline-flex w-7 h-7 rounded-full bg-primary/10 items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                  {part.label}
                </span>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{part.text}</p>
                  {/* Per-part marks hidden from student view per product spec. */}
                </div>
              </div>
            ))}
          </div>
        )}

        {showMarkScheme && (
          <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                {t("revision.questionTopic.markScheme")}
              </p>
            </div>

            {/* New format mark scheme */}
            {question.correctAnswer && (
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Bonne réponse : <span className="font-bold">{question.correctAnswer}</span>
              </p>
            )}
            {question.explanation && (
              <p className="text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap">
                {question.explanation}
              </p>
            )}

            {/* Legacy format mark scheme (array of part answers) */}
            {Array.isArray(question.markScheme) && question.markScheme.length > 0 && (
              <div className="space-y-3">
                {question.markScheme.map((ms: any, i: number) => (
                  <div key={ms.id ?? i} className="flex gap-3">
                    {ms.partLabel && (
                      <span className="shrink-0 inline-flex w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {ms.partLabel}
                      </span>
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap">{ms.answer}</p>
                      {ms.marksBreakdown && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">{ms.marksBreakdown}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!question.correctAnswer
              && !question.explanation
              && (!Array.isArray(question.markScheme) || question.markScheme.length === 0) && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {t("revision.questionTopic.markSchemeNA")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Action panel ──────────────────────────────────────────────────────────────

function ActionPanel({
  selfMark, onMark, bookmarked, onBookmark,
  showMarkScheme, onToggleMarkScheme,
  onFinish, markedCount, totalCount, isPending,
}: {
  selfMark: SelfMark; onMark: (v: SelfMark) => void;
  bookmarked: boolean; onBookmark: () => void;
  showMarkScheme: boolean; onToggleMarkScheme: () => void;
  onFinish: () => void; markedCount: number; totalCount: number; isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onBookmark}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all",
            bookmarked ? "bg-primary/10 border-primary/30 text-primary" : "border-border hover:bg-muted text-muted-foreground"
          )}
        >
          {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          {bookmarked ? t("revision.questionTopic.saved") : t("revision.questionTopic.save")}
        </button>
        <button
          onClick={() => onMark(selfMark === "correct" ? null : "correct")}
          className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all",
            selfMark === "correct" ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:bg-muted text-muted-foreground"
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
          {selfMark === "correct" ? t("revision.questionTopic.correctMark") : t("revision.questionTopic.complete")}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("revision.questionTopic.selfAssess")}</p>
        <div className="space-y-2">
          {([
            { value: "correct" as SelfMark,   label: t("revision.questionTopic.correct"),   icon: CheckCircle2, active: "bg-emerald-500 border-emerald-500 text-white", base: "text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
            { value: "partial" as SelfMark,   label: t("revision.questionTopic.partial"),   icon: MinusCircle,  active: "bg-amber-500 border-amber-500 text-white",   base: "text-amber-700 border-amber-200 hover:bg-amber-50" },
            { value: "incorrect" as SelfMark, label: t("revision.questionTopic.incorrect"), icon: XCircle,      active: "bg-red-500 border-red-500 text-white",       base: "text-red-700 border-red-200 hover:bg-red-50" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => onMark(selfMark === opt.value ? null : opt.value)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                selfMark === opt.value ? opt.active : cn("bg-background", opt.base)
              )}
            >
              <opt.icon className="w-4 h-4 shrink-0" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onToggleMarkScheme}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold transition-all",
          showMarkScheme
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 text-emerald-700 dark:text-emerald-300"
            : "border-border hover:bg-muted text-foreground"
        )}
      >
        <BookMarked className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{t("revision.questionTopic.markScheme")}</span>
        {showMarkScheme ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/30 text-sm font-semibold text-muted-foreground">
        <Sparkles className="w-4 h-4 shrink-0 text-yellow-500" />
        <span className="flex-1">{t("revision.questionTopic.aiFeedback")}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full">{t("revision.questionTopic.soon")}</span>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground">{t("revision.questionTopic.progress")}</span>
          <span className="font-bold text-primary">{markedCount}/{totalCount}</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(markedCount / totalCount) * 100}%` : "0%" }}
          />
        </div>
        <button
          onClick={onFinish}
          disabled={markedCount === 0 || isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? t("revision.questionTopic.saving") : t("revision.questionTopic.finish")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function BanqueDeQuestionsTopic() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/banque-de-questions/:topic");
  const subject = params?.subject
    ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject))
    : "";
  const topic  = params?.topic ? decodeURIComponent(params.topic) : "";
  const slug   = subjectToSlug(subject);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const levelCode  = (user as any)?.studentProfile?.gradeLevel ?? "";
  const sectionKey: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  const [currentIdx, setCurrentIdx]       = useState(0);
  const [showMarkScheme, setShowMarkScheme] = useState(false);
  const [selfMarks, setSelfMarks]           = useState<Record<number, SelfMark>>({});
  const [bookmarks, setBookmarks]           = useState<Set<number>>(new Set());
  const [sessionDone, setSessionDone]       = useState(false);
  const [feedback, setFeedback]             = useState<string | null>(null);

  const questionsUrl = `https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1/revision-questions?${new URLSearchParams({
    subject, gradeLevel: levelCode, topic,
    ...(sectionKey ? { sectionKey } : {}),
    limit: "20",
  })}`;

  const { data: questions = [], isLoading } = useQuery<any[]>({
    queryKey: ["revision-questions-topic", levelCode, sectionKey, subject, topic],
    queryFn: () => apiFetch(questionsUrl),
    enabled: !!levelCode && !!subject && !!topic,
    staleTime: 10 * 60 * 1000,
  });

  const displayQuestions = useMemo(
    () => (!isLoading && questions.length === 0)
      ? getFallbackQuestions(levelCode, subject, topic, sectionKey)
      : questions,
    [isLoading, questions, levelCode, subject, topic, sectionKey],
  );

  useEffect(() => {
    setCurrentIdx(0);
    setShowMarkScheme(false);
  }, [topic]);

  const saveAttempt = useMutation({
    mutationFn: async (body: any) => {
      const token = getToken();
      const res = await fetch(`${SUPABASE_FN}/progress/attempts`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save attempt");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["progress-overview"] });
      queryClient.invalidateQueries({ queryKey: ["progress-history"] });
      toast({
        title: t("revision.questionTopic.sessionSaved"),
        description: data.gradeOutOf20 !== null
          ? t("revision.questionTopic.result", { grade: data.gradeOutOf20.toFixed(1) })
          : t("revision.questionTopic.goodLuck"),
      });
    },
  });

  const currentQuestion = displayQuestions[currentIdx] ?? null;
  const selfMark        = currentQuestion ? (selfMarks[currentQuestion.id] ?? null) : null;
  const markedCount     = Object.keys(selfMarks).length;
  const totalQuestions  = displayQuestions.length;

  function goTo(idx: number) {
    setCurrentIdx(Math.max(0, Math.min(idx, totalQuestions - 1)));
    setShowMarkScheme(false);
  }

  function handleFinish() {
    const marked = displayQuestions.filter((q: any) => selfMarks[q.id]);
    if (!marked.length) { toast({ title: t("revision.questionTopic.noneEvaluated") }); return; }

    // Compute qualitative score locally: correct = 1, partial = 0.5, incorrect = 0
    const score = marked.reduce((s: number, q: any) => {
      const m = selfMarks[q.id];
      return m === "correct" ? s + 1 : m === "partial" ? s + 0.5 : s;
    }, 0);
    setFeedback(getQualitativeFeedback(score, displayQuestions.length));

    // Persist attempt only for real DB-backed questions (positive IDs).
    const allRealIds = marked.every((q: any) => q.id > 0);
    if (allRealIds) {
      const totalMarks   = marked.reduce((s: number, q: any) => s + (q.totalMarks ?? 1), 0);
      const marksAwarded = marked.reduce((s: number, q: any) => {
        const m = selfMarks[q.id]; const qm = q.totalMarks ?? 1;
        return m === "correct" ? s + qm : m === "partial" ? s + Math.floor(qm / 2) : s;
      }, 0);
      saveAttempt.mutate({
        type: "practice", subject, gradeLevel: levelCode, sectionKey, topic,
        totalMarks, marksAwarded,
        questionsCount: marked.length,
        correctCount: Object.values(selfMarks).filter(m => m === "correct").length,
        answers: marked.map((q: any) => ({
          questionId: q.id, subject, topic,
          isCorrect: selfMarks[q.id] === "correct",
          marksAwarded: selfMarks[q.id] === "correct" ? (q.totalMarks ?? 1)
            : selfMarks[q.id] === "partial" ? Math.floor((q.totalMarks ?? 1) / 2) : 0,
          marksAvailable: q.totalMarks ?? 1,
        })),
      });
    }
    setSessionDone(true);
  }

  // Result screen — qualitative feedback (no grade out of 20).
  if (sessionDone) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">{t("revision.questionTopic.done")}</h1>
            <p className="text-muted-foreground">{topic}</p>
          </div>
          {feedback && (
            <div className="py-4 px-4">
              <p className="text-lg font-semibold text-foreground leading-relaxed">{feedback}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setSelfMarks({}); setBookmarks(new Set()); setShowMarkScheme(false);
                setSessionDone(false); setCurrentIdx(0); setFeedback(null);
              }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
            >
              {t("revision.questionTopic.newSession")}
            </button>
            <Link href={`/revision/${slug}/banque-de-questions`}>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                {t("revision.questionTopic.otherChapters")} <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Breadcrumb */}
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5 flex-wrap">
            <BookOpen className="w-4 h-4" />
            <Link href="/revision" className="hover:text-foreground transition-colors">{t("revision.breadcrumb.hub")}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${slug}`} className="hover:text-foreground transition-colors">{subject}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${slug}/banque-de-questions`} className="hover:text-foreground transition-colors">{t("revision.subject.sections.questionBank.title")}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{topic}</span>
          </div>
          <h1 className="text-xl font-bold">{topic}</h1>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-5">
            <div className="h-80 bg-muted rounded-2xl animate-pulse" />
            <div className="h-96 bg-muted rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Empty — chapter exists but no questions yet */}
        {!isLoading && displayQuestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-border space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Construction className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t("revision.questionTopic.inPrep")}</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                {t("revision.questionTopic.questionComingSoon", { topic })}
              </p>
            </div>
            <Link href={`/revision/${slug}/banque-de-questions`}>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" /> {t("revision.questionTopic.seeAllChapters")}
              </button>
            </Link>
          </div>
        )}

        {/* Two-panel question viewer */}
        {!isLoading && displayQuestions.length > 0 && currentQuestion && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
            <div className="space-y-4">
              {/* Navigation */}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" /> {t("revision.questionTopic.prev")}
                </button>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {displayQuestions.map((q: any, i: number) => {
                    const m = selfMarks[q.id];
                    return (
                      <button key={q.id} onClick={() => goTo(i)} title={t("revision.questionTopic.questionN", { n: i + 1 })}
                        className={cn(
                          "w-7 h-7 rounded-full text-[11px] font-bold transition-all border-2",
                          i === currentIdx ? "bg-primary border-primary text-primary-foreground scale-110 shadow"
                          : m === "correct"   ? "bg-emerald-500 border-emerald-500 text-white"
                          : m === "partial"   ? "bg-amber-500 border-amber-500 text-white"
                          : m === "incorrect" ? "bg-red-500 border-red-500 text-white"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50"
                        )}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => goTo(currentIdx + 1)} disabled={currentIdx === totalQuestions - 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted disabled:opacity-30 transition-colors">
                  {t("revision.questionTopic.next")} <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="ml-auto text-sm text-muted-foreground font-medium">
                  {currentIdx + 1} / {totalQuestions}
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight">{t("revision.questionTopic.questionN", { n: currentIdx + 1 })}</h2>
              <QuestionCard question={currentQuestion} selfMark={selfMark} showMarkScheme={showMarkScheme} />
            </div>

            <div className="lg:sticky lg:top-6">
              <ActionPanel
                selfMark={selfMark}
                onMark={v => setSelfMarks(prev => ({ ...prev, [currentQuestion.id]: v }))}
                bookmarked={bookmarks.has(currentQuestion.id)}
                onBookmark={() => setBookmarks(prev => {
                  const next = new Set(prev); next.has(currentQuestion.id) ? next.delete(currentQuestion.id) : next.add(currentQuestion.id); return next;
                })}
                showMarkScheme={showMarkScheme}
                onToggleMarkScheme={() => setShowMarkScheme(v => !v)}
                onFinish={handleFinish}
                markedCount={markedCount}
                totalCount={totalQuestions}
                isPending={saveAttempt.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
