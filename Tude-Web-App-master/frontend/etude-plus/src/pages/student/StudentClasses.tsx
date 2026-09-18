import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge, Input } from "@/components/ui/Premium";
import { useGetMyEnrollments } from "@workspace/api-client-react";
import { BookOpen, Search, Filter, PlayCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export function StudentClasses() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: enrollments, isLoading } = useGetMyEnrollments();

  const activeClasses = (enrollments ?? [])
    .filter(e => e.status === "active" || e.status === "paid")
    .map(e => e.class)
    .filter((c): c is NonNullable<typeof c> => c != null);

  const filtered = activeClasses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase()) ||
    (c.professor?.fullName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("student.classes.title")}
          description={t("student.classes.description")}
          action={
            <Link href="/student/browse">
              <Button>{t("student.classes.exploreMore")}</Button>
            </Link>
          }
        />

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t("student.classes.searchPlaceholder")}
              className="pl-12 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="shrink-0 bg-card">
            <Filter className="w-5 h-5 mr-2" /> {t("student.classes.subjects")}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map(i => <div key={i} className="h-56 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {search ? t("student.classes.noFound") : t("student.classes.notEnrolled")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {search
                ? t("student.classes.noResultsFor", { search })
                : t("student.classes.browseToFind")}
            </p>
            <Link href="/student/browse">
              <Button>{t("student.classes.discover")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((cls, i) => (
              <FadeIn key={cls.id} delay={i * 0.05}>
                <Card className="flex flex-col h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                  <div className="h-32 bg-gradient-to-br from-secondary to-muted p-4 flex flex-col justify-between border-b border-border">
                    <Badge className="w-fit">{cls.subject}</Badge>
                    <h3 className="font-serif font-bold text-xl leading-tight mt-auto text-foreground">{cls.title}</h3>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="font-semibold text-sm mb-4">Prof. {cls.professor?.fullName}</p>

                    {cls.nextSession ? (
                      <div className="bg-primary/5 rounded-xl p-3 mb-6 flex items-start gap-3 border border-primary/10">
                        <PlayCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">{t("student.classes.nextSession")}</p>
                          <p className="text-sm font-medium line-clamp-1">{cls.nextSession.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(cls.nextSession.scheduledAt), "d MMM 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-secondary rounded-xl p-3 mb-6 border border-border">
                        <p className="text-sm text-muted-foreground text-center">{t("student.classes.noSession")}</p>
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-border/50">
                      <Link href={`/student/classes/${cls.id}`}>
                        <Button className="w-full">{t("student.classes.accessCourse")}</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </FadeIn>
            ))}
          </div>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
