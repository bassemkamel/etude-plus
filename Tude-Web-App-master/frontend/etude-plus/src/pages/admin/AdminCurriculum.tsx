/**
 * Admin Curriculum Browser
 * Browse the official curriculum skeleton: class → subject → chapters.
 * Each chapter links directly to content management (add questions, flashcards, etc.).
 * Route: /admin/curriculum
 */

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BookOpen, ChevronRight, Plus, FileQuestion, Layers, ArrowLeft, GraduationCap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";

const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CurriculumSubject {
  id: number;
  code: string;
  name: string;
  icon: string;
  colorClass: string;
  orderIndex: number;
}

interface CurriculumChapter {
  id: number;
  levelCode: string;
  sectionKey: string | null;
  subject: string;
  name: string;
  shortName: string | null;
  slug: string;
  orderIndex: number;
  isActive: boolean;
  questionCount: number;
  flashcardCount: number;
}

// ── Level config ───────────────────────────────────────────────────────────────

const LEVELS = [
  { code: "1ere_secondaire", label: "1ère secondaire", sectionKey: null },
  { code: "2eme",            label: "2ème — Sciences",                sectionKey: "sciences" },
  { code: "2eme",            label: "2ème — Lettres",                 sectionKey: "lettres" },
  { code: "2eme",            label: "2ème — Économie & Services",     sectionKey: "economie_services" },
  { code: "2eme",            label: "2ème — Technologie Informatique",sectionKey: "technologie_informatique" },
  { code: "3eme",            label: "3ème — Mathématiques",           sectionKey: "mathematiques" },
  { code: "3eme",            label: "3ème — Sciences Expérimentales", sectionKey: "sciences_experimentales" },
  { code: "3eme",            label: "3ème — Sciences Techniques",     sectionKey: "sciences_techniques" },
  { code: "3eme",            label: "3ème — Lettres",                 sectionKey: "lettres" },
  { code: "3eme",            label: "3ème — Économie & Gestion",      sectionKey: "economie_gestion" },
  { code: "3eme",            label: "3ème — Sciences Informatique",   sectionKey: "sciences_informatique" },
  { code: "bac",             label: "Bac — Mathématiques",            sectionKey: "mathematiques" },
  { code: "bac",             label: "Bac — Sciences Expérimentales",  sectionKey: "sciences_experimentales" },
  { code: "bac",             label: "Bac — Sciences Techniques",      sectionKey: "sciences_techniques" },
  { code: "bac",             label: "Bac — Lettres",                  sectionKey: "lettres" },
  { code: "bac",             label: "Bac — Économie & Gestion",       sectionKey: "economie_gestion" },
  { code: "bac",             label: "Bac — Sciences Informatique",    sectionKey: "sciences_informatique" },
] as const;

// ── Fetch helpers ──────────────────────────────────────────────────────────────

async function fetchSubjects(levelCode: string, sectionKey: string | null): Promise<CurriculumSubject[]> {
  const token = getToken();
  const params = new URLSearchParams({ levelCode });
  if (sectionKey) params.set("sectionKey", sectionKey);
  const res = await fetch(`${SUPABASE_FN}/curriculum/subjects?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchChapters(levelCode: string, sectionKey: string | null, subject: string): Promise<CurriculumChapter[]> {
  const token = getToken();
  const params = new URLSearchParams({ levelCode, subject });
  if (sectionKey) params.set("sectionKey", sectionKey);
  const res = await fetch(`${SUPABASE_FN}/curriculum/chapters?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Arabic subjects ────────────────────────────────────────────────────────────

const RTL_SUBJECTS = new Set(["الجغرافيا", "التاريخ", "اللغة العربية / التربية الإسلامية", "Arabe"]);

function isRtl(subjectName: string) {
  return RTL_SUBJECTS.has(subjectName);
}

// ── Chapter list with group headers ───────────────────────────────────────────

function ChapterList({
  chapters,
  subject,
  levelCode,
  sectionKey,
  selectedChapter,
  onSelect,
}: {
  chapters: CurriculumChapter[];
  subject: string;
  levelCode: string;
  sectionKey: string | null;
  selectedChapter: CurriculumChapter | null;
  onSelect: (ch: CurriculumChapter) => void;
}) {
  const rtl = isRtl(subject);

  // Group chapters by shortName (preserve insertion order)
  const groups = useMemo(() => {
    const map = new Map<string, CurriculumChapter[]>();
    for (const ch of chapters) {
      const group = ch.shortName ?? "";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(ch);
    }
    return map;
  }, [chapters]);

  if (chapters.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Aucun chapitre trouvé pour ce niveau.
        <br />
        <span className="text-xs">Lancez le seed de curriculum pour initialiser les données.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={rtl ? "rtl" : "ltr"}>
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          {group && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
              {group}
            </p>
          )}
          <div className="space-y-1">
            {items.map(ch => (
              <button
                key={ch.id}
                onClick={() => onSelect(ch)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all",
                  "border hover:border-primary/50 hover:bg-primary/5",
                  selectedChapter?.id === ch.id
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-transparent bg-muted/40 text-foreground",
                  rtl && "text-right"
                )}
              >
                <span className="block leading-snug">{ch.name}</span>
                {(ch.questionCount > 0 || ch.flashcardCount > 0) && (
                  <span className="flex gap-3 mt-1">
                    {ch.questionCount > 0 && (
                      <span className="text-xs text-muted-foreground">{ch.questionCount} question{ch.questionCount > 1 ? "s" : ""}</span>
                    )}
                    {ch.flashcardCount > 0 && (
                      <span className="text-xs text-muted-foreground">{ch.flashcardCount} flashcard{ch.flashcardCount > 1 ? "s" : ""}</span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chapter content panel ──────────────────────────────────────────────────────

function ChapterPanel({
  chapter,
  levelCode,
  sectionKey,
}: {
  chapter: CurriculumChapter;
  levelCode: string;
  sectionKey: string | null;
}) {
  const rtl = isRtl(chapter.subject);

  // Build context params for AdminManualQuestion
  const manualParams = new URLSearchParams({
    levelCode,
    subject: chapter.subject,
    topic: chapter.name,
    ...(sectionKey ? { sectionKey } : {}),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className={cn("space-y-1", rtl && "text-right")} dir={rtl ? "rtl" : "ltr"}>
        {chapter.shortName && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {chapter.shortName}
          </p>
        )}
        <h3 className="text-base font-bold text-foreground leading-snug">{chapter.name}</h3>
        <p className="text-sm text-muted-foreground">{chapter.subject}</p>
      </div>

      {/* Content counts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-foreground">{chapter.questionCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Questions</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-foreground">{chapter.flashcardCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Flashcards</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</p>
        <Link
          href={`/admin/manual-question?${manualParams}`}
          className={cn(
            "flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all",
            "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          Ajouter une question manuellement
        </Link>
        <Link
          href={`/admin/knowledge-base?levelCode=${levelCode}&subject=${encodeURIComponent(chapter.subject)}&topic=${encodeURIComponent(chapter.name)}`}
          className={cn(
            "flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all",
            "border border-border bg-muted/30 text-foreground hover:bg-muted/60"
          )}
        >
          <FileQuestion className="w-4 h-4 shrink-0" />
          Uploader un document IA
        </Link>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AdminCurriculum() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<CurriculumSubject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<CurriculumChapter | null>(null);

  const level = LEVELS[levelIdx];

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["curriculum-subjects", level.code, level.sectionKey],
    queryFn: () => fetchSubjects(level.code, level.sectionKey),
    staleTime: 5 * 60 * 1000,
  });

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ["curriculum-chapters", level.code, level.sectionKey, selectedSubject?.name],
    queryFn: () => fetchChapters(level.code, level.sectionKey, selectedSubject!.name),
    enabled: !!selectedSubject,
    staleTime: 5 * 60 * 1000,
  });

  function handleLevelChange(idx: number) {
    setLevelIdx(idx);
    setSelectedSubject(null);
    setSelectedChapter(null);
  }

  function handleSubjectSelect(subj: CurriculumSubject) {
    setSelectedSubject(subj);
    setSelectedChapter(null);
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Curriculum</h1>
            <p className="text-sm text-muted-foreground">Parcourir les matières et chapitres par niveau</p>
          </div>
        </div>

        {/* Level selector */}
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l, i) => (
            <button
              key={i}
              onClick={() => handleLevelChange(i)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                levelIdx === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: "60vh" }}>

          {/* Col 1: Subject list */}
          <div className="md:col-span-1 rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Matières</p>
            {subjectsLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Aucune matière disponible.
                <br />
                <span className="text-xs">Lancez le seed pour initialiser.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {subjects.map(subj => (
                  <button
                    key={subj.id}
                    onClick={() => handleSubjectSelect(subj)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                      "border hover:border-primary/40",
                      selectedSubject?.id === subj.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background text-foreground hover:bg-muted/30"
                    )}
                  >
                    <span className="text-lg shrink-0">{subj.icon}</span>
                    <span className={cn(
                      "leading-tight text-left flex-1",
                      isRtl(subj.name) && "text-right"
                    )} dir={isRtl(subj.name) ? "rtl" : "ltr"}>
                      {subj.name}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Col 2: Chapter list */}
          <div className="md:col-span-1 rounded-2xl border border-border bg-card p-4 overflow-y-auto">
            {!selectedSubject ? (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground text-sm py-12">
                <div>
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Sélectionner une matière
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => { setSelectedSubject(null); setSelectedChapter(null); }}
                    className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                    title="Retour aux matières"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <p className={cn(
                    "text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1",
                    isRtl(selectedSubject.name) && "text-right"
                  )} dir={isRtl(selectedSubject.name) ? "rtl" : "ltr"}>
                    {selectedSubject.name}
                  </p>
                </div>
                {chaptersLoading ? (
                  <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-10 rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <ChapterList
                    chapters={chapters}
                    subject={selectedSubject.name}
                    levelCode={level.code}
                    sectionKey={level.sectionKey}
                    selectedChapter={selectedChapter}
                    onSelect={setSelectedChapter}
                  />
                )}
              </>
            )}
          </div>

          {/* Col 3: Chapter content panel */}
          <div className="md:col-span-1 rounded-2xl border border-border bg-card p-4">
            {!selectedChapter ? (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground text-sm py-12">
                <div>
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Sélectionner un chapitre
                </div>
              </div>
            ) : (
              <ChapterPanel
                chapter={selectedChapter}
                levelCode={level.code}
                sectionKey={level.sectionKey}
              />
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
