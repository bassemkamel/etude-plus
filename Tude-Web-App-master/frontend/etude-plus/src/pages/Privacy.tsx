import { useEffect } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

export function Privacy() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Politique de confidentialité — Étude+";
    return () => { document.title = "Étude+"; };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-amber-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-serif font-bold text-gray-900">Étude<span style={{ color: "#f59e0b" }}>+</span></span>
          </Link>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-6">
          {t("legal.legalDocument")}
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#1a1a2e] mb-4">Politique de confidentialité</h1>
        <p className="text-gray-500 text-sm mb-2">Dernière mise à jour : Mars 2025</p>
        <p className="text-gray-600 mt-8 max-w-xl mx-auto leading-relaxed">
          Étude+ collecte et traite vos données personnelles conformément à la loi tunisienne n°2004-63
          du 27 juillet 2004 portant sur la protection des données personnelles. Vos données sont utilisées
          uniquement pour le fonctionnement de la plateforme et ne sont jamais vendues à des tiers.
        </p>
        <p className="text-gray-500 mt-4 text-sm">
          Pour toute demande relative à vos données :{" "}
          <a href="mailto:privacy@etude-plus.tn" className="text-amber-600 hover:underline font-medium">
            privacy@etude-plus.tn
          </a>
        </p>
        <p className="mt-8 text-sm text-gray-400">
          Une politique de confidentialité complète sera publiée prochainement.
        </p>
        <div className="mt-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-amber-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("legal.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
