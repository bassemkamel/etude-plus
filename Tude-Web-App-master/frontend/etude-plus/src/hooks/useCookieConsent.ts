import { useState, useEffect } from "react";

export type CookieConsent = {
  necessary: true; // always true — cannot be toggled
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "etude_cookie_consent";
const CONSENT_VERSION = "1";

export type ConsentState = "pending" | "accepted" | "rejected" | "custom";

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [state, setState] = useState<ConsentState>("pending");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.version !== CONSENT_VERSION) return; // reset on version bump
      setConsent(parsed.consent);
      setState(parsed.state ?? "custom");
    } catch {}
  }, []);

  function saveConsent(newConsent: CookieConsent, newState: ConsentState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CONSENT_VERSION, consent: newConsent, state: newState }));
    } catch {}
    setConsent(newConsent);
    setState(newState);
  }

  function acceptAll() {
    saveConsent({ necessary: true, analytics: true, marketing: true }, "accepted");
  }

  function rejectAll() {
    saveConsent({ necessary: true, analytics: false, marketing: false }, "rejected");
  }

  function saveCustom(prefs: Omit<CookieConsent, "necessary">) {
    saveConsent({ necessary: true, ...prefs }, "custom");
  }

  function resetConsent() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setConsent(null);
    setState("pending");
  }

  const bannerVisible = state === "pending";

  return { consent, state, bannerVisible, acceptAll, rejectAll, saveCustom, resetConsent };
}
