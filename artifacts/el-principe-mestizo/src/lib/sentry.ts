import * as Sentry from "@sentry/react";

const SENTRY_DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined) ||
  "https://7ab4646ead14853e82bcb877570a21ca@o4511469778960384.ingest.us.sentry.io/4511469787217920";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 0.5,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(msg: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(msg, level);
}

export { Sentry };
