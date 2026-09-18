import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/layout/Navbar";
import { Button, FadeIn } from "@/components/ui/Premium";
import { BookOpen, BarChart3, Sparkles, ArrowRight } from "lucide-react";

export function SelectRole() {
  const { t } = useTranslation();

  const features = [
    { icon: BookOpen,  textKey: "selectRole.feature1" },
    { icon: Sparkles,  textKey: "selectRole.feature2" },
    { icon: BarChart3, textKey: "selectRole.feature3" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-math-pattern opacity-[0.03] pointer-events-none" />
      <Navbar />

      <main className="flex-1 flex items-center justify-center pt-20 pb-16 px-4 relative z-10">
        <div className="w-full max-w-md text-center">
          <FadeIn>
            {/* Brand mark */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <span className="font-serif font-bold text-3xl text-primary">É</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">
              {t("selectRole.welcome")} <span className="text-primary">Étude+</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {t("selectRole.subtitle")}
            </p>

            {/* Feature list */}
            <ul className="space-y-3 mb-10 text-left">
              {features.map(({ icon: Icon, textKey }) => (
                <li key={textKey} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t(textKey)}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link href="/register">
              <Button size="lg" className="w-full gap-2 text-base">
                {t("selectRole.cta")}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <p className="mt-6 text-sm text-muted-foreground">
              {t("selectRole.alreadyRegistered")}{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                {t("selectRole.login")}
              </Link>
            </p>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
