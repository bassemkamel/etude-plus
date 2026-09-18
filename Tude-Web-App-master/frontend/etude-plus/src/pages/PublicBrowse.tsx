import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { MathBackground } from "@/components/ui/MathBackground";
import { FadeIn, Button, Input, Badge } from "@/components/ui/Premium";
import { useListClasses } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Search, Star, Clock, MapPin, BookOpen, Filter, ArrowRight,
  GraduationCap, FlaskConical, Globe, Calculator, Cpu, Feather
} from "lucide-react";
import { formatTND, cn } from "@/lib/utils";
import { isCycleEnabled } from "@/lib/educationConfig";

const CURRICULUM_SUBJECTS = [
  { name: "Mathématiques",  icon: Calculator,  color: "#f59e0b", bg: "bg-amber-50 border-amber-200", tag: "Sciences" },
  { name: "Physique",       icon: FlaskConical, color: "#f97316", bg: "bg-orange-50 border-orange-200", tag: "Sciences" },
  { name: "Chimie",         icon: FlaskConical, color: "#10b981", bg: "bg-emerald-50 border-emerald-200", tag: "Sciences" },
  { name: "Sciences de la vie et de la terre", icon: BookOpen, color: "#22c55e", bg: "bg-green-50 border-green-200", tag: "Sciences" },
  { name: "Informatique",   icon: Cpu,  color: "#3b82f6", bg: "bg-blue-50 border-blue-200", tag: "Technologie" },
  { name: "Français",       icon: Feather, color: "#8b5cf6", bg: "bg-violet-50 border-violet-200", tag: "Lettres" },
  { name: "Arabe",          icon: Feather, color: "#ec4899", bg: "bg-pink-50 border-pink-200", tag: "Lettres" },
  { name: "Anglais",        icon: Globe, color: "#06b6d4", bg: "bg-cyan-50 border-cyan-200", tag: "Langues" },
  { name: "Histoire-Géographie", icon: Globe, color: "#f59e0b", bg: "bg-yellow-50 border-yellow-200", tag: "Sciences Humaines" },
  { name: "Philosophie",    icon: Feather, color: "#a855f7", bg: "bg-purple-50 border-purple-200", tag: "Sciences Humaines" },
  { name: "Économie",       icon: Calculator, color: "#0ea5e9", bg: "bg-sky-50 border-sky-200", tag: "Sciences Humaines" },
  { name: "Comptabilité",   icon: Calculator, color: "#14b8a6", bg: "bg-teal-50 border-teal-200", tag: "Sciences Humaines" },
];

export function PublicBrowse() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(t("publicBrowse.allLevels"));
  const [showFilters, setShowFilters] = useState(false);

  const GRADE_LEVELS = [
    t("publicBrowse.allLevels"),
    // Primaire and Collège hidden — re-enable by adding "college" to ENABLED_CYCLES in educationConfig.ts
    ...(!isCycleEnabled("college") ? [] : ["Collège 7ème", "Collège 8ème", "Collège 9ème"]),
    "Lycée 1ère année", "Lycée 2ème année", "3ème année secondaire",
    "Baccalauréat",
  ];

  const { data, isLoading } = useListClasses({
    search: search || undefined,
    subject: selectedSubject ?? undefined,
    gradeLevel: selectedLevel !== t("publicBrowse.allLevels") ? selectedLevel : undefined,
  });

  const classes = (data?.classes ?? []) as any[];

  const enrollHref = (classId: number) =>
    user ? `/checkout/${classId}` : "/select-role";

  return (
    <div className="min-h-screen bg-[#FFFDF7] relative overflow-x-hidden">
      <MathBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(245,158,11,0.07) 0%, transparent 70%)", zIndex: 0 }}
      />
      <Navbar />

      <main className="relative pt-28" style={{ zIndex: 1 }}>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center py-16">
          <FadeIn>
            <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-4">Curriculum officiel tunisien</p>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-gray-900 mb-4">
              Explorer tous les{" "}
              <span style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                cours disponibles
              </span>
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Trouvez un professeur pour chaque matière du programme scolaire tunisien — du primaire au baccalauréat.
            </p>
          </FadeIn>
        </section>

        {/* Search + filters */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un cours, une matière, un professeur..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white shadow-sm text-sm outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300"
              />
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-semibold text-sm transition-colors shadow-sm",
                showFilters ? "bg-amber-500 text-white border-amber-500" : "bg-white border-gray-200 text-gray-700 hover:border-amber-300"
              )}
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Niveau scolaire</p>
              <div className="flex flex-wrap gap-2">
                {GRADE_LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      selectedLevel === level
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-amber-300"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Subject categories */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Matières</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject(null)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                !selectedSubject
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-amber-300"
              )}
            >
              Toutes les matières
            </button>
            {CURRICULUM_SUBJECTS.map(s => (
              <button
                key={s.name}
                onClick={() => setSelectedSubject(s.name === selectedSubject ? null : s.name)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                  selectedSubject === s.name
                    ? "shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:border-amber-300"
                )}
                style={selectedSubject === s.name ? { background: s.color, color: "#fff", borderColor: s.color } : {}}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.name}
              </button>
            ))}
          </div>
        </section>

        {/* Results */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-72 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-600 mb-2">Aucun cours disponible</h3>
              <p className="text-gray-400 text-sm">
                {search || selectedSubject ? "Essayez d'autres filtres." : "Les cours des professeurs vérifiés apparaîtront ici."}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-5 font-medium">
                {classes.length} cours {selectedSubject ? `en ${selectedSubject}` : "disponibles"}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls: any, i: number) => {
                  const subjectInfo = CURRICULUM_SUBJECTS.find(s => s.name === cls.subject);
                  return (
                    <FadeIn key={cls.id} delay={i * 0.04}>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden">
                        {/* Card header */}
                        <div
                          className="h-36 p-5 flex flex-col justify-between relative overflow-hidden"
                          style={{ background: subjectInfo ? `linear-gradient(135deg, ${subjectInfo.color}15, ${subjectInfo.color}08)` : "linear-gradient(135deg, #f9f9f9, #f0f0f0)" }}
                        >
                          <div className="flex items-start justify-between">
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: `${subjectInfo?.color ?? "#f59e0b"}20`, color: subjectInfo?.color ?? "#f59e0b" }}
                            >
                              {cls.subject}
                            </span>
                            <span className="text-sm font-bold text-gray-700 bg-white/80 backdrop-blur px-2.5 py-1 rounded-lg border border-gray-100">
                              {formatTND(cls.price)}/s.
                            </span>
                          </div>
                          <h3 className="font-serif font-bold text-lg text-gray-900 leading-tight">{cls.title}</h3>
                        </div>

                        {/* Card body */}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                              style={{ background: `linear-gradient(135deg,#f59e0b,#f97316)` }}
                            >
                              {cls.professor?.fullName?.charAt(0) ?? "?"}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-800">{cls.professor?.fullName}</p>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {cls.professor?.rating ?? "Nouveau"}
                                <span>&bull;</span>
                                <MapPin className="w-3 h-3" />
                                {cls.city}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{cls.description}</p>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-2">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              {cls.durationHours}h
                              <span className="mx-1">&bull;</span>
                              <GraduationCap className="w-4 h-4" />
                              <span className="truncate max-w-[80px]">{cls.gradeLevel}</span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Link href={user ? `/student/classes/${cls.id}` : `/login`}>
                                <button className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:border-amber-300 transition-colors">
                                  Détails
                                </button>
                              </Link>
                              <Link href={enrollHref(cls.id)}>
                                <button
                                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg flex items-center gap-1"
                                  style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}
                                >
                                  {user ? "S'inscrire" : "Connexion"} <ArrowRight className="w-3 h-3" />
                                </button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* CTA if not logged in */}
        {!user && (
          <section
            className="mx-4 sm:mx-8 lg:mx-16 mb-20 rounded-3xl p-10 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}
          >
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3">
              Prêt à commencer ?
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Inscrivez-vous gratuitement pour accéder aux cours et vous inscrire auprès de professeurs vérifiés.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/select-role">
                <Button size="lg" className="font-bold px-8">
                  Créer un compte gratuit <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                  Se connecter
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
