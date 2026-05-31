# ADR-0002 — NextAuth mounted at the root, not under `/procurex`

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** Taj Noah

## Context

OmniApp's NextAuth route lived at `/api/auth/[...nextauth]`. When porting into IOX as a namespaced module under `/procurex`, the natural-feeling move was to scope auth there too: `/procurex/api/auth/[...nextauth]`.

The user established the **super-admin rule**: one identity, full access to every module. Per-module auth silos break that rule.

## Decision

Mount the NextAuth route handler at the **root** path `/api/auth/[...nextauth]` (in `web/app/api/auth/`), not under `/procurex`. The sign-in **page** stays under `/procurex/sign-in` (UX entry point) but the underlying session is platform-wide.

## Consequences

**Positive**
- A single session cookie is honoured by every IOX module.
- When the IOX-native modules eventually adopt real auth (today they use a mock session in `lib/session.ts`), they read from the same NextAuth session — no second auth system needed.
- Super-admin behaviour ("can access everything") is implemented as a single role check in every permission helper, not duplicated per module.

**Negative**
- The procurex sign-in page redirects to `/procurex` after login; if we later add other-module sign-in surfaces they'd need their own pages but the same root auth handler.
- `AUTH_SECRET` and `AUTH_TRUST_HOST` are platform env vars rather than module-scoped.

## Implementation notes

- `modules/core/auth.config.ts` sets `pages.signIn = "/procurex/sign-in"` — that's the **page** path, separate from the handler path.
- `modules/core/auth.ts` exports the handlers wired with the Drizzle adapter against the `px_*` user tables.
- `lib/session.ts` is still the entry point for IOX-native modules; it currently returns Arjun unconditionally and will be replaced with `auth()` in Phase 9.
