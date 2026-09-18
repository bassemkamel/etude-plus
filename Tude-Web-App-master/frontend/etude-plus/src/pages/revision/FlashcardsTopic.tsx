/**
 * FlashcardsTopic — flashcard viewer for a single chapter.
 *
 * URL: /revision/:subject/flashcards/:topic
 *
 * Fetches flashcards filtered by chapter name (topic). If the chapter exists in
 * the curriculum but has no flashcards yet, shows a "En préparation" state.
 */

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Premium";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { subjectToSlug, subjectFromSlug } from "@/lib/educationConfig";
import {
  BookOpen, ChevronRight, ChevronLeft, RotateCcw,
  Layers, Construction,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

async function apiFetch(path: string) {
  const token = getToken();
  const url = path.startsWith("http") ? path : `${SUPABASE_FN}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function FlashcardsTopic() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/flashcards/:topic");
  const subject = params?.subject
    ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject))
    : "";
  const topic = params?.topic ? decodeURIComponent(params.topic) : "";
  const slug = subjectToSlug(subject);

  const { user } = useAuth();
  const gradeLevel: string = (user as any)?.studentProfile?.gradeLevel ?? "";
  const sectionKey: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped]           = useState(false);
  const [mode, setMode]                 = useState<"deck" | "browse">("deck");

  const { data: flashcards = [], isLoading } = useQuery<any[]>({
    queryKey: ["flashcards", subject, gradeLevel, sectionKey, topic],
    queryFn: () =>
      apiFetch(
        `/api/revision/content/flashcards?subject=${encodeURIComponent(subject)}&gradeLevel=${encodeURIComponent(gradeLevel)}${sectionKey ? `&sectionKey=${encodeURIComponent(sectionKey)}` : ""}&topic=${encodeURIComponent(topic)}`
      ),
    enabled: !!subject && !!gradeLevel && !!topic,
    staleTime: 10 * 60 * 1000,
  });

  const current = flashcards[currentIndex];

  function next() {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.min(i + 1, flashcards.length - 1)), 150);
  }

  function prev() {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.max(i - 1, 0)), 150);
  }

  function restart() {
    setFlipped(false);
    setCurrentIndex(0);
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Breadcrumb */}
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5 flex-wrap">
            <BookOpen className="w-4 h-4" />
            <Link href="/revision" className="hover:text-foreground transition-colors">{t("revision.breadcrumb.hub")}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${slug}`} className="hover:text-foreground transition-colors">{subject}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${slug}/flashcards`} className="hover:text-foreground transition-colors">{t("revision.subject.sections.flashcards.title")}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{topic}</span>
          </div>
          <h1 className="text-2xl font-bold">{topic}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("revision.flashcardsTopic.subtitle")}
          </p>
        </div>

        {/* Loading — mirrors the flashcard deck layout */}
        {isLoading && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-2 self-start">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>
            <Skeleton className="w-full max-w-lg h-56 rounded-2xl" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>
        )}

        {/* Empty — chapter exists but no flashcards yet */}
        {!isLoading && flashcards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Construction className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold">{t("revision.flashcardsTopic.inPrep")}</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              {t("revision.flashcardsTopic.comingSoon", { topic })}
            </p>
            <Link
              href={`/revision/${slug}/flashcards`}
              className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              {t("revision.flashcardsTopic.backToChapters")}
            </Link>
          </div>
        )}

        {/* Content */}
        {!isLoading && flashcards.length > 0 && (
          <>
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("deck")}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold border transition-colors",
                  mode === "deck"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t("revision.flashcardsTopic.deckMode")}
              </button>
              <button
                onClick={() => setMode("browse")}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold border transition-colors",
                  mode === "browse"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t("revision.flashcardsTopic.browseMode")}
              </button>
            </div>

            {/* Deck mode */}
            {mode === "deck" && current && (
              <div className="flex flex-col items-center gap-6">
                <p className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {flashcards.length}
                </p>

                <div
                  className={cn(
                    "w-full max-w-lg min-h-56 rounded-3xl border-2 p-8 flex items-center justify-center text-center cursor-pointer transition-all duration-300 select-none",
                    flipped
                      ? "bg-violet-600 text-white border-violet-600 shadow-xl shadow-violet-600/20"
                      : "bg-card border-border hover:border-violet-400/50 hover:shadow-md"
                  )}
                  onClick={() => setFlipped(f => !f)}
                >
                  <div>
                    {!flipped ? (
                      <>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                          {t("revision.flashcardsTopic.question")}
                        </p>
                        <p className="text-lg font-semibold">{current.front}</p>
                        <p className="text-xs text-muted-foreground mt-4">{t("revision.flashcardsTopic.clickToReveal")}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-3">
                          {t("revision.flashcardsTopic.answer")}
                        </p>
                        <p className="text-lg font-semibold">{current.back}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={prev}
                        disabled={currentIndex === 0}
                        aria-label={t("revision.flashcardsTopic.prevCard")}
                        className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t("revision.flashcardsTopic.prevCard")}</TooltipContent>
                  </Tooltip>
                  <button
                    onClick={restart}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <RotateCcw className="w-4 h-4" /> {t("revision.flashcardsTopic.restart")}
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={next}
                        disabled={currentIndex === flashcards.length - 1}
                        aria-label={t("revision.flashcardsTopic.nextCard")}
                        className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t("revision.flashcardsTopic.nextCard")}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Progress dots */}
                {flashcards.length <= 20 && (
                  <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
                    {flashcards.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => { setFlipped(false); setCurrentIndex(i); }}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          i === currentIndex
                            ? "bg-violet-600 scale-125"
                            : "bg-border hover:bg-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Browse mode */}
            {mode === "browse" && (
              <div className="grid sm:grid-cols-2 gap-4">
                {flashcards.map((card: any) => (
                  <Card key={card.id} className="p-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Layers className="w-3.5 h-3.5 text-violet-500" />
                      {card.topic && (
                        <p className="text-xs text-muted-foreground">{card.topic}</p>
                      )}
                    </div>
                    <p className="font-semibold text-sm mb-3">{card.front}</p>
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-3 border border-violet-200 dark:border-violet-800">
                      <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">{card.back}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
