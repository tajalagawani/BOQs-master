# Release v0.2.0 — IOX Platform Dashboard

**Released:** 2026-05-31
**Commit range:** `c293ad5..30b6c1b`
**Production URL:** http://20.203.125.83/platform

## Headline

A first-class internal control plane at `/platform`. Replaces the
"open files in the editor" workflow with an in-app home for every
KPI, document, defect, build, deploy, metric, and audit event.

Gated to `SUPER_ADMIN`. Sidebar-navigated. Three-tier credential
resolution (DB > env > default) means admins paste GitHub + Azure
creds in the UI without a redeploy.

## What's in this release

### 14 new tabs under `/platform`

| Group | Tabs |
|---|---|
| Workspace | Overview · Docs |
| Status | KPIs · Releases · Defects |
| Engineering | CI/CD · Tests · Performance · Infrastructure · Monitoring · Errors |
| Activity & Reference | Audit · Architecture |
| Admin | Settings |

Highlights:

- **CI/CD** — live banner, 6 KPI tiles (success rate, avg duration,
  failures, in-progress, deploy freshness, open PRs), workflow
  scorecards with last-20 conclusion sparkline, recent runs list,
  deploy diff (HEAD vs deployed SHA), commits feed, open PR list,
  and a per-run detail page with jobs/steps accordion, annotations,
  and artifacts download.
- **Errors** — SSE stream of runtime errors with auto-reconnect,
  kind filters (uncaught / unhandled / route / render / log /
  integration), pause/resume, expandable stack traces. Wired via
  `instrumentation.ts` + `onRequestError` + a process-level error
  bus.
- **Settings** — in-app GitHub PAT + Azure SP + Log Analytics
  workspace credential UI with AES-256-GCM secret encryption at
  rest, masked inputs with eye-toggle, per-integration "Test
  connection" buttons. Saved values override env vars on the very
  next request.
- **KPIs** — 24-card board over the Schedule 1 Appendix A sign-off
  matrix, filterable by status, groupable by Component / Status /
  Phase, with per-KPI deep page linking back to evidence files.

### Infrastructure changes

- New `platform_setting` Postgres table for the in-app settings
  store, auto-applied on deploy via
  `web/prisma/migrations/manual/*.sql` (sidesteps Prisma/Drizzle
  reset that `prisma migrate dev` would trigger).
- New `lib/platform/error-bus.ts` ring buffer + EventEmitter
  fan-out, consumed by the SSE route at
  `/api/platform/errors/stream`.
- AES-256-GCM helper at `lib/platform/secrets.ts` with key derived
  (scrypt) from `SETTINGS_ENCRYPTION_KEY` (falls back to
  `AUTH_SECRET`).
- `next.config.ts` instrumentation hook wires uncaught/unhandled
  process events + Next's `onRequestError` into the bus.

### Deploy pipeline changes

- New step **"Apply manual Prisma migrations"** in
  `.github/workflows/deploy.yml` — idempotently applies SQL files
  under `web/prisma/migrations/manual/` via a tracking table.
- New step **"Regenerate Prisma client on VM"** — runs
  `npx prisma generate` on the VM after `npm ci`, only when
  `schema.prisma` has changed (sha256 fingerprint). Fixes the
  silent "Cannot read properties of undefined (reading
  'findMany')" runtime error when schemas evolve.
- Both workflows opted in to
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` so the deprecated
  Node 20 warning stops appearing.

### Documentation pack

5 new ADRs under `docs/architecture/decisions/`:

| ADR | Title |
|---|---|
| 0001 | Prisma/Drizzle coexistence in one Postgres |
| 0002 | NextAuth at root |
| 0003 | ProcureX as an isolated namespace |
| 0004 | Mock session shim for IOX-native routes |
| 0005 | HeroUI Pro license handling |

Plus a full doc tree at `docs/{architecture,governance,operations,
quality,security,api,integrations,testing,performance}/` covering
every column of the Schedule 1 Appendix A sign-off matrix.

## Known limitations

| Item | Workaround / Plan |
|---|---|
| Azure SP can't be created — account lacks `roleAssignments/write` | Subscription Owner creates it OR grants UAA on `iox-rg` |
| Without an SP, Monitoring + Infrastructure show empty data on prod (locally they work via `az login`) | Same as above |
| `tests/unit/formatters.test.ts` fails (`@/utils/formatters` unmerged) | Fix or delete the import; surfaces as a live red badge on `/platform/tests` |
| k6 / vitest history charts empty until you snapshot to `.junit-history/` and `.k6-history/` | Add to CI as separate cron job |

## Verification

| Check | Result |
|---|---|
| `/` returns 200 | ✅ |
| `/platform` renders the sidebar nav + status tiles | ✅ |
| `/platform/cicd` shows ~30 recent runs with the live token | ✅ |
| `/platform/tests` shows 14/15 passing (`formatters` red) | ✅ |
| `/platform/errors` SSE stream stays open | ✅ |
| `/platform/settings` Test-connection buttons return live status | ✅ |
| `platform_setting` table exists in prod Postgres | ✅ |

## Approval

| Approver | Role | Approved at | Notes |
|---|---|---|---|
| Taj Noah | Product Owner + Tech Lead | 2026-05-31 | First in-app surface for the assessor framework — supports Schedule 1 review without leaving the app. |

## Next milestones

See [PLAN.md](../../../PLAN.md). Likely v0.3.0: collapsible sidebar +
keyboard nav, ADR mermaid diagrams inline, k6/junit history snapshots
to populate the trend charts.
