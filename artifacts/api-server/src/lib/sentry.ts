const SENTRY_DSN = process.env.SENTRY_DSN;

let initialized = false;

export function initSentryBackend() {
  if (initialized || !SENTRY_DSN) return;
  initialized = true;

  try {
    // Dynamic import to avoid crash if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "production",
      tracesSampleRate: 0.1,
    });
    console.log("[Sentry] Backend initialized");
  } catch {
    console.warn("[Sentry] @sentry/node not installed. Skipping.");
  }
}
