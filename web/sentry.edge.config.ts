// Sentry — edge runtime. Catches errors in middleware + edge route handlers.
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
  });
}
