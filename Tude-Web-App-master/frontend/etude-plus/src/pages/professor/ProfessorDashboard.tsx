import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button } from "@/components/ui/Premium";
import { useAuth } from "@/hooks/use-auth";
import { useGetProfessorStats } from "@workspace/api-client-react";
import { Users, BookOpen, DollarSign, Star, ArrowUpRight, Video, ShieldCheck, Clock, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatTND } from "@/lib/utils";
import { Link } from "wouter";
import { AnnouncementsWidget } from "@/components/shared/AnnouncementsWidget";
import { useTranslation } from "react-i18next";

function KYCStateBanner({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "approved") return null;

  const config = {
    pending: {
      icon: <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4" />,
      title: t("prof.dashboard.kycPendingTitle"),
      desc: t("prof.dashboard.kycPendingDesc"),
      badge: "bg-amber-50 border-amber-200 text-amber-900",
      cta: t("prof.dashboard.kycPendingCta"),
      ctaVariant: "default" as const,
    },
    kyc_submitted: {
      icon: <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />,
      title: t("prof.dashboard.kycSubmittedTitle"),
      desc: t("prof.dashboard.kycSubmittedDesc"),
      badge: "bg-blue-50 border-blue-200 text-blue-900",
      cta: t("prof.dashboard.kycSubmittedCta"),
      ctaVariant: "outline" as const,
    },
    rejected: {
      icon: <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />,
      title: t("prof.dashboard.kycRejectedTitle"),
      desc: t("prof.dashboard.kycRejectedDesc"),
      badge: "bg-red-50 border-red-200 text-red-900",
      cta: t("prof.dashboard.kycRejectedCta"),
      ctaVariant: "default" as const,
    },
    needs_revision: {
      icon: <RefreshCw className="w-12 h-12 text-amber-500 mx-auto mb-4" />,
      title: t("prof.dashboard.kycRevisionTitle"),
      desc: t("prof.dashboard.kycRevisionDesc"),
      badge: "bg-amber-50 border-amber-200 text-amber-900",
      cta: t("prof.dashboard.kycRevisionCta"),
      ctaVariant: "default" as const,
    },
  };

  const cfg = config[status as keyof typeof config] ?? config.pending;

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader title={t("prof.dashboard.title")} description={t("prof.dashboard.welcomeDesc")} />
        <div className="max-w-2xl mx-auto">
          <Card className={cn("p-10 text-center border-2", cfg.badge)}>
            {cfg.icon}
            <h2 className="text-2xl font-bold mb-3">{cfg.title}</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">{cfg.desc}</p>
            <Link href="/professor/kyc">
              <Button size="lg" variant={cfg.ctaVariant} className="gap-2">
                {cfg.cta} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>

          <Card className="p-6 mt-6">
            <h3 className="font-bold mb-4">{t("prof.dashboard.stepsTitle")}</h3>
            <div className="space-y-3">
              {[
                { done: true, label: t("prof.dashboard.step1") },
                { done: status === "kyc_submitted" || status === "approved" || status === "needs_revision" || status === "rejected", active: status === "pending", label: t("prof.dashboard.step2") },
                { done: status === "approved", label: t("prof.dashboard.step3") },
                { done: false, label: t("prof.dashboard.step4") },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                    step.done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground border-2 border-border"
                  )}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <p className={cn("text-sm", step.done ? "text-green-700 font-medium" : "text-muted-foreground")}>{step.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}

export function ProfessorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const profId = (user as any)?.professorProfile?.id;
  const profStatus = (user as any)?.professorProfile?.status ?? "pending";

  const { data: stats, isLoading } = useGetProfessorStats(profId || 0, {
    query: { enabled: !!profId && profStatus === "approved" } as any
  });

  if (profStatus !== "approved") {
    return <KYCStateBanner status={profStatus} />;
  }

  const totalEarnings = stats?.totalEarnings ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;
  const totalClasses = stats?.totalClasses ?? 0;
  const averageRating = stats?.averageRating ?? 0;
  const earningsByMonth: { month: string; amount: number }[] = stats?.earningsByMonth ?? [];

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("prof.dashboard.title")}
          description={t("prof.dashboard.description")}
          action={
            <Link href="/professor/create-class">
              <Button>{t("prof.dashboard.createCourse")}</Button>
            </Link>
          }
        />

        <AnnouncementsWidget />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: t("prof.dashboard.totalEarnings"), value: formatTND(totalEarnings), icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
            { label: t("prof.dashboard.activeStudents"), value: totalStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
            { label: t("prof.dashboard.publishedCourses"), value: totalClasses, icon: BookOpen, color: "text-primary", bg: "bg-primary/20" },
            { label: t("prof.dashboard.avgRating"), value: averageRating > 0 ? `${averageRating}/5` : "—", icon: Star, color: "text-orange-500", bg: "bg-orange-100" },
          ].map((s, i) => (
            <Card key={i} className="p-6 border-none shadow-md shadow-black/5">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", s.bg)}>
                  <s.icon className={cn("w-6 h-6", s.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {isLoading ? <span className="text-muted-foreground text-base">...</span> : s.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">{t("prof.dashboard.earningsEvolution")}</h3>
              <Link href="/professor/earnings">
                <Button variant="ghost" size="sm" className="text-primary">
                  {t("prof.dashboard.fullReport")} <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {earningsByMonth.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earningsByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v}TND`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatTND(value), t("prof.dashboard.earnings")]}
                    />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">{t("prof.dashboard.noEarnings")}</p>
                <p className="text-sm mt-1">{t("prof.dashboard.noEarningsDesc")}</p>
              </div>
            )}
          </Card>

          <Card className="p-6 flex flex-col">
            <h3 className="font-bold text-lg mb-4">{t("prof.dashboard.quickActions")}</h3>
            <div className="space-y-3 flex-1">
              <Link href="/professor/classes" className="w-full">
                <Button variant="outline" className="w-full justify-start h-14 text-left">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mr-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  {t("prof.dashboard.manageCourses")}
                </Button>
              </Link>
              <Link href="/professor/create-class" className="w-full">
                <Button variant="outline" className="w-full justify-start h-14 text-left">
                  <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center mr-3">
                    <Video className="w-4 h-4 text-accent" />
                  </div>
                  {t("prof.dashboard.createNewCourse")}
                </Button>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">{t("prof.dashboard.accountStatus")}</h4>
              <div className="flex items-center gap-3 bg-green-50 text-green-700 p-3 rounded-xl border border-green-100">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="font-medium text-sm">{t("prof.dashboard.verifiedProfessor")}</span>
              </div>
            </div>
          </Card>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
