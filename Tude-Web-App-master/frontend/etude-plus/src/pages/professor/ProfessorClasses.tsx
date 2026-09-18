import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge } from "@/components/ui/Premium";
import { Plus, Users, Settings, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "";

function useMyClasses() {
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("etude_auth_token");
    if (!token) { setIsLoading(false); return; }
    fetch(`${API_URL}/classes/my-classes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setClasses(d.classes ?? []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);
  return { classes, isLoading };
}

export function ProfessorClasses() {
  const { t } = useTranslation();
  const { classes, isLoading } = useMyClasses();

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("prof.classes.title")}
          description={t("prof.classes.description")}
          action={
            <Link href="/professor/create-class">
              <Button><Plus className="w-5 h-5 mr-2" /> {t("prof.classes.newCourse")}</Button>
            </Link>
          }
        />

        {isLoading ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-9 h-9 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t("prof.classes.noClasses")}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {t("prof.classes.noClassesDesc")}
            </p>
            <Link href="/professor/create-class">
              <Button><Plus className="w-4 h-4 mr-2" /> {t("prof.classes.createFirst")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {classes.map((cls) => (
              <Card key={cls.id} className="p-6 flex flex-col sm:flex-row gap-6 relative overflow-hidden group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant={cls.isPublished ? "success" : "secondary"}>
                      {cls.isPublished ? t("prof.classes.published") : t("prof.classes.draft")}
                    </Badge>
                    <span className="text-sm font-semibold text-muted-foreground uppercase">{cls.subject}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{cls.title}</h3>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 text-primary" /> {cls.enrolledCount ?? 0} {t("prof.classes.students")}
                    </div>
                    <div className="font-bold text-foreground">
                      {cls.price} TND / {t("prof.classes.session")}
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col justify-end gap-3 shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6">
                  <Link href={`/professor/classes/${cls.id}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" /> {t("prof.classes.manage")}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
