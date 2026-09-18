import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { MathBackground } from "@/components/ui/MathBackground";
import { FadeIn, Button } from "@/components/ui/Premium";
import {
  Target, Heart, Shield, BookOpen, Zap,
  GraduationCap, Award, Globe, ArrowRight
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function About() {
  const { t } = useTranslation();

  const VALUES = [
    { icon: Target, key: "excellence", color: "#f59e0b", bg: "bg-amber-50 border-amber-200/60" },
    { icon: Heart,  key: "kindness",   color: "#f97316", bg: "bg-orange-50 border-orange-200/60" },
    { icon: Shield, key: "trust",      color: "#10b981", bg: "bg-emerald-50 border-emerald-200/60" },
    { icon: Globe,  key: "access",     color: "#3b82f6", bg: "bg-blue-50 border-blue-200/60" },
  ];

  const TEAM_HIGHLIGHTS = [
    { icon: GraduationCap, key: "highlight1" },
    { icon: Award,         key: "highlight2" },
    { icon: BookOpen,      key: "highlight3" },
    { icon: Zap,           key: "highlight4" },
  ];

  const TIMELINE = [
    { key: "item1" },
    { key: "item2" },
    { key: "item3" },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF7] relative overflow-x-hidden">
      <MathBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 100% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      <Navbar />

      <main className="relative pt-28" style={{ zIndex: 1 }}>
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center py-20">
          <FadeIn>
            <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-4">
              {t("about.hero.label")}
            </p>
            <h1 className="text-5xl sm:text-6xl font-serif font-bold text-gray-900 mb-6 leading-tight">
              {t("about.hero.title1")}
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("about.hero.title2")}
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t("about.hero.subtitle")}
            </p>
          </FadeIn>
        </section>

        {/* ── MISSION BLOCK ─────────────────────────────────── */}
        <section
          className="mx-4 sm:mx-8 lg:mx-20 mb-20 rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)" }}
        >
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none select-none">
            {["π","∞","Σ","Δ","∫","√"].map((c, i) => (
              <span key={i} style={{ position:"absolute", left:`${8+i*16}%`, top:i%2===0?"5%":"60%", fontSize:90, color:"#f59e0b", fontFamily:"serif", fontWeight:700 }}>{c}</span>
            ))}
          </div>
          <FadeIn>
            <BookOpen className="w-12 h-12 mx-auto mb-6 text-amber-400" />
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-5">
              {t("about.mission.title")}
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              {t("about.mission.body")}
            </p>
          </FadeIn>
        </section>

        {/* ── VALUES ────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <FadeIn>
            <div className="text-center mb-14">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">
                {t("about.values.label")}
              </p>
              <h2 className="text-4xl font-serif font-bold text-gray-900">
                {t("about.values.title")}
              </h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => (
              <FadeIn key={v.key} delay={0.1 * i}>
                <div className={`rounded-2xl p-7 border ${v.bg} h-full`}>
                  <v.icon className="w-8 h-8 mb-4" style={{ color: v.color }} />
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    {t(`about.values.${v.key}.title`)}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {t(`about.values.${v.key}.desc`)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── TIMELINE ──────────────────────────────────────── */}
        <section className="bg-white/70 backdrop-blur-sm border-y border-gray-100 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <FadeIn>
              <div className="text-center mb-14">
                <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">
                  {t("about.timeline.label")}
                </p>
                <h2 className="text-4xl font-serif font-bold text-gray-900">
                  {t("about.timeline.title")}
                </h2>
              </div>
            </FadeIn>
            <div className="space-y-10 relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-amber-200" />
              {TIMELINE.map((item, i) => (
                <FadeIn key={item.key} delay={0.15 * i}>
                  <div className="flex gap-8 items-start">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs text-center relative z-10 shadow-md"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
                    >
                      {t(`about.timeline.${item.key}.short`)}
                    </div>
                    <div className="pt-2">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ background: "#fef3c7", color: "#b45309" }}
                        >
                          {t(`about.timeline.${item.key}.year`)}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {t(`about.timeline.${item.key}.title`)}
                        </h3>
                      </div>
                      <p className="text-gray-500 leading-relaxed">
                        {t(`about.timeline.${item.key}.desc`)}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── TEAM HIGHLIGHTS ───────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">
                {t("about.team.label")}
              </p>
              <h2 className="text-4xl font-serif font-bold text-gray-900">
                {t("about.team.title")}
              </h2>
              <p className="text-gray-500 mt-4 max-w-xl mx-auto">
                {t("about.team.subtitle")}
              </p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-5">
            {TEAM_HIGHLIGHTS.map((h, i) => (
              <FadeIn key={h.key} delay={0.1 * i}>
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-200/60">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
                    <h.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-gray-800">{t(`about.team.${h.key}`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="mx-4 sm:mx-8 lg:mx-20 mb-20 text-center py-16 rounded-3xl bg-white/60 border border-gray-100 shadow-sm">
          <FadeIn>
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">
              {t("about.cta.title")}
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {t("about.cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/select-role">
                <Button size="lg" className="font-bold px-8 shadow-md shadow-amber-400/20">
                  {t("landing.cta.register")} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">{t("landing.cta.pricing")}</Button>
              </Link>
            </div>
          </FadeIn>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white/60 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xl font-serif font-bold text-gray-900">Étude<span style={{ color: "#f59e0b" }}>+</span></span>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-amber-600 transition-colors">{t("about.footer.home")}</Link>
            <Link href="/pricing" className="hover:text-amber-600 transition-colors">{t("about.footer.pricing")}</Link>
            <Link href="/login" className="hover:text-amber-600 transition-colors">{t("about.footer.login")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
