import { useState } from "react";
import { useRoute, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, FadeIn, Button, Badge } from "@/components/ui/Premium";
import { useTranslation } from "react-i18next";
import {
  Star, MapPin, Clock, BookOpen, Users, FileText, Video,
  Lock, ChevronLeft, MessageSquare, ThumbsUp, Award,
} from "lucide-react";
import { useGetClass, useListClassMaterials, useListClassSessions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatTND } from "@/lib/utils";

function StarsDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-6 h-6" : size === "md" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`${sz} ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-12 text-right text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-muted-foreground shrink-0">{count}</span>
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function CoursePreview() {
  const { t } = useTranslation();
  const [, params] = useRoute("/student/browse/:id");
  const classId = params?.id ? parseInt(params.id) : 0;
  const [activeReviewTab, setActiveReviewTab] = useState<"course" | "professor">("course");

  const { data: cls, isLoading } = useGetClass(classId, { query: { enabled: !!classId } as any });
  const { data: materials = [] } = useListClassMaterials(classId, { query: { enabled: !!classId } as any }) as any;
  const { data: sessions = [] } = useListClassSessions(classId, { query: { enabled: !!classId } as any }) as any;

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["class-reviews", classId],
    enabled: !!classId,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/reviews?classId=${classId}`);
      return res.ok ? res.json() : [];
    },
  });

  if (isLoading || !cls) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-muted rounded-xl" />
          <div className="h-60 bg-muted rounded-2xl" />
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const prof = cls.professor as any;
  const profRating = prof?.rating ? Number(prof.rating) : null;
  const courseRating = (cls as any).courseRating ? Number((cls as any).courseRating) : null;
  const upcomingSessions = (sessions as any[]).filter((s: any) => s.status === "scheduled" || s.status === "live");

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    label: `${star} ★`,
    count: reviews.filter((r: any) => Math.round(r.rating) === star).length,
  }));

  return (
    <DashboardLayout>
      <FadeIn>
        <Link href="/student/browse" className="text-sm font-medium text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {t("student.coursePreview.backToCourses")}
        </Link>

        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary rounded-3xl p-8 mb-8 border border-border">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge>{cls.subject}</Badge>
              <Badge variant="secondary">{cls.gradeLevel}</Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {cls.city}
              </Badge>
            </div>
            <h1 className="text-3xl font-serif font-bold mb-3">{cls.title}</h1>
            <p className="text-muted-foreground mb-6 text-lg">{cls.description}</p>

            <div className="flex flex-wrap items-center gap-6 mb-6">
              {courseRating !== null && (
                <div className="flex items-center gap-2">
                  <StarsDisplay rating={courseRating} size="md" />
                  <span className="font-bold">{courseRating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">({(cls as any).totalCourseReviews} {t("student.coursePreview.reviewsCourse")})</span>
                </div>
              )}
              {profRating !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="w-4 h-4 text-amber-500" />
                  {t("student.coursePreview.profRating", { rating: profRating.toFixed(1) })}
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" /> {cls.durationHours}h par session
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <p className="text-3xl font-bold text-primary">{formatTND(cls.price)}</p>
                <p className="text-xs text-muted-foreground">{t("student.coursePreview.perSession")}</p>
              </div>
              <Link href={`/checkout/${cls.id}`}>
                <Button size="lg" className="px-8">
                  {t("student.coursePreview.enrollNow")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">

            {/* What's inside — teaser */}
            <Card className="p-6">
              <h2 className="font-bold text-xl mb-5">{t("student.coursePreview.courseContents")}</h2>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {[
                  { icon: FileText, label: t("student.coursePreview.materials"), count: materials.length },
                  { icon: Video, label: t("student.coursePreview.liveSessions"), count: sessions.length },
                  { icon: Users, label: t("student.coursePreview.enrolledStudents"), count: cls.enrolledCount ?? 0 },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 bg-secondary/50 rounded-2xl">
                    <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Blurred preview of materials */}
              {materials.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("student.coursePreview.materialsPreview")}</p>
                  <div className="space-y-2">
                    {(materials as any[]).slice(0, 3).map((m: any, i: number) => (
                      <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border ${i > 0 ? "opacity-40 blur-[2px] select-none" : ""}`}>
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium flex-1 truncate">{i > 0 ? "•••••• ••••••••" : m.title}</p>
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                    {materials.length > 3 && (
                      <div className="text-center py-3 text-sm text-muted-foreground">
                        {t("student.coursePreview.moreAfterEnroll", { count: materials.length - 3 })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upcoming sessions teaser */}
              {upcomingSessions.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("student.coursePreview.nextSession")}</p>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-primary font-bold uppercase">
                        {format(new Date(upcomingSessions[0].scheduledAt), "MMM", { locale: fr })}
                      </span>
                      <span className="text-lg font-bold text-primary leading-none">
                        {new Date(upcomingSessions[0].scheduledAt).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{upcomingSessions[0].title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(upcomingSessions[0].scheduledAt), "EEEE d MMMM à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-sm font-semibold text-amber-800 mb-2">{t("student.coursePreview.enrollToAccess")}</p>
                <Link href={`/checkout/${cls.id}`}>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                    {t("student.coursePreview.enrollFor", { price: formatTND(cls.price) })}
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Reviews section */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-xl">{t("student.coursePreview.reviews")}</h2>
                <span className="text-muted-foreground text-sm">({reviews.length} {t("student.coursePreview.reviews")})</span>
              </div>

              {/* Tabs: course vs professor */}
              <div className="flex gap-1 mb-6 p-1 bg-muted rounded-xl w-fit">
                {[
                  { id: "course" as const, label: t("student.coursePreview.course") },
                  { id: "professor" as const, label: t("student.coursePreview.professor") },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveReviewTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeReviewTab === tab.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Rating summary */}
              {reviews.length > 0 && (
                <div className="flex gap-8 mb-8 p-5 bg-secondary/50 rounded-2xl">
                  <div className="text-center shrink-0">
                    <p className="text-5xl font-bold text-primary">
                      {(activeReviewTab === "course" ? courseRating : profRating)?.toFixed(1) ?? "—"}
                    </p>
                    <StarsDisplay rating={activeReviewTab === "course" ? (courseRating ?? 0) : (profRating ?? 0)} size="md" />
                    <p className="text-xs text-muted-foreground mt-1">{reviews.length} avis</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {ratingCounts.map(({ label, count }) => (
                      <RatingBar key={label} label={label} count={count} total={reviews.length} />
                    ))}
                  </div>
                </div>
              )}

              {/* Review list */}
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 opacity-20 mx-auto mb-3" />
                  <p className="font-semibold">{t("student.coursePreview.noReviews")}</p>
                  <p className="text-sm mt-1">{t("student.coursePreview.firstReview")}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="flex gap-4 pb-5 border-b border-border last:border-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                        {r.student?.profilePhoto
                          ? <img src={`${API_URL}/storage${r.student.profilePhoto}`} alt="" className="w-full h-full object-cover rounded-full" />
                          : r.student?.fullName?.charAt(0) ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm">{r.student?.fullName ?? "Élève"}</p>
                          <p className="text-xs text-muted-foreground shrink-0">
                            {r.createdAt ? format(new Date(r.createdAt), "d MMM yyyy", { locale: fr }) : ""}
                          </p>
                        </div>
                        <StarsDisplay rating={r.rating} />
                        {r.comment && (
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.comment}</p>
                        )}
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
                          <ThumbsUp className="w-3 h-3" /> {t("student.coursePreview.helpful")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Professor card */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">{t("student.coursePreview.yourProfessor")}</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-bold text-primary text-xl shrink-0">
                  {prof?.profilePhoto
                    ? <img src={`${API_URL}/storage${prof.profilePhoto}`} alt="" className="w-full h-full object-cover" />
                    : prof?.fullName?.charAt(0) ?? "?"}
                </div>
                <div>
                  <p className="font-bold">{prof?.fullName}</p>
                  {prof?.city && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{prof.city}</p>}
                </div>
              </div>

              {profRating !== null && (
                <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 rounded-xl">
                  <StarsDisplay rating={profRating} size="md" />
                  <span className="font-bold text-amber-700">{profRating.toFixed(1)}</span>
                  <span className="text-xs text-amber-600">({prof?.totalReviews ?? 0} avis)</span>
                </div>
              )}

              <div className="flex gap-4 text-center mb-4">
                {prof?.totalStudents != null && (
                  <div className="flex-1 p-3 bg-secondary/50 rounded-xl">
                    <p className="text-xl font-bold">{prof.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">{t("student.coursePreview.students")}</p>
                  </div>
                )}
                {prof?.totalReviews != null && (
                  <div className="flex-1 p-3 bg-secondary/50 rounded-xl">
                    <p className="text-xl font-bold">{prof.totalReviews}</p>
                    <p className="text-xs text-muted-foreground">avis</p>
                  </div>
                )}
              </div>

              {prof?.bio && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("student.coursePreview.biography")}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{prof.bio}</p>
                </div>
              )}

              {prof?.qualifications && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("student.coursePreview.qualifications")}</p>
                  <p className="text-sm font-medium">{prof.qualifications}</p>
                </div>
              )}

              {prof?.subjects?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {prof.subjects.map((s: string) => (
                    <span key={s} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{s}</span>
                  ))}
                </div>
              )}
            </Card>

            {/* Sticky CTA */}
            <Card className="p-6 sticky top-24 border-primary/30 shadow-lg shadow-primary/5">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-primary">{formatTND(cls.price)}</p>
                <p className="text-sm text-muted-foreground">{t("student.coursePreview.perSession")}</p>
              </div>
              <Link href={`/checkout/${cls.id}`}>
                <Button size="lg" className="w-full mb-3">{t("student.coursePreview.enrollNow")}</Button>
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                {t("student.coursePreview.immediateAccess")}
              </p>
              {courseRating !== null && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-2">
                  <StarsDisplay rating={courseRating} />
                  <span className="text-sm font-semibold">{courseRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({(cls as any).totalCourseReviews} avis)</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
