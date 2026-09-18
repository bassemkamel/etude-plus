import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Premium";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { subjectToSlug, subjectFromSlug } from "@/lib/educationConfig";
import {
  BookOpen, ChevronRight, Trophy, ArrowLeft, ArrowRight,
  Eye, EyeOff, CheckCircle2, XCircle, MinusCircle, FileText,
  Calendar, Clock, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function apiFetch(path: string) {
  const token = getToken();
  const fullUrl = `${API_URL}${path}`;
  const res = await fetch(fullUrl, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    console.error(`[Annales] ${res.status} ${res.statusText} — ${fullUrl}`);
    throw new Error(`HTTP ${res.status} — ${fullUrl}`);
  }
  return res.json();
}

type SelfMark = "correct" | "partial" | "incorrect";

interface AnnaleQuestion {
  question: string;
  parts?: { label: string; text: string; marks?: number }[];
  totalMarks?: number;
}

interface AnnaleEntry {
  id: number;
  subject: string;
  year: number | null;
  topic: string;
  content: string;   // JSON array of AnnaleQuestion
  solution: string | null; // JSON markscheme
}

function parseAnnaleContent(raw: string): AnnaleQuestion[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions) return parsed.questions;
    return [];
  } catch {
    return [];
  }
}

function parseAnналeSolution(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.answers) return parsed.answers;
    if (parsed.solutions) return parsed.solutions;
    return [];
  } catch {
    return [];
  }
}

const MARK_OPTION_DEFS: { value: SelfMark; labelKey: string; icon: any; color: string }[] = [
  { value: "correct",   labelKey: "revisionPages.annales.markCorrect",   icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800" },
  { value: "partial",   labelKey: "revisionPages.annales.markPartial",   icon: MinusCircle,  color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800" },
  { value: "incorrect", labelKey: "revisionPages.annales.markIncorrect", icon: XCircle,      color: "text-red-600 bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800" },
];

export function Annales() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/examens-blancs");
  const subject = params?.subject ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject)) : "";
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const MARK_OPTIONS = MARK_OPTION_DEFS.map(opt => ({ ...opt, label: t(opt.labelKey) }));

  const gradeLevel: string = (user as any)?.studentProfile?.gradeLevel ?? "";
  const sectionKey: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  // View state: 'list' | 'exam'
  const [view, setView] = useState<"list" | "exam">("list");
  const [activeAnnale, setActiveAnnale] = useState<AnnaleEntry | null>(null);
  const [showSolutions, setShowSolutions] = useState<Record<number, boolean>>({});
  const [selfMarks, setSelfMarks] = useState<Record<string, SelfMark>>({});
  const [sessionDone, setSessionDone] = useState(false);

  const { data: annales = [], isLoading } = useQuery<AnnaleEntry[]>({
    queryKey: ["annales", subject, gradeLevel, sectionKey],
    queryFn: () => apiFetch(
      `/api/revision/content/annales?subject=${encodeURIComponent(subject)}&gradeLevel=${encodeURIComponent(gradeLevel)}${sectionKey ? `&sectionKey=${encodeURIComponent(sectionKey)}` : ""}`
    ),
    enabled: !!subject && !!gradeLevel,
    staleTime: 10 * 60 * 1000,
  });

  const saveAttempt = useMutation({
    mutationFn: async (body: any) => {
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["progress-overview"] });
      queryClient.invalidateQueries({ queryKey: ["progress-history"] });
      toast({
        title: t("revisionPages.annales.resultSaved"),
        description: data.gradeOutOf20 !== null
          ? t("revisionPages.annales.grade", { grade: data.gradeOutOf20.toFixed(1) })
          : t("revisionPages.annales.goodLuck"),
      });
    },
  });

  function startExam(annale: AnnaleEntry) {
    setActiveAnnale(annale);
    setShowSolutions({});
    setSelfMarks({});
    setSessionDone(false);
    setView("exam");
  }

  function setMark(key: string, mark: SelfMark) {
    setSelfMarks(prev => ({ ...prev, [key]: mark }));
  }

  function handleFinishExam() {
    if (!activeAnnale) return;
    const questions = parseAnnaleContent(activeAnnale.content);

    const allMarks = Object.values(selfMarks);
    if (allMarks.length === 0) {
      toast({ title: t("revisionPages.annales.noEval"), description: t("revisionPages.annales.evalFirst") });
      return;
    }

    // Total marks: use question-level totalMarks if present, else default 1 per question
    const totalMarks = questions.reduce((sum, q) => sum + (q.totalMarks ?? 1), 0);
    const marksAwarded = questions.reduce((sum, q, qi) => {
      const key = `q${qi}`;
      const mark = selfMarks[key];
      const qMarks = q.totalMarks ?? 1;
      if (mark === "correct") return sum + qMarks;
      if (mark === "partial") return sum + Math.floor(qMarks / 2);
      return sum;
    }, 0);

    const correctCount = Object.values(selfMarks).filter(m => m === "correct").length;

    saveAttempt.mutate({
      type: "past_paper",
      subject,
      gradeLevel,
      sectionKey,
      annaleId: activeAnnale.id,
      annaleYear: activeAnnale.year,
      totalMarks,
      marksAwarded,
      questionsCount: questions.length,
      correctCount,
    });

    setSessionDone(true);
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (sessionDone && saveAttempt.data) {
    const grade = saveAttempt.data.gradeOutOf20;
    const gradeColor = grade >= 15 ? "text-green-600" : grade >= 10 ? "text-amber-600" : "text-red-600";
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">{t("revisionPages.annales.resultTitle")}</h1>
            {activeAnnale?.year && (
              <p className="text-muted-foreground">{subject} — {activeAnnale.year}</p>
            )}
          </div>
          {grade !== null ? (
            <div>
              <p className={`text-6xl font-bold ${gradeColor}`}>{grade.toFixed(1)}</p>
              <p className="text-xl text-muted-foreground">/20</p>
            </div>
          ) : null}
          <p className="text-muted-foreground">
            {Object.values(selfMarks).filter(m => m === "correct").length} {t("revisionPages.annales.correct")} ·{" "}
            {Object.values(selfMarks).filter(m => m === "partial").length} {t("revisionPages.annales.partial")} ·{" "}
            {Object.values(selfMarks).filter(m => m === "incorrect").length} {t("revisionPages.annales.incorrect")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => { setView("list"); setSessionDone(false); }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
            >
              {t("revisionPages.annales.backToExams")}
            </button>
            <Link href="/student/progress">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                {t("revisionPages.annales.viewProgress")} <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Exam mode ──────────────────────────────────────────────────────────────
  if (view === "exam" && activeAnnale) {
    const questions = parseAnnaleContent(activeAnnale.content);
    const solutions = parseAnналeSolution(activeAnnale.solution);
    const markedCount = Object.keys(selfMarks).length;

    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Exam header */}
          <div>
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> {t("revisionPages.annales.backToExams")}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  Annale {activeAnnale.year ?? ""} — {subject}
                </h1>
                {activeAnnale.topic && (
                  <p className="text-sm text-muted-foreground">{activeAnnale.topic}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 text-sm">
            <p className="font-semibold text-primary">{t("revisionPages.annales.examMode")}</p>
            <p className="text-muted-foreground mt-0.5">
              {t("revisionPages.annales.examModeDesc")}
            </p>
          </div>

          {/* Questions */}
          {questions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">{t("revisionPages.annales.contentProcessing")}</p>
            </Card>
          ) : (
            <div className="space-y-5">
              {questions.map((q: AnnaleQuestion, qi: number) => {
                const key = `q${qi}`;
                const mark = selfMarks[key];
                const corrVisible = showSolutions[qi];
                const solution = solutions[qi];

                return (
                  <Card
                    key={qi}
                    className={cn(
                      "p-5 space-y-4 transition-all",
                      mark === "correct" && "border-green-300 dark:border-green-800",
                      mark === "partial" && "border-amber-300 dark:border-amber-800",
                      mark === "incorrect" && "border-red-300 dark:border-red-800",
                    )}
                  >
                    {/* Question header */}
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {qi + 1}
                      </span>
                      <div className="flex-1">
                        {q.totalMarks && (
                          <p className="text-xs text-muted-foreground mb-1">{q.totalMarks} point{q.totalMarks > 1 ? "s" : ""}</p>
                        )}
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    {/* Parts */}
                    {q.parts && q.parts.length > 0 && (
                      <div className="ml-11 space-y-2">
                        {q.parts.map((part, pi) => (
                          <div key={pi} className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                              {part.label}
                            </span>
                            <div>
                              <p className="text-sm">{part.text}</p>
                              {part.marks && (
                                <p className="text-xs text-muted-foreground">{part.marks} pt{part.marks > 1 ? "s" : ""}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show/hide solution */}
                    <div className="ml-11">
                      <button
                        type="button"
                        onClick={() => setShowSolutions(prev => ({ ...prev, [qi]: !prev[qi] }))}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
                      >
                        {corrVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {corrVisible ? t("revisionPages.annales.hideSolution") : t("revisionPages.annales.showSolution")}
                      </button>

                      {corrVisible && solution && (
                        <div className="mt-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                          <p className="text-xs font-bold text-green-800 dark:text-green-300 mb-2">{t("revisionPages.annales.solution")}</p>
                          <div className="text-sm text-green-900 dark:text-green-200 whitespace-pre-wrap">
                            {typeof solution === "string" ? solution :
                              solution.answer ?? solution.expected ?? JSON.stringify(solution)}
                          </div>
                          {solution.explanation && (
                            <p className="text-xs text-green-700 dark:text-green-400 mt-2">{solution.explanation}</p>
                          )}
                        </div>
                      )}

                      {corrVisible && !solution && (
                        <p className="mt-2 text-xs text-muted-foreground">{t("revisionPages.annales.solutionNA")}</p>
                      )}

                      {/* Self-mark */}
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                          {t("revisionPages.annales.assessAnswer")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {MARK_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const selected = mark === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setMark(key, opt.value)}
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
          {questions.length > 0 && (
            <div className="sticky bottom-4">
              <Card className="p-4 flex items-center justify-between shadow-lg bg-card/95 backdrop-blur">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{markedCount}</span> / {questions.length} question{questions.length > 1 ? "s" : ""} évaluée{markedCount > 1 ? "s" : ""}
                </p>
                <button
                  onClick={handleFinishExam}
                  disabled={markedCount === 0 || saveAttempt.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saveAttempt.isPending ? t("revisionPages.annales.saving") : t("revisionPages.annales.submit")}
                  <Trophy className="w-4 h-4" />
                </button>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 flex-wrap">
            <BookOpen className="w-4 h-4" />
            <Link href="/revision" className="hover:text-foreground transition-colors">{t("revisionPages.annales.breadcrumbHub")}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${subjectToSlug(subject)}`} className="hover:text-foreground transition-colors">{subject}</Link>
            <ChevronRight className="w-3 h-3" />
            <span>{t("revisionPages.annales.breadcrumbSection")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("revisionPages.annales.title", { subject })}</h1>
          <p className="text-muted-foreground mt-1">
            {t("revisionPages.annales.subtitle")}
          </p>
        </div>

        {!gradeLevel && (
          <Card className="p-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">{t("revisionPages.annales.levelNotSet")}</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <Link href="/student/settings" className="underline">{t("revisionPages.annales.configureLevel")}</Link> {t("revisionPages.annales.toSeeAdapted")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-5 flex items-center gap-4 rounded-2xl border border-border bg-card">
                <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && annales.length === 0 && gradeLevel && (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">{t("revisionPages.annales.inPrep")}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {t("revisionPages.annales.inPrepDesc", { subject })}
            </p>
          </Card>
        )}

        {!isLoading && annales.length > 0 && (
          <div className="space-y-4">
            {annales.map((annale) => (
              <Card key={annale.id} className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {annale.year && (
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {annale.year}
                      </span>
                    )}
                    {annale.topic && (
                      <span className="text-xs text-muted-foreground truncate">{annale.topic}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{subject}</p>
                  {(() => {
                    const qs = parseAnnaleContent(annale.content);
                    return qs.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {qs.length} question{qs.length > 1 ? "s" : ""}
                      </p>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => startExam(annale)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shrink-0"
                >
                  {t("revisionPages.annales.start")} <ArrowRight className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
