import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { subjectFromSlug, subjectToSlug } from "@/lib/educationConfig";
import { getFallbackChapters } from "@/lib/curriculumFallback";
import { getFallbackQuestions } from "@/lib/questionsFallback";
import { BookOpen, ChevronRight, ChevronLeft, AlertCircle, FileQuestion, FolderOpen } from "lucide-react";
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

interface DisplayChapter {
  name:          string;
  group:         string | null;
  questionCount: number;
  index:         number; // 1-based global index across all chapters in the subject
}

function toGroupSlug(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9؀-ۿ]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "group";
}

function isRTL(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BanqueDeQuestionsSubject() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/banque-de-questions");
  const subject = params?.subject
    ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject))
    : "";
  const slug = subjectToSlug(subject);
  const { user } = useAuth();

  const levelCode: string  = (user as any)?.studentProfile?.gradeLevel     ?? "";
  const sectionKey: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  const [selectedChapter, setSelectedChapter] = useState<DisplayChapter | null>(null);

  // Fetch from API; silently fall back to [] on failure
  const { data: apiChapters = [], isLoading } = useQuery<CurriculumChapter[]>({
    queryKey: ["curriculum-chapters", levelCode, sectionKey, subject],
    queryFn: async () => {
      try {
        return await fetchChapters(levelCode, sectionKey, subject);
      } catch {
        return [];
      }
    },
    enabled: !!levelCode && !!subject,
    staleTime: 15 * 60 * 1000,
  });

  // Merge API data (preferred) with local fallback
  const chapters = useMemo<DisplayChapter[]>(() => {
    const raw = apiChapters.length > 0
      ? apiChapters.map(c => ({ name: c.name, group: c.shortName ?? null, questionCount: c.questionCount }))
      : getFallbackChapters(levelCode, subject, sectionKey).map(c => ({ name: c.name, group: c.group, questionCount: getFallbackQuestions(levelCode, subject, c.name, sectionKey).length }));
    return raw.map((c, i) => ({ ...c, index: i + 1 }));
  }, [apiChapters, levelCode, subject, sectionKey]);

  // Group chapters, preserving insertion order
  const groups = useMemo(() => {
    const order: string[] = [];
    const map  = new Map<string, DisplayChapter[]>();
    for (const ch of chapters) {
      const g = ch.group ?? "";
      if (!map.has(g)) { map.set(g, []); order.push(g); }
      map.get(g)!.push(ch);
    }
    return order.map(g => ({ key: g, label: g, chapters: map.get(g)! }));
  }, [chapters]);

  const breadcrumb = (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
      <BookOpen className="w-4 h-4 shrink-0" />
      <Link href="/revision" className="hover:text-foreground transition-colors">
        {t("revision.breadcrumb.hub")}
      </Link>
      <ChevronRight className="w-3 h-3" />
      <Link href={`/revision/${slug}`} className="hover:text-foreground transition-colors">
        {subject}
      </Link>
      <ChevronRight className="w-3 h-3" />
      <span className="text-foreground font-medium">
        {t("revision.subject.sections.questionBank.title")}
      </span>
    </div>
  );

  // ── Chapter detail (in-page empty state) ─────────────────────────────────
  if (selectedChapter) {
    const rtl = isRTL(selectedChapter.name) || isRTL(selectedChapter.group ?? "");
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            {breadcrumb}
            <button
              onClick={() => setSelectedChapter(null)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t("revision.subject.sections.questionBank.title")}</span>
            </button>
          </div>

          <div dir={rtl ? "rtl" : undefined}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {selectedChapter.group ? `${selectedChapter.group} · ` : ""}Chapitre {selectedChapter.index}
            </p>
            <h1 className="text-xl font-bold">{selectedChapter.name}</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border">
            <FileQuestion className="w-12 h-12 text-muted-foreground opacity-25 mb-4" />
            <p className="font-semibold">Aucune question pour ce chapitre</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
              Les questions n'ont pas encore été ajoutées. Ajoute-les manuellement depuis le panneau administrateur.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="space-y-1.5">
          {breadcrumb}
          <h1 className="text-2xl font-bold mt-1.5">{subject}</h1>
          {chapters.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {chapters.length} chapitre{chapters.length !== 1 ? "s" : ""}
              {groups.some(g => g.label) && ` · ${groups.filter(g => g.label).length} groupe${groups.filter(g => g.label).length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {/* Level not configured */}
        {!levelCode && (
          <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                {t("revision.chapters.levelNotSet")}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                <Link href="/student/settings" className="underline">
                  {t("revision.chapters.configureLevel")}
                </Link>{" "}
                {t("revision.chapters.toSeeChapters")}
              </p>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* No chapters for this subject */}
        {!isLoading && levelCode && chapters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border">
            <FolderOpen className="w-12 h-12 text-muted-foreground opacity-25 mb-4" />
            <p className="font-semibold">Aucun chapitre pour cette matière</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
              Les chapitres n'ont pas encore été ajoutés pour{" "}
              <span className="font-medium">{subject}</span>.
            </p>
          </div>
        )}

        {/* Two-column layout: sidebar + chapters */}
        {!isLoading && chapters.length > 0 && (
          <div className="lg:flex lg:gap-8">

            {/* Sticky sidebar — desktop */}
            {groups.some(g => g.label) && (
              <aside className="hidden lg:block w-52 shrink-0">
                <div className="sticky top-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
                    Groupes
                  </p>
                  <nav className="space-y-0.5">
                    {groups.filter(g => g.label).map(g => (
                      <a
                        key={g.key}
                        href={`#${toGroupSlug(g.label)}`}
                        className={cn(
                          "flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg",
                          "text-muted-foreground hover:text-foreground hover:bg-muted",
                          "transition-colors truncate",
                          isRTL(g.label) && "flex-row-reverse text-right"
                        )}
                        title={g.label}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
                        <span className="truncate">{g.label}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            {/* Chapter content */}
            <div className="flex-1 min-w-0 space-y-10">

              {/* Mobile group dropdown */}
              {groups.filter(g => g.label).length > 1 && (
                <div className="lg:hidden">
                  <select
                    defaultValue=""
                    onChange={e => {
                      const id = e.target.value;
                      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground"
                  >
                    <option value="">Aller au groupe…</option>
                    {groups.filter(g => g.label).map(g => (
                      <option key={g.key} value={toGroupSlug(g.label)}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {groups.map(g => (
                <section key={g.key} id={g.label ? toGroupSlug(g.label) : undefined}>
                  {g.label && (
                    <h2
                      className={cn(
                        "text-base font-semibold mb-4 pb-2 border-b border-border",
                        isRTL(g.label) && "text-right"
                      )}
                      dir={isRTL(g.label) ? "rtl" : undefined}
                    >
                      {g.label}
                    </h2>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {g.chapters.map(ch => (
                      <ChapterCard
                        key={ch.name}
                        chapter={ch}
                        slug={slug}
                        onOpen={() => setSelectedChapter(ch)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── Chapter card ──────────────────────────────────────────────────────────────

function ChapterCard({
  chapter,
  slug,
  onOpen,
}: {
  chapter: DisplayChapter;
  slug:    string;
  onOpen:  () => void;
}) {
  const { t } = useTranslation();
  const hasQuestions = chapter.questionCount > 0;
  const rtl = isRTL(chapter.name);

  const handleClick = () => {
    if (hasQuestions) {
      window.location.href = `/revision/${slug}/banque-de-questions/${encodeURIComponent(chapter.name)}`;
    } else {
      onOpen();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:-translate-y-0.5",
        hasQuestions
          ? "border-border hover:border-primary/50 bg-card"
          : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
      )}
    >
      {/* Chapter number badge */}
      <span className="inline-flex w-7 h-7 rounded-full bg-primary/10 items-center justify-center text-xs font-bold text-primary shrink-0 self-start">
        {chapter.index}
      </span>

      {/* Chapter name */}
      <p
        className={cn(
          "font-semibold text-sm leading-snug flex-1 transition-colors",
          hasQuestions
            ? "text-foreground group-hover:text-primary"
            : "text-foreground/80 group-hover:text-foreground",
          rtl && "text-right"
        )}
        dir={rtl ? "rtl" : undefined}
      >
        <span className="text-muted-foreground font-normal">Chapitre {chapter.index} · </span>
        {chapter.name}
      </p>

      {/* Footer: question count + CTA */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {hasQuestions ? (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {chapter.questionCount} {chapter.questionCount > 1
              ? t("revision.chapters.questions")
              : t("revision.chapters.question")}
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            0 question
          </span>
        )}

        <button
          onClick={e => { e.stopPropagation(); handleClick(); }}
          className={cn(
            "flex items-center gap-1 text-xs font-semibold transition-colors shrink-0",
            hasQuestions
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          <span>Ouvrir</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
