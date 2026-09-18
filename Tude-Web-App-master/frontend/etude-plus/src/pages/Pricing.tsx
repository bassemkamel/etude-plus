import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/layout/Navbar";
import { MathBackground } from "@/components/ui/MathBackground";
import { FadeIn, Button } from "@/components/ui/Premium";
import { CheckCircle, ArrowRight, BookOpen, GraduationCap, Shield, HelpCircle } from "lucide-react";

const COURSE_EXAMPLES = [
  { subject: "Mathématiques Terminale", range: "500+ questions", noteKey: "noteExercises" },
  { subject: "Physique-Chimie Bac",     range: "400+ questions", noteKey: "noteExercises" },
  { subject: "Arabe Collège",           range: "300+ questions", noteKey: "noteGrammar" },
  { subject: "Anglais Avancé",          range: "350+ questions", noteKey: "noteVocab" },
  { subject: "SVT Terminale",           range: "450+ questions", noteKey: "noteExercises" },
];

export function Pricing() {
  const { t } = useTranslation();

  const studentFeatures: string[] = t("pricing.student.features", { returnObjects: true }) as string[];
  const platformFeatures: string[] = t("pricing.platform.features", { returnObjects: true }) as string[];
  const faqItems: { q: string; a: string }[] = t("pricing.faq.items", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <div className="min-h-screen bg-[#FFFDF7] relative overflow-x-hidden">
      <MathBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(245,158,11,0.09) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      <Navbar />

      <main className="relative pt-28" style={{ zIndex: 1 }}>
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center py-20">
          <FadeIn>
            <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-4">
              {t("pricing.hero.badge")}
            </p>
            <h1 className="text-5xl sm:text-6xl font-serif font-bold text-gray-900 mb-6 leading-tight">
              {t("pricing.hero.title1")}{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("pricing.hero.titleHighlight")}
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              {t("pricing.hero.subtitle")}
            </p>
          </FadeIn>
        </section>

        {/* ── PRICING CARDS ─────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Student card */}
            <FadeIn delay={0}>
              <div className="rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 p-8 h-full flex flex-col shadow-lg shadow-amber-100">
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                    <GraduationCap className="w-6 h-6 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{t("pricing.student.title")}</h2>
                  <p className="text-gray-500 text-sm">{t("pricing.student.subtitle")}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-gray-900">{t("pricing.student.price")}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {t("pricing.student.priceDesc")}
                  </p>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {Array.isArray(studentFeatures) && studentFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/select-role">
                  <Button size="lg" className="w-full font-bold shadow-md shadow-amber-400/20">
                    {t("pricing.student.cta")} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </FadeIn>

            {/* Platform card */}
            <FadeIn delay={0.15}>
              <div
                className="rounded-3xl p-8 h-full flex flex-col shadow-2xl relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)" }}
              >
                {/* Symbol background in card */}
                <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none select-none">
                  {["Σ","π","∞"].map((c, i) => (
                    <span key={i} style={{ position:"absolute", left:`${15+i*35}%`, top:i%2===0?"5%":"55%", fontSize:80, color:"#f59e0b", fontFamily:"serif", fontWeight:700 }}>{c}</span>
                  ))}
                </div>

                <div className="relative z-10 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-white">{t("pricing.platform.title")}</h2>
                    <span className="text-xs font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                      {t("pricing.platform.badge")}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{t("pricing.platform.subtitle")}</p>
                </div>

                <div className="relative z-10 mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">{t("pricing.platform.price")}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {t("pricing.platform.priceDesc")}
                  </p>
                </div>

                <ul className="space-y-3 flex-1 mb-8 relative z-10">
                  {Array.isArray(platformFeatures) && platformFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="relative z-10">
                  <Link href="/select-role">
                    <Button size="lg" className="w-full font-bold shadow-lg shadow-amber-400/20">
                      {t("pricing.platform.cta")} <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── COURSE PRICE EXAMPLES ─────────────────────────── */}
        <section className="bg-white/70 backdrop-blur-sm border-y border-gray-100 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <FadeIn>
              <div className="text-center mb-12">
                <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">
                  {t("pricing.content.badge")}
                </p>
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">
                  {t("pricing.content.title")}
                </h2>
                <p className="text-gray-500 max-w-lg mx-auto">
                  {t("pricing.content.subtitle")}
                </p>
              </div>
            </FadeIn>
            <div className="space-y-4">
              {COURSE_EXAMPLES.map((ex, i) => (
                <FadeIn key={i} delay={0.08 * i}>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-amber-50/60 border border-amber-200/50">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{ex.subject}</p>
                        <p className="text-xs text-gray-400">{t(`pricing.content.${ex.noteKey}`)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-700">{ex.range}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRUST BANNER ──────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-6">
            {([
              { icon: Shield,        key: "verified", color: "#10b981" },
              { icon: CheckCircle,   key: "upToDate", color: "#f59e0b" },
              { icon: GraduationCap, key: "national", color: "#3b82f6" },
            ] as const).map((item, i) => (
              <FadeIn key={i} delay={0.1 * i}>
                <div className="text-center p-6 rounded-2xl bg-white/60 border border-gray-100 shadow-sm">
                  <item.icon className="w-8 h-8 mx-auto mb-3" style={{ color: item.color }} />
                  <h3 className="font-bold text-gray-900 mb-1">{t(`pricing.trust.${item.key}.title`)}</h3>
                  <p className="text-sm text-gray-500">{t(`pricing.trust.${item.key}.desc`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">
                {t("pricing.faq.badge")}
              </p>
              <h2 className="text-3xl font-serif font-bold text-gray-900">{t("pricing.faq.title")}</h2>
            </div>
          </FadeIn>
          <div className="space-y-4">
            {Array.isArray(faqItems) && faqItems.map((faq, i) => (
              <FadeIn key={i} delay={0.08 * i}>
                <div className="p-6 rounded-2xl bg-white/70 border border-gray-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">{faq.q}</p>
                      <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section
          className="mx-4 sm:mx-8 lg:mx-20 mb-20 rounded-3xl p-12 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}
        >
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none select-none">
            {["∑","π","∞","∫"].map((c, i) => (
              <span key={i} style={{ position:"absolute", left:`${5+i*25}%`, top:i%2===0?"0%":"50%", fontSize:100, color:"#fff", fontFamily:"serif", fontWeight:700 }}>{c}</span>
            ))}
          </div>
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
              {t("pricing.cta.title")}
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
              {t("pricing.cta.subtitle")}
            </p>
            <Link href="/select-role">
              <button className="inline-flex items-center gap-2 bg-white text-amber-700 font-bold text-lg px-10 py-4 rounded-2xl shadow-xl hover:bg-amber-50 transition-colors">
                {t("pricing.cta.btn")} <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </FadeIn>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white/60 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xl font-serif font-bold text-gray-900">Étude<span style={{ color: "#f59e0b" }}>+</span></span>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-amber-600 transition-colors">{t("pricing.footer.home")}</Link>
            <Link href="/about" className="hover:text-amber-600 transition-colors">{t("pricing.footer.about")}</Link>
            <Link href="/login" className="hover:text-amber-600 transition-colors">{t("pricing.footer.login")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
