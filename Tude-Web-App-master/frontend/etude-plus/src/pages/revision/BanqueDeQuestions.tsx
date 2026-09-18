import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link } from "wouter";
import { getSubjectsForNiveauSection, getNiveauLabel, getSectionLabel, isSectionLevel, subjectToSlug } from "@/lib/educationConfig";
import { getFallbackChapters } from "@/lib/curriculumFallback";
import { BookOpen, ChevronRight, AlertCircle } from "lucide-react";

const SUBJECT_COLORS: Record<string, string> = {
  "Mathématiques":       "bg-blue-500/10 border-blue-200 dark:bg-blue-500/20 dark:border-blue-800",
  "Physique-Chimie":     "bg-purple-500/10 border-purple-200 dark:bg-purple-500/20 dark:border-purple-800",
  "Sciences Naturelles": "bg-green-500/10 border-green-200 dark:bg-green-500/20 dark:border-green-800",
  "SVT":                 "bg-lime-500/10 border-lime-200 dark:bg-lime-500/20 dark:border-lime-800",
  "Arabe":               "bg-amber-500/10 border-amber-200 dark:bg-amber-500/20 dark:border-amber-800",
  "Français":            "bg-rose-500/10 border-rose-200 dark:bg-rose-500/20 dark:border-rose-800",
  "Anglais":             "bg-sky-500/10 border-sky-200 dark:bg-sky-500/20 dark:border-sky-800",
  "Histoire-Géographie": "bg-orange-500/10 border-orange-200 dark:bg-orange-500/20 dark:border-orange-800",
  "Histoire":            "bg-orange-500/10 border-orange-200 dark:bg-orange-500/20 dark:border-orange-800",
  "Géographie":          "bg-yellow-500/10 border-yellow-200 dark:bg-yellow-500/20 dark:border-yellow-800",
  "Technologie":         "bg-zinc-500/10 border-zinc-200 dark:bg-zinc-500/20 dark:border-zinc-800",
  "Technique":           "bg-zinc-500/10 border-zinc-200 dark:bg-zinc-500/20 dark:border-zinc-800",
  "Éducation Islamique": "bg-teal-500/10 border-teal-200 dark:bg-teal-500/20 dark:border-teal-800",
  "Éducation Civique":   "bg-slate-500/10 border-slate-200 dark:bg-slate-500/20 dark:border-slate-800",
  "Informatique":        "bg-teal-500/10 border-teal-200 dark:bg-teal-500/20 dark:border-teal-800",
  "Philosophie":         "bg-indigo-500/10 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-800",
  "Économie":            "bg-emerald-500/10 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-800",
  "Économie / Gestion":              "bg-emerald-500/10 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-800",
  "Gestion":                         "bg-teal-500/10 border-teal-200 dark:bg-teal-500/20 dark:border-teal-800",
  "Génie Électrique":                "bg-yellow-500/10 border-yellow-200 dark:bg-yellow-500/20 dark:border-yellow-800",
  "Génie Mécanique":                 "bg-zinc-500/10 border-zinc-200 dark:bg-zinc-500/20 dark:border-zinc-800",
  "Algorithmique et Programmation":  "bg-cyan-500/10 border-cyan-200 dark:bg-cyan-500/20 dark:border-cyan-800",
  "Systèmes d'exploitation et Réseaux": "bg-indigo-500/10 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-800",
  "TIC":                             "bg-violet-500/10 border-violet-200 dark:bg-violet-500/20 dark:border-violet-800",
  "Bases de Données":                "bg-fuchsia-500/10 border-fuchsia-200 dark:bg-fuchsia-500/20 dark:border-fuchsia-800",
};

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? "bg-muted border-border";
}

const SUBJECT_EMOJIS: Record<string, string> = {
  "Mathématiques": "📐", "Physique-Chimie": "⚗️", "Sciences Naturelles": "🌿", "SVT": "🔬",
  "Arabe": "📖", "Français": "🇫🇷", "Anglais": "🇬🇧", "Histoire-Géographie": "🌍",
  "Histoire": "📜", "Géographie": "🗺️",
  "Informatique": "💻", "Philosophie": "🧠", "Économie": "📊", "Gestion": "📋", "Économie / Gestion": "💼",
  "Comptabilité": "🧾", "Technologie": "⚙️", "Technique": "⚙️", "Sport": "🏃",
  "Éducation Islamique": "☪️", "Éducation Civique": "🏛️",
  "Allemand": "🇩🇪", "Italien": "🇮🇹", "Espagnol": "🇪🇸",
  "Éducation Artistique": "🎨", "Éducation Musicale": "🎵",
  "Sciences de l'Ingénieur": "🔧",
  "Génie Électrique": "⚡", "Génie Mécanique": "⚙️",
  "Algorithmique et Programmation": "🧮",
  "Systèmes d'exploitation et Réseaux": "🌐", "TIC": "📡",
  "Bases de Données": "🗄️",
};

export function RevisionHub() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const gradeLevel: string = (user as any)?.studentProfile?.gradeLevel ?? "";
  const educationSection: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  if (!gradeLevel) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold">{t("revision.chapters.levelNotSet")}</h2>
          <p className="text-muted-foreground">
            {t("revision.chapters.configureLevel")}{" "}
            <Link href="/student/settings" className="text-primary underline underline-offset-2">
              {t("revisionPages.hub.levelNotDefinedDesc")}
            </Link>
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Section-level (2ème, 3ème, Bac) with no section chosen yet
  if (isSectionLevel(gradeLevel) && !educationSection) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold">Choisissez votre filière</h2>
          <p className="text-muted-foreground">
            Pour voir les matières de{" "}
            <span className="font-semibold">{getNiveauLabel(gradeLevel)}</span>,
            configurez votre filière dans{" "}
            <Link href="/student/settings" className="text-primary underline underline-offset-2">
              vos paramètres
            </Link>.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const sectionKey = isSectionLevel(gradeLevel) ? educationSection : null;
  const allSubjects = getSubjectsForNiveauSection(gradeLevel, sectionKey) as readonly string[];
  const subjects = allSubjects.filter(
    s => getFallbackChapters(gradeLevel, s, sectionKey).length > 0,
  );
  const gradeLabel = getNiveauLabel(gradeLevel);
  const sectionLabel = sectionKey ? getSectionLabel(gradeLevel, sectionKey) : null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <BookOpen className="w-4 h-4" />
            <span>{t("revision.breadcrumb.hub")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("revision.breadcrumb.hub")}</h1>
          <p className="text-muted-foreground mt-1">
            {gradeLabel}{sectionLabel ? ` — ${sectionLabel}` : ""} · {t("revisionPages.hub.chooseSubject")}
          </p>
        </div>

        {/* Subject grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjects.map(subject => (
            <Link
              key={subject}
              href={`/revision/${subjectToSlug(subject)}`}
              className={`group flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${getSubjectColor(subject)}`}
            >
              <span className="text-3xl">{SUBJECT_EMOJIS[subject] ?? "📚"}</span>
              <div>
                <p className="font-semibold text-sm leading-snug text-gray-900">{subject}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-700 opacity-60 group-hover:opacity-100 transition-opacity mt-auto">
                <span>{t("revisionPages.hub.revise")}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
