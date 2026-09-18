import { useState } from "react";
import { Link } from "wouter";
import { Cookie } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { CookieSettingsModal } from "./CookieSettingsModal";
import { trackEvent } from "@/lib/analytics";

export function CookieBanner() {
  const { bannerVisible, acceptAll, rejectAll } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);

  if (!bannerVisible) return null;

  return (
    <>
      {showSettings && <CookieSettingsModal onClose={() => setShowSettings(false)} />}

      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto bg-background border border-border rounded-2xl shadow-2xl p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1">Nous utilisons des cookies</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Étude+ utilise des cookies pour assurer le bon fonctionnement de la plateforme, mémoriser votre connexion et améliorer votre expérience.{" "}
                <Link href="/cookies" className="text-primary hover:underline">
                  En savoir plus
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 justify-end">
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Personnaliser
            </button>
            <button
              onClick={() => { rejectAll(); trackEvent("cookies_rejected"); }}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Tout refuser
            </button>
            <button
              onClick={() => { acceptAll(); trackEvent("cookies_accepted"); }}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
