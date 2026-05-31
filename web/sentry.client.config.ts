// Sentry — browser side. Captures unhandled JS errors and slow page renders.
// Activated only when SENTRY_DSN is set; otherwise this file no-ops.
//
// Wiring (deferred to keep the running app stable):
//   1. npm install --save @sentry/nextjs
//   2. Add `SENTRY_DSN=https://...` to web/.env on the VM
//   3. `pm2 reload ecosystem.config.cjs --update-env`
//   4. (Optional) wrap next.config.ts with `withSentryConfig` for source maps
//
// Until those steps run, this file imports a missing package — the install
// in step 1 is the gate.

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,            // 10% of transactions traced
    replaysSessionSampleRate: 0,      // no session replays for now (cost/PII)
    replaysOnErrorSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
  });
}
