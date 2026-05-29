import { logger } from "./logger";

const SENTRY_DSN = process.env.SENTRY_DSN || "https://7ab4646ead14853e82bcb877570a21ca@o4511469778960384.ingest.us.sentry.io/4511469787217920";

let initialized = false;

export function initSentryBackend() {
  if (initialized) return;
  initialized = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "production",
      sendDefaultPii: true,
      tracesSampleRate: 0.1,
    });
    logger.info("[Sentry] Backend initialized");
  } catch {
    logger.warn("[Sentry] @sentry/node not installed. Skipping.");
  }
}
