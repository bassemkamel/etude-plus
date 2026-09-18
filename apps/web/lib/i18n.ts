import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "../messages/fr.json";
import en from "../messages/en.json";
import ar from "../messages/ar.json";

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export function applyDir(lang: string) {
  if (typeof document === "undefined") return;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

let hooked = false;

export function loadSavedLanguage() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("lang") ?? "fr";
  if (saved !== i18n.language) void i18n.changeLanguage(saved);
  applyDir(i18n.language);
  if (!hooked) {
    hooked = true;
    i18n.on("languageChanged", (lang) => {
      localStorage.setItem("lang", lang);
      applyDir(lang);
    });
  }
}

export default i18n;
