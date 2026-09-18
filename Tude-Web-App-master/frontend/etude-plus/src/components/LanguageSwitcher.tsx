import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "ar", label: "ع" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-amber-200/60 bg-amber-50/80 p-1 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      {LANGUAGES.map((lang) => {
        const active = i18n.language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={cn(
              "relative px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200",
              active
                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-400/30 scale-105"
                : "text-amber-700/70 hover:text-amber-800 hover:bg-amber-100/80"
            )}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}
