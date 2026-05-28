import { useEffect } from "react";
import { useCookieConsent } from "./useCookieConsent";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let gtagInitialized = false;

function initGtag() {
  if (gtagInitialized || !GA_ID) return;
  gtagInitialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    send_page_view: true,
    anonymize_ip: true,
  });

  // Load GA4 script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

type EventParams = Record<string, string | number | boolean | undefined>;

export function useAnalytics() {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (consent.analytics && GA_ID) {
      initGtag();
    }
  }, [consent.analytics]);

  return {
    trackEvent: (name: string, params?: EventParams) => {
      if (!consent.analytics || !window.gtag) return;
      window.gtag("event", name, params);
    },
    trackPageView: (path: string) => {
      if (!consent.analytics || !window.gtag) return;
      window.gtag("event", "page_view", {
        page_path: path,
        page_title: document.title,
      });
    },
    trackArticleView: (title: string, slug: string, category?: string) => {
      if (!consent.analytics || !window.gtag) return;
      window.gtag("event", "article_view", {
        article_title: title,
        article_slug: slug,
        article_category: category ?? "",
      });
    },
    trackScroll: (depth: number) => {
      if (!consent.analytics || !window.gtag) return;
      window.gtag("event", "scroll_depth", { depth });
    },
    trackTimeOnPage: (seconds: number) => {
      if (!consent.analytics || !window.gtag) return;
      window.gtag("event", "time_on_page", { seconds });
    },
  };
}
