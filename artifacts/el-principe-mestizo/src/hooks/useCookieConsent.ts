import { useState, useEffect, useCallback } from "react";

const COOKIE_CONSENT_KEY = "epm-cookie-consent";

export type ConsentLevel = "all" | "necessary" | null;

export interface ConsentState {
  level: ConsentLevel;
  analytics: boolean;
  ads: boolean;
}

const DEFAULT_CONSENT: ConsentState = {
  level: null,
  analytics: false,
  ads: false,
};

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.level === "all") {
          return { level: "all", analytics: true, ads: true };
        }
        if (parsed.level === "necessary") {
          return { level: "necessary", analytics: false, ads: false };
        }
      }
    } catch { /* */ }
    return DEFAULT_CONSENT;
  });

  const acceptAll = useCallback(() => {
    const state = { level: "all" as ConsentLevel, analytics: true, ads: true };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
    setConsent(state);
    // Disparar evento para que scripts puedan reaccionar
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: state }));
  }, []);

  const acceptNecessary = useCallback(() => {
    const state = { level: "necessary" as ConsentLevel, analytics: false, ads: false };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
    setConsent(state);
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: state }));
  }, []);

  const hasConsent = consent.level !== null;

  return { consent, hasConsent, acceptAll, acceptNecessary };
}
