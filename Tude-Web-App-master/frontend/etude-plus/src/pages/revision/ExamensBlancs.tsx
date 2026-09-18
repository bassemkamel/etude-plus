import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Premium";
import { Link, useRoute } from "wouter";
import { BookOpen, ChevronRight, FileText, Trophy, BarChart3, ArrowRight } from "lucide-react";
import { subjectToSlug, subjectFromSlug } from "@/lib/educationConfig";
import { cn } from "@/lib/utils";

export function ExamensBlancs() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/examens-blancs");
  const subject = params?.subject ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject)) : "";
  const subjectSlug = subjectToSlug(subject);

  const OPTIONS = [
    {
      icon: FileText,
      title: t("revisionPages.examensBlancs.questionBank"),
      description: t("revisionPages.examensBlancs.questionBankDesc"),
      href: "banque-de-questions",
      color: "bg-blue-500/10 border-blue-200 dark:bg-blue-500/20 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400",
      badge: t("revisionPages.examensBlancs.recommended"),
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    },
    {
      icon: Trophy,
      title: t("revisionPages.examensBlancs.officialAnnales"),
      description: t("revisionPages.examensBlancs.officialAnnalesDesc"),
      href: "annales",
      color: "bg-amber-500/10 border-amber-200 dark:bg-amber-500/20 dark:border-amber-800",
      iconColor: "text-amber-600 dark:text-amber-400",
      badge: t("revisionPages.examensBlancs.popular"),
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    },
    {
      icon: BarChart3,
      title: t("revisionPages.examensBlancs.myProgress"),
      description: t("revisionPages.examensBlancs.myProgressDesc"),
      href: "/student/progress",
      color: "bg-green-500/10 border-green-200 dark:bg-green-500/20 dark:border-green-800",
      iconColor: "text-green-600 dark:text-green-400",
      badge: null as string | null,
      badgeColor: "",
      absolute: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 flex-wrap">
            <BookOpen className="w-4 h-4" />
            <Link href="/revision" className="hover:text-foreground transition-colors">{t("revisionPages.examensBlancs.breadcrumbHub")}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${subjectSlug}`} className="hover:text-foreground transition-colors">{subject}</Link>
            <ChevronRight className="w-3 h-3" />
            <span>{t("revisionPages.examensBlancs.breadcrumbSection")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("revisionPages.examensBlancs.title", { subject })}</h1>
          <p className="text-muted-foreground mt-1">
            {t("revisionPages.examensBlancs.subtitle")}
          </p>
        </div>

        {/* Option cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {OPTIONS.map((opt) => {
            const href = (opt as any).absolute ? opt.href : `/revision/${subjectSlug}/${opt.href}`;
            return (
              <Link key={opt.title} href={href}>
                <Card className={cn(
                  "group flex flex-col gap-4 p-6 h-full cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-2",
                  opt.color
                )}>
                  <div className="flex items-start justify-between">
                    <div className={cn("w-11 h-11 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center", opt.iconColor)}>
                      <opt.icon className="w-6 h-6" />
                    </div>
                    {opt.badge && (
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", opt.badgeColor)}>
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{opt.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{opt.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    <span>{t("revisionPages.examensBlancs.start")}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
