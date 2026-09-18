import { useState } from "react";
import { useRoute, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, FadeIn, Button, Badge } from "@/components/ui/Premium";
import { useGetProfessor } from "@workspace/api-client-react";
import { getToken } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getNiveauLabel } from "@/lib/educationConfig";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Star, BadgeCheck, MapPin, GraduationCap, Clock, BookOpen,
  ChevronLeft, Users, Award, MessageSquare, Send, Loader2,
  ChevronRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Auth fetch helper ─────────────────────────────────────────────────────────

async function apiFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  return data;
}

// ── Star display ──────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm", interactive = false, onRate }: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const sz = size === "lg" ? "w-7 h-7" : size === "md" ? "w-5 h-5" : "w-4 h-4";
  const active = interactive ? (hover || rating) : rating;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={cn(
            sz,
            n <= active ? "fill-amber-400 text-amber-400" : "text-gray-200",
            interactive && "cursor-pointer transition-colors"
          )}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(n)}
        />
      ))}
    </div>
  );
}

// ── Rating bar ────────────────────────────────────────────────────────────────

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-10 text-right text-muted-foreground shrink-0 text-xs">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-5 text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────

function CourseCard({ cls }: { cls: any }) {
  return (
    <Link href={`/student/browse/${cls.id}`}>
      <Card className="p-4 hover:shadow-md hover:border-primary/40 transition-all duration-200 cursor-pointer group h-full flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/20">
            {cls.subject}
          </span>
          <span className="text-sm font-bold text-primary shrink-0">
            {cls.price === 0 ? "Gratuit" : `${cls.price} DT`}
          </span>
        </div>
        <h4 className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
          {cls.title}
        </h4>
        {cls.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{cls.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.durationHours}h</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.enrolledCount ?? 0} élèves</span>
          <ChevronRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Card>
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProfessorProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, params] = useRoute("/student/professor/:id");
  const profId = params?.id ? parseInt(params.id) : 0;

  // Review form state
  const [myRating, setMyRating]     = useState(0);
  const [myComment, setMyComment]   = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: profData, isLoading: profLoading } = useGetProfessor(profId, {
    query: { enabled: !!profId } as any,
  });
  const prof = profData as any;

  const { data: classesData } = useQuery({
    queryKey: ["prof-classes", profId],
    enabled: !!profId,
    queryFn: () =>
      apiFetch(`${API_URL}/classes?professorId=${profId}&isPublished=true`),
  });
  const classes: any[] = classesData?.classes ?? [];

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["prof-reviews", profId],
    enabled: !!profId,
    queryFn: () =>
      fetch(`${API_URL}/reviews?professorId=${profId}`)
        .then(r => (r.ok ? r.json() : [])),
  });

  const alreadyReviewed = reviews.some((r: any) => r.student?.id === user?.id);

  // ── Review submission ─────────────────────────────────────────────────────

  const submitReview = useMutation({
    mutationFn: () =>
      apiFetch(`${API_URL}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          professorId: profId,
          rating: myRating,
          comment: myComment.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prof-reviews", profId] });
      qc.invalidateQueries({ queryKey: ["/api/professors", profId] });
      toast({ title: "Avis publié !", description: "Merci pour votre retour." });
      setMyRating(0);
      setMyComment("");
      setShowReviewForm(false);
    },
    onError: (e: any) => {
      const msg = e.message?.toLowerCase() ?? "";
      toast({
        title: msg.includes("already") ? "Déjà évalué" : "Erreur",
        description: msg.includes("already")
          ? "Vous avez déjà soumis un avis pour ce professeur."
          : e.message,
        variant: "destructive",
      });
    },
  });

  // ── Loading / not found ───────────────────────────────────────────────────

  if (profLoading || !prof) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const rating = prof.rating ? Number(prof.rating) : null;
  const totalReviews = Number(prof.totalReviews ?? 0);

  // Rating breakdown
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    label: `${star} ★`,
    count: reviews.filter((r: any) => Math.round(r.rating) === star).length,
  }));

  return (
    <DashboardLayout>
      <FadeIn>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back link */}
          <Link
            href="/student/browse"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour aux professeurs
          </Link>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <Card className="p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-bold text-4xl text-primary border-4 border-background shadow-xl">
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
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-3 border-background shadow-md">
                    <BadgeCheck className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{prof.fullName}</h1>
                    {prof.isVerified && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Vérifié
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  {prof.city && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {prof.city}
                    </p>
                  )}
                </div>

                {/* Subjects */}
                {prof.subjects?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {prof.subjects.map((s: string) => (
                      <span
                        key={s}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Grade levels */}
                {prof.gradeLevels?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap text-sm text-muted-foreground">
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    {prof.gradeLevels.map((k: string) => getNiveauLabel(k)).join(" · ")}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-5 flex-wrap pt-1">
                  {rating !== null && (
                    <div className="flex items-center gap-1.5">
                      <Stars rating={rating} size="md" />
                      <span className="font-bold text-gray-900">{rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({totalReviews} avis)</span>
                    </div>
                  )}
                  {(prof.yearsOfExperience ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Award className="w-4 h-4 text-amber-500" />
                      {prof.yearsOfExperience} an{prof.yearsOfExperience > 1 ? "s" : ""} d'expérience
                    </div>
                  )}
                  {classes.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      {classes.length} cours disponible{classes.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* ── About ─────────────────────────────────────────────────────── */}
          {prof.bio && (
            <Card className="p-6 space-y-4">
              <h2 className="font-bold text-lg">À propos</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{prof.bio}</p>
              <div className="grid sm:grid-cols-2 gap-6 pt-2 border-t border-border">
                {prof.subjects?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                      Matières enseignées
                    </h3>
                    <ul className="space-y-1">
                      {prof.subjects.map((s: string) => (
                        <li key={s} className="text-sm text-gray-800 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {prof.gradeLevels?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                      Niveaux enseignés
                    </h3>
                    <ul className="space-y-1">
                      {prof.gradeLevels.map((k: string) => (
                        <li key={k} className="text-sm text-gray-800 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {getNiveauLabel(k)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── Courses ───────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Cours publiés
            </h2>
            {classes.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
                <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Ce professeur n'a pas encore publié de cours.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls: any) => (
                  <CourseCard key={cls.id} cls={cls} />
                ))}
              </div>
            )}
          </div>

          {/* ── Reviews ───────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold text-xl flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Avis des élèves
              </h2>
              {user?.role === "student" && !alreadyReviewed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviewForm(f => !f)}
                  className="gap-2"
                >
                  <Star className="w-4 h-4" />
                  Laisser un avis
                </Button>
              )}
            </div>

            {/* Leave a review form */}
            {showReviewForm && !alreadyReviewed && (
              <Card className="p-6 border-primary/30 bg-primary/2 space-y-4">
                <h3 className="font-semibold">Votre avis sur {prof.fullName}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Note</p>
                  <Stars rating={myRating} size="lg" interactive onRate={setMyRating} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Commentaire (optionnel)</p>
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    rows={3}
                    placeholder="Partagez votre expérience avec ce professeur…"
                    className="flex w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => submitReview.mutate()}
                    isLoading={submitReview.isPending}
                    disabled={myRating === 0}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Soumettre mon avis
                  </Button>
                  <Button variant="ghost" onClick={() => setShowReviewForm(false)}>
                    Annuler
                  </Button>
                </div>
              </Card>
            )}

            {alreadyReviewed && (
              <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
                ✓ Vous avez déjà soumis un avis pour ce professeur.
              </div>
            )}

            {/* Overall rating */}
            {totalReviews > 0 && rating !== null && (
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Big rating */}
                  <div className="text-center shrink-0">
                    <div className="text-6xl font-bold text-gray-900">{rating.toFixed(1)}</div>
                    <Stars rating={rating} size="md" />
                    <p className="text-sm text-muted-foreground mt-1">{totalReviews} avis</p>
                  </div>
                  {/* Breakdown bars */}
                  <div className="flex-1 space-y-2 w-full">
                    {ratingCounts.map(rc => (
                      <RatingBar key={rc.label} label={rc.label} count={rc.count} total={totalReviews} />
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Review list */}
            {reviews.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-2xl border border-dashed border-border">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun avis pour le moment.</p>
                {user?.role === "student" && !alreadyReviewed && (
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Soyez le premier à laisser un avis !
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <Card key={review.id} className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Student avatar */}
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground border border-border shrink-0 overflow-hidden">
                        {review.student?.profilePhoto ? (
                          <img
                            src={`${API_URL}/storage${review.student.profilePhoto}`}
                            alt={review.student.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          review.student?.fullName?.charAt(0) ?? "É"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">
                            {review.student?.fullName ?? "Élève anonyme"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        <Stars rating={Number(review.rating)} size="sm" />
                        {review.comment && (
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
