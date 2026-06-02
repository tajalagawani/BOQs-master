# ADR-0001 — Prisma and Drizzle coexist in one Postgres database

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** Taj Noah

## Context

IOX-native modules (CostX, BOQs) were ported from the source app, which uses Prisma. ProcureX is a wholesale port of OmniApp, which uses Drizzle ORM. Both target Postgres.

When migrating ProcureX into IOX, three options:

| # | Approach | Consequence |
|---|---|---|
| A | Convert all Drizzle queries to Prisma | Rewrite hundreds of queries / actions. Behaviour-preserving but high risk + cost. |
| B | Run separate databases for each ORM | Two Postgres instances, two connection pools, no cross-module FKs, doubled ops overhead. |
| C | Both ORMs share one Postgres, isolate via table-name prefix | Two TypeScript clients, one DB, zero query rewrites. |

## Decision

Option **C**. Both ORMs share the `iox` Postgres database. Drizzle tables carry the `px_` prefix; Prisma tables are unprefixed. Each ORM owns its tables and never queries across them at the SQL level.

## Consequences

**Positive**
- Zero rewrite cost on the ProcureX side — every action ported as-is.
- One Postgres instance, one backup target, one set of credentials.
- Module isolation is enforced by the table-name boundary: a CostX query physically cannot reference `px_*` tables without explicit raw SQL.

**Negative**
- Two ORM clients in the codebase (`@prisma/client` + `drizzle-orm`) — bigger bundle, two query languages for developers.
- Schema drift risk: each ORM has its own migration tooling. We mitigate by running Drizzle migrations idempotently via `_iox_drizzle_applied` tracking table in CI, and running Prisma migrations on bootstrap.
- Cross-ORM references (e.g., a `users` table per ORM) require denormalisation: same person exists as a row in both `users` (Prisma) and `px_user` (Drizzle), linked by email. See ADR-0004.

**Neutral**
- Adds an `npm run db:drizzle:*` family of scripts alongside `prisma migrate`.

## Alternatives revisited

- **A** (convert to Prisma) — re-evaluated quarterly. Worth doing only if we add a 4th module that also needs Prisma, raising the cost-benefit ratio against the rewrite.
- **B** (separate DBs) — only worth it if ProcureX needs different scaling characteristics (e.g., a separate read replica for AI extraction).
