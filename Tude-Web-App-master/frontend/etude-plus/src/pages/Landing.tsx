import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/layout/Navbar";
import { Button, FadeIn } from "@/components/ui/Premium";
import { MathBackground } from "@/components/ui/MathBackground";
import { FloatingSymbols } from "@/components/ui/FloatingSymbols";
import { DeskHero } from "@/components/ui/LaptopHero";
import {
  ArrowRight, BookOpen, Video, Trophy,
  GraduationCap, CheckCircle, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";


export function Landing() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("live");

  const TABS = [
    {
      id: "live",
      label: t("landing.tabs.live.label"),
      icon: Video,
      color: "#f59e0b",
      title: t("landing.tabs.live.title"),
      subtitle: t("landing.tabs.live.subtitle"),
      points: [t("landing.tabs.live.point1"), t("landing.tabs.live.point2"), t("landing.tabs.live.point3")],
    },
    {
      id: "resources",
      label: t("landing.tabs.resources.label"),
      icon: BookOpen,
      color: "#fb923c",
      title: t("landing.tabs.resources.title"),
      subtitle: t("landing.tabs.resources.subtitle"),
      points: [t("landing.tabs.resources.point1"), t("landing.tabs.resources.point2"), t("landing.tabs.resources.point3")],
    },
    {
      id: "assessments",
      label: t("landing.tabs.assessments.label"),
      icon: Trophy,
      color: "#10b981",
      title: t("landing.tabs.assessments.title"),
      subtitle: t("landing.tabs.assessments.subtitle"),
      points: [t("landing.tabs.assessments.point1"), t("landing.tabs.assessments.point2"), t("landing.tabs.assessments.point3")],
    },
    {
      id: "dashboard",
      label: t("landing.tabs.dashboard.label"),
      icon: GraduationCap,
      color: "#3b82f6",
      title: t("landing.tabs.dashboard.title"),
      subtitle: t("landing.tabs.dashboard.subtitle"),
      points: [t("landing.tabs.dashboard.point1"), t("landing.tabs.dashboard.point2"), t("landing.tabs.dashboard.point3")],
    },
  ];

  const SUBJECTS = [
    t("landing.subjects.math"),
    t("landing.subjects.physics"),
    t("landing.subjects.chemistry"),
    t("landing.subjects.svt"),
    t("landing.subjects.arabic"),
    t("landing.subjects.french"),
    t("landing.subjects.english"),
    t("landing.subjects.histgeo"),
    t("landing.subjects.philosophy"),
    t("landing.subjects.computing"),
  ];


  return (
    <div className="min-h-screen bg-[#FFFDF7] relative overflow-x-hidden">
      {/* Full-page animated math/Greek symbol background */}
      <MathBackground />

      {/* Radial glow — top left */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 0% 10%, rgba(245,158,11,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 100% 90%, rgba(249,115,22,0.07) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      <Navbar />

      <main className="relative" style={{ zIndex: 1 }}>
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-24">
          {/* Interactive floating symbols — background layer only */}
          <FloatingSymbols />
          <div className="relative grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]" style={{ zIndex: 1 }}>
            {/* Left copy */}
            <FadeIn className="max-w-2xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-[#1a1a2e] leading-[1.08] mb-6 tracking-tight">
                <span
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 60%, #fb923c 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Étude+
                </span>
                {" "}{t("landing.hero.improves")}
                <br />
                {t("landing.hero.yourGrades")}
              </h1>

              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                {t("landing.hero.subtitle2")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/select-role">
                  <Button size="lg" className="w-full sm:w-auto text-lg font-bold px-8 group shadow-lg shadow-amber-400/25">
                    {t("landing.hero.cta")}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg bg-white/60 backdrop-blur border-gray-300">
                    {t("landing.hero.learnMore")}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {t("landing.trust.noCommitment")}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {t("landing.trust.kycCertified")}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {t("landing.trust.paymentTnd")}
                </div>
              </div>
            </FadeIn>

            {/* Right — academic workspace */}
            <FadeIn delay={0.2} className="relative hidden lg:flex items-center justify-center">
              {/* Ambient glow */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse 70% 60% at 55% 55%, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
              />

              <div className="relative">
                {/* Desk items row — items-end aligns everything to the desk surface */}
                <div className="flex items-end justify-center gap-5">

                  {/* Stacked books */}
                  <div className="flex flex-col">
                    {[
                      { bg: "#1c1c2e", w: 70, h: 20 },
                      { bg: "#f59e0b", w: 78, h: 22 },
                      { bg: "#fb923c", w: 74, h: 18 },
                    ].map((book, i) => (
                      <div
                        key={i}
                        style={{
                          width: book.w,
                          height: book.h,
                          background: book.bg,
                          borderRadius: 3,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                          marginBottom: 1,
                        }}
                      />
                    ))}
                  </div>

                  {/* Interactive 3-D laptop */}
                  <motion.div
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 80 }}
                  >
                    <DeskHero />
                  </motion.div>

                  {/* Small plant */}
                  <svg width="42" height="80" viewBox="0 0 42 80" fill="none" aria-hidden="true">
                    <line x1="21" y1="60" x2="21" y2="18" stroke="#3d7030" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M21 52 Q9 44 8 32 Q17 37 21 50 Z" fill="#4d8c3a" />
                    <path d="M21 44 Q33 36 34 24 Q25 31 21 43 Z" fill="#5a9e42" />
                    <path d="M21 36 Q11 26 13 14 Q21 22 21 34 Z" fill="#4d8c3a" opacity="0.85" />
                    <path d="M21 36 Q31 28 29 16 Q21 24 21 34 Z" fill="#5a9e42" opacity="0.85" />
                    <rect x="8" y="58" width="26" height="6" rx="3" fill="#b87a55" />
                    <path d="M10 64 L6 80 H36 L32 64 Z" fill="#c4885f" />
                  </svg>

                </div>

                {/* Desk surface */}
                <div
                  style={{
                    height: 9,
                    background: "linear-gradient(to right, rgba(215,195,160,0.5), rgba(235,216,180,0.9), rgba(215,195,160,0.5))",
                    borderRadius: "0 0 6px 6px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.07)",
                  }}
                />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── SUBJECTS TICKER ──────────────────────────────── */}
        <div className="border-y border-amber-200/60 bg-amber-50/60 py-5 overflow-hidden">
          <div className="flex gap-8 animate-[slide-left_20s_linear_infinite] whitespace-nowrap">
            {[...SUBJECTS, ...SUBJECTS].map((s, i) => (
              <span key={i} className="text-sm font-semibold text-amber-700 flex items-center gap-2 shrink-0">
                <span style={{ color: "#f59e0b" }}>∑</span> {s}
              </span>
            ))}
          </div>
        </div>


        {/* ── FEATURES TABS ─────────────────────────────────── */}
        <section id="features" className="bg-white/70 backdrop-blur-sm py-24 border-y border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">{t("landing.features.sectionLabel")}</p>
                <h2 className="text-4xl font-serif font-bold text-gray-900">{t("landing.features.sectionTitle")}</h2>
              </div>
            </FadeIn>

            {/* Tab buttons */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-amber-500 text-white shadow-md shadow-amber-400/30"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {TABS.filter((tab) => tab.id === activeTab).map((tab) => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid md:grid-cols-2 gap-12 items-center bg-white rounded-3xl border border-gray-100 shadow-sm p-10 sm:p-14"
              >
                <div className="flex items-center justify-center order-2 md:order-1">
                  <div
                    className="w-48 h-48 rounded-3xl flex items-center justify-center shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${tab.color}18, ${tab.color}35)`,
                      border: `1.5px solid ${tab.color}30`,
                    }}
                  >
                    <tab.icon className="w-24 h-24" style={{ color: tab.color }} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{tab.title}</h3>
                  <p className="text-gray-500 mb-7 leading-relaxed">{tab.subtitle}</p>
                  <ul className="space-y-3">
                    {tab.points.map((pt, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                        <CheckCircle className="w-5 h-5 shrink-0" style={{ color: tab.color }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────── */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-4 sm:px-6 py-24">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">{t("landing.howItWorks.sectionLabel")}</p>
              <h2 className="text-4xl font-serif font-bold text-gray-900">{t("landing.howItWorks.sectionTitle")}</h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-10 relative">
            {[
              { step: "01", title: t("landing.howItWorks.step1Title"), desc: t("landing.howItWorks.step1Desc") },
              { step: "02", title: t("landing.howItWorks.step2Title"), desc: t("landing.howItWorks.step2Desc") },
              { step: "03", title: t("landing.howItWorks.step3Title"), desc: t("landing.howItWorks.step3Desc") },
            ].map((step, i) => (
              <FadeIn key={i} delay={0.15 * i}>
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center font-bold text-xl"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #f97316)",
                      color: "#fff",
                      boxShadow: "0 8px 24px rgba(245,158,11,0.25)",
                    }}
                  >
                    {step.step}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ────────────────────────────────────── */}
        <section className="mx-4 sm:mx-8 lg:mx-16 mb-20 rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
          {/* Symbol overlay on CTA */}
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none select-none">
            {["Σ","π","∞","∫","Δ","√"].map((c, i) => (
              <span key={i} style={{ position:"absolute", left:`${10 + i * 15}%`, top: i%2===0?"10%":"55%", fontSize: 80, color:"#f59e0b", fontFamily:"serif", fontWeight:700, opacity:0.6 }}>{c}</span>
            ))}
          </div>
          <div className="relative z-10 px-10 py-16 text-center">
            <p className="text-amber-400 font-bold text-sm uppercase tracking-widest mb-4">{t("landing.cta.label")}</p>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-5">
              {t("landing.cta.title")}
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              {t("landing.cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/select-role">
                <Button size="lg" className="font-bold px-8 shadow-lg shadow-amber-400/20">
                  {t("landing.cta.register")} <ChevronRight className="ml-1 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                  {t("landing.cta.pricing")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/60 py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif font-bold text-gray-900">Étude<span style={{ color: "#f59e0b" }}>+</span></span>
            <span className="text-gray-400 text-sm">{t("landing.footer.tagline")}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/about" className="hover:text-amber-600 transition-colors">{t("landing.footer.about")}</Link>
            <Link href="/pricing" className="hover:text-amber-600 transition-colors">{t("landing.footer.pricing")}</Link>
            <Link href="/terms" className="hover:text-amber-600 transition-colors">{t("landing.footer.terms")}</Link>
            <Link href="/privacy" className="hover:text-amber-600 transition-colors">{t("landing.footer.privacy")}</Link>
            <Link href="/cookies" className="hover:text-amber-600 transition-colors">{t("landing.footer.cookies")}</Link>
            <a href="mailto:support@etude-plus.tn" className="hover:text-amber-600 transition-colors">{t("landing.footer.contact")}</a>
            <Link href="/login" className="hover:text-amber-600 transition-colors">{t("landing.footer.login")}</Link>
          </div>
          <p className="text-xs text-gray-400">{t("landing.footer.copyright")}</p>
        </div>
      </footer>
    </div>
  );
}
