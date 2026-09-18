import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge, Input } from "@/components/ui/Premium";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Search, Star, BookOpen, GraduationCap, X, BadgeCheck,
  Users, ChevronRight, MapPin, Filter, SlidersHorizontal,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getNiveauLabel, getSubjectsForNiveauSection, isSimpleLevel, isSectionLevel } from "@/lib/educationConfig";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortOption = "rating" | "recent" | "reviews";

interface Professor {
  id: number;
  userId: number;
  fullName: string;
  profilePhoto?: string | null;
  city?: string | null;
  bio?: string | null;
  subjects: string[];
  gradeLevels: string[];
  rating?: number | null;
  totalReviews?: number | null;
  isVerified?: boolean | null;
  yearsOfExperience?: number | null;
  status: string;
  createdAt?: string;
}

// ── Star display ──────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={cn(sz, n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200")}
        />
      ))}
    </div>
  );
}

// ── Professor Card ────────────────────────────────────────────────────────────

function ProfessorCard({ prof }: { prof: Professor }) {
  const rating = prof.rating ? Number(prof.rating) : null;
  const visibleSubjects = prof.subjects?.slice(0, 3) ?? [];
  const extraSubjects = (prof.subjects?.length ?? 0) - 3;

  return (
    <Card className="flex flex-col h-full hover:shadow-lg hover:border-primary/40 transition-all duration-300 group">
      {/* Header */}
      <div className="p-6 flex flex-col items-center text-center border-b border-border">
        {/* Avatar */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-bold text-2xl text-primary border-4 border-background shadow-lg">
            {prof.profilePhoto ? (
              <img
                src={`${API_URL}/storage${prof.profilePhoto}`}
                alt={prof.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{prof.fullName?.charAt(0) ?? "?"}</span>
            )}
          </div>
          {prof.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Name + verified */}
        <div className="flex items-center gap-1.5 justify-center flex-wrap">
          <h3 className="font-bold text-base text-gray-900">{prof.fullName}</h3>
          {prof.isVerified && (
            <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
          )}
        </div>

        {/* City */}
        {prof.city && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />
            {prof.city}
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-2 mt-3">
          {rating !== null ? (
            <>
              <Stars rating={rating} />
              <span className="font-bold text-sm text-gray-900">{rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({prof.totalReviews ?? 0} avis)
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">Nouveau professeur</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Subjects */}
        {visibleSubjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleSubjects.map(s => (
              <span
                key={s}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/20"
              >
                {s}
              </span>
            ))}
            {extraSubjects > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                +{extraSubjects}
              </span>
            )}
          </div>
        )}

        {/* Bio preview */}
        {prof.bio && (
          <p className="text-sm text-gray-700 line-clamp-2 flex-1">{prof.bio}</p>
        )}

        {/* Grade levels */}
        {(prof.gradeLevels?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              {prof.gradeLevels
                .slice(0, 4)
                .map(k => getNiveauLabel(k))
                .join(", ")}
              {prof.gradeLevels.length > 4 && ` +${prof.gradeLevels.length - 4}`}
            </span>
          </div>
        )}

        {/* Experience */}
        {prof.yearsOfExperience != null && prof.yearsOfExperience > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {prof.yearsOfExperience} an{prof.yearsOfExperience > 1 ? "s" : ""} d'expérience
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <Link href={`/student/professor/${prof.id}`}>
          <Button className="w-full gap-2 group-hover:gap-3 transition-all" size="sm">
            Voir le profil
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function BrowseClasses() {
  const { user } = useAuth();
  const studentGrade: string = (user as any)?.studentProfile?.gradeLevel ?? "";
  const studentSection: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  const levelSubjects: readonly string[] = studentGrade
    ? getSubjectsForNiveauSection(
        studentGrade,
        isSectionLevel(studentGrade) ? studentSection : null,
      )
    : [];

  const [search, setSearch]       = useState("");
  const [subject, setSubject]     = useState("");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy]       = useState<SortOption>("rating");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all approved professors
  const { data, isLoading } = useQuery({
    queryKey: ["professors", "approved"],
    queryFn: () => apiFetch(`${API_URL}/professors?status=approved`),
    staleTime: 2 * 60 * 1000,
  });
  const allProfs: Professor[] = (data as any)?.professors ?? [];

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...allProfs];

    // Restrict to student's grade level (if set)
    if (studentGrade) {
      list = list.filter(p =>
        p.gradeLevels?.some(gl => gl === studentGrade)
      );
    }

    // Subject filter
    if (subject) {
      list = list.filter(p =>
        p.subjects?.some(s => s.toLowerCase() === subject.toLowerCase())
      );
    }

    // Search (name or subject)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.fullName?.toLowerCase().includes(q) ||
        p.subjects?.some(s => s.toLowerCase().includes(q)) ||
        p.bio?.toLowerCase().includes(q)
      );
    }

    // Min rating filter
    if (minRating !== null) {
      list = list.filter(p => p.rating != null && Number(p.rating) >= minRating);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "rating")  return Number(b.rating ?? 0) - Number(a.rating ?? 0);
      if (sortBy === "reviews") return Number(b.totalReviews ?? 0) - Number(a.totalReviews ?? 0);
      // recent
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

    return list;
  }, [allProfs, studentGrade, subject, search, minRating, sortBy]);

  const hasFilters = !!subject || minRating !== null || sortBy !== "rating";
  const clearFilters = () => { setSubject(""); setMinRating(null); setSortBy("rating"); };

  const gradeLabel = studentGrade ? getNiveauLabel(studentGrade) : null;

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title="Parcourir les Professeurs"
          description="Découvrez les professeurs disponibles pour votre niveau scolaire."
        />

        {/* No grade set — prompt */}
        {!studentGrade && (
          <div className="mb-6 p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1">Définissez votre niveau scolaire</h4>
              <p className="text-sm text-amber-700 mb-3">
                En renseignant votre niveau, nous affichons uniquement les professeurs qui enseignent à votre classe.
              </p>
              <a href="/student/settings" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 underline">
                Configurer mon niveau →
              </a>
            </div>
          </div>
        )}

        {/* Grade banner */}
        {gradeLabel && (
          <div className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl w-fit">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Professeurs enseignant en <strong>{gradeLabel}</strong>
            </span>
          </div>
        )}

        {/* Search + filter bar */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un professeur, une matière…"
                className="pl-12 bg-card"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className={cn("shrink-0 bg-card gap-2", hasFilters && "border-primary text-primary")}
              onClick={() => setShowFilters(f => !f)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {hasFilters && (
                <span className="ml-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {[subject, minRating, sortBy !== "rating" ? sortBy : ""].filter(Boolean).length}
                </span>
              )}
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-muted-foreground gap-1">
                <X className="w-4 h-4" /> Réinitialiser
              </Button>
            )}
          </div>

          {showFilters && (
            <Card className="p-4">
              <div className="grid sm:grid-cols-3 gap-4">
                {/* Subject */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Matière
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary transition-all"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  >
                    <option value="">Toutes les matières</option>
                    {levelSubjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Min rating */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Note minimale
                  </label>
                  <div className="flex gap-2">
                    {[null, 3, 4, 4.5].map(r => (
                      <button
                        key={String(r)}
                        onClick={() => setMinRating(r)}
                        className={cn(
                          "flex-1 h-10 rounded-lg border text-xs font-semibold transition-all",
                          minRating === r
                            ? "bg-amber-400 text-white border-amber-400"
                            : "bg-background border-border text-muted-foreground hover:border-amber-300"
                        )}
                      >
                        {r === null ? "Tous" : `★ ${r}+`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Trier par
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary transition-all"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                  >
                    <option value="rating">Mieux notés</option>
                    <option value="reviews">Plus d'avis</option>
                    <option value="recent">Plus récents</option>
                  </select>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-9 h-9 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Aucun professeur trouvé</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {allProfs.length === 0
                ? "Les professeurs rejoignant Étude+ apparaîtront ici."
                : "Modifiez vos filtres pour voir plus de résultats."}
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} professeur{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((prof, i) => (
                <FadeIn key={prof.id} delay={i * 0.04}>
                  <ProfessorCard prof={prof} />
                </FadeIn>
              ))}
            </div>
          </>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
