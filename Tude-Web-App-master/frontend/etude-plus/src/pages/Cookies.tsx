import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Cookie, Shield, BarChart2, Megaphone, Settings } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { CookieSettingsModal } from "@/components/CookieSettingsModal";

export function Cookies() {
  const { t } = useTranslation();
  const { consent, resetConsent } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      {showSettings && <CookieSettingsModal onClose={() => setShowSettings(false)} />}

      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("legal.backHome")}
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold">Politique des cookies</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Dernière mise à jour : mars 2026</p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none space-y-8 text-foreground">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                Étude+ utilise des cookies et technologies similaires pour assurer le bon fonctionnement de la plateforme,
                mémoriser vos préférences, et améliorer votre expérience. Cette page vous explique ce que sont les cookies,
                comment nous les utilisons et comment vous pouvez les contrôler.
              </p>
            </section>

            {/* Necessary */}
            <section className="bg-muted/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Cookies nécessaires</h2>
                <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {t("legal.alwaysActive")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Ces cookies sont indispensables au fonctionnement d'Étude+. Ils ne peuvent pas être désactivés.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-2 font-medium">Nom</th>
                    <th className="pb-2 font-medium">Durée</th>
                    <th className="pb-2 font-medium">Finalité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 font-mono text-primary">etude_session</td>
                    <td className="py-2 text-muted-foreground">Session / 30 j</td>
                    <td className="py-2 text-muted-foreground">Authentification sécurisée (httpOnly)</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-primary">etude_auth_token</td>
                    <td className="py-2 text-muted-foreground">Session</td>
                    <td className="py-2 text-muted-foreground">Jeton d'authentification (localStorage)</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-primary">etude_cookie_consent</td>
                    <td className="py-2 text-muted-foreground">1 an</td>
                    <td className="py-2 text-muted-foreground">Mémorisation de vos préférences de cookies</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Analytics */}
            <section className="bg-muted/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <BarChart2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Cookies analytiques</h2>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${consent?.analytics ? "text-green-600 bg-green-50" : "text-muted-foreground bg-muted"}`}>
                  {consent?.analytics ? t("legal.enabled") : t("legal.disabled")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Ces cookies nous aident à comprendre comment vous utilisez Étude+ afin d'améliorer nos services.
                Les données sont anonymisées et ne permettent pas de vous identifier personnellement.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-2 font-medium">Service</th>
                    <th className="pb-2 font-medium">Durée</th>
                    <th className="pb-2 font-medium">Finalité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 font-mono text-primary">_ga, _ga_*</td>
                    <td className="py-2 text-muted-foreground">2 ans</td>
                    <td className="py-2 text-muted-foreground">Google Analytics — mesure d'audience</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Marketing */}
            <section className="bg-muted/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Cookies marketing</h2>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${consent?.marketing ? "text-green-600 bg-green-50" : "text-muted-foreground bg-muted"}`}>
                  {consent?.marketing ? t("legal.enabled") : t("legal.disabled")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ces cookies permettent de vous proposer des publicités et contenus personnalisés en fonction de vos centres d'intérêt.
                Nous n'utilisons actuellement pas de cookies marketing tiers.
              </p>
            </section>

            {/* Your rights */}
            <section>
              <h2 className="text-xl font-semibold mb-3">Vos droits</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Conformément au RGPD et à la loi tunisienne sur la protection des données personnelles, vous pouvez à tout moment
                modifier vos préférences de cookies. Vous pouvez également exercer vos droits d'accès, de rectification et de suppression
                en nous contactant à <a href="mailto:privacy@etude-plus.tn" className="text-primary hover:underline">privacy@etude-plus.tn</a>.
              </p>
            </section>
          </div>

          {/* Manage button */}
          <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">{t("legal.managePreferences")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Modifiez vos choix de cookies à tout moment.</p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
            >
              <Settings className="w-4 h-4" />
              {t("legal.customize")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
