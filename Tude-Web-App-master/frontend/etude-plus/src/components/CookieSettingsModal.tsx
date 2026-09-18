import { useState } from "react";
import { X } from "lucide-react";
import { useCookieConsent, CookieConsent } from "@/hooks/useCookieConsent";
import { trackEvent } from "@/lib/analytics";

interface Props {
  onClose: () => void;
}

export function CookieSettingsModal({ onClose }: Props) {
  const { consent, acceptAll, rejectAll, saveCustom } = useCookieConsent();

  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);

  function handleSave() {
    saveCustom({ analytics, marketing });
    trackEvent("cookies_customized", { analytics, advertising: marketing });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Paramètres des cookies</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Necessary */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Cookies nécessaires</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authentification, sécurité, préférences de session. Toujours actifs.
              </p>
            </div>
            <div className="w-10 h-6 bg-primary/30 rounded-full flex items-center justify-end px-1 cursor-not-allowed shrink-0">
              <div className="w-4 h-4 rounded-full bg-primary/50" />
            </div>
          </div>

          {/* Analytics */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Cookies analytiques</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nous aident à comprendre comment vous utilisez Étude+ pour améliorer nos services.
              </p>
            </div>
            <button
              onClick={() => setAnalytics(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${analytics ? "bg-primary justify-end" : "bg-muted justify-start"}`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow" />
            </button>
          </div>

          {/* Marketing */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Cookies marketing</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permettent de vous proposer des contenus personnalisés.
              </p>
            </div>
            <button
              onClick={() => setMarketing(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${marketing ? "bg-primary justify-end" : "bg-muted justify-start"}`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={() => { rejectAll(); trackEvent("cookies_rejected"); onClose(); }}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
          >
            Tout refuser
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Enregistrer
          </button>
          <button
            onClick={() => { acceptAll(); trackEvent("cookies_accepted"); onClose(); }}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}
