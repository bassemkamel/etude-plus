/**
 * Flashcards — chapter list for a subject.
 *
 * Fetches chapters from the curriculum edge function (includes flashcard counts).
 * Chapters always render even when flashcardCount = 0 — the curriculum drives
 * the UI, not the content tables.
 *
 * Clicking a chapter navigates to FlashcardsTopic for the actual flashcard session.
 */

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { subjectFromSlug, subjectToSlug } from "@/lib/educationConfig";
import { BookOpen, ChevronRight, Layers, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CurriculumChapter } from "@/types/curriculum";

const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

async function fetchChapters(
  levelCode: string,
  sectionKey: string | null,
  subject: string,
): Promise<CurriculumChapter[]> {
  const token = getToken();
  const params = new URLSearchParams({ levelCode, subject });
  if (sectionKey) params.set("sectionKey", sectionKey);

  const res = await fetch(`${SUPABASE_FN}/curriculum/chapters?${params}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function Flashcards() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/flashcards");
  const subject = params?.subject
    ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject))
    : "";
  const slug = subjectToSlug(subject);
  const { user } = useAuth();

  const levelCode  = (user as any)?.studentProfile?.gradeLevel ?? "";
  const sectionKey: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  const { data: chapters = [], isLoading, isError } = useQuery<CurriculumChapter[]>({
    queryKey: ["curriculum-chapters", levelCode, sectionKey, subject],
    queryFn: () => fetchChapters(levelCode, sectionKey, subject),
    enabled: !!levelCode && !!subject,
    staleTime: 15 * 60 * 1000,
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5 flex-wrap">
            <BookOpen className="w-4 h-4" />
            <Link href="/revision" className="hover:text-foreground transition-colors">{t("revision.breadcrumb.hub")}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${slug}`} className="hover:text-foreground transition-colors">{subject}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{t("revision.subject.sections.flashcards.title")}</span>
          </div>
          <h1 className="text-2xl font-bold">{subject} — {t("revision.subject.sections.flashcards.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("revision.chapters.selectFlashcardChapter")}
          </p>
        </div>

        {/* Level not configured */}
        {!levelCode && (
          <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">{t("revision.chapters.levelNotSet")}</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                <Link href="/student/settings" className="underline">{t("revision.chapters.configureLevel")}</Link>{" "}{t("revision.chapters.toSeeChapters")}
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-red-200 dark:border-red-900">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3 opacity-60" />
            <p className="font-semibold">{t("revision.chapters.loadError")}</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-sm text-primary underline">
              {t("revision.chapters.retry")}
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && chapters.length === 0 && levelCode && (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border">
            <BookOpen className="w-10 h-10 text-muted-foreground opacity-30 mb-4" />
            <p className="font-semibold">{t("revision.chapters.comingSoon")}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {t("revision.chapters.contentInPrep", { subject })}
            </p>
          </div>
        )}

        {/* Chapter grid */}
        {!isLoading && chapters.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {chapters.map((chapter, i) => (
              <FlashcardChapterCard
                key={chapter.id}
                chapter={chapter}
                index={i}
                href={`/revision/${slug}/flashcards/${encodeURIComponent(chapter.name)}`}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── Chapter card ──────────────────────────────────────────────────────────────

function FlashcardChapterCard({
  chapter,
  index,
  href,
}: {
  chapter: CurriculumChapter;
  index:   number;
  href:    string;
}) {
  const { t } = useTranslation();
  const hasContent = chapter.flashcardCount > 0;

  return (
    <Link href={href}>
      <div className={cn(
        "group flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:-translate-y-0.5",
        hasContent
          ? "border-border hover:border-violet-400/60 bg-card"
          : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"
      )}>
        {/* Row: number + flashcard count badge */}
        <div className="flex items-center justify-between">
          <span className="inline-flex w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400 shrink-0">
            {index + 1}
          </span>
          <div className="flex items-center gap-1.5">
            {hasContent ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                <Layers className="w-3 h-3" />
                {chapter.flashcardCount} {chapter.flashcardCount > 1 ? t("revision.chapters.cards") : t("revision.chapters.card")}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {t("revision.chapters.soon")}
              </span>
            )}
          </div>
        </div>

        {/* Chapter name */}
        <div className="flex-1">
          <p className={cn(
            "font-semibold text-sm leading-snug transition-colors",
            hasContent
              ? "text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400"
              : "text-muted-foreground group-hover:text-foreground"
          )}>
            {chapter.name}
          </p>
          {chapter.shortName && (
            <p className="text-xs text-muted-foreground mt-0.5">{chapter.shortName}</p>
          )}
        </div>

        {/* CTA */}
        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold transition-colors",
          hasContent
            ? "text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400"
            : "text-muted-foreground"
        )}>
          <span>{hasContent ? t("revision.chapters.start") : t("revision.chapters.viewChapter")}</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
