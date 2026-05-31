# IOX `/platform` Dashboard — Build Plan

Goal: every project artefact (docs, KPI status, defects, CI runs, monitoring,
infra, tests, performance, audit trail) becomes a first-class **in-app tab**
the team uses daily — instead of files in a folder nobody opens.

## Design principles

| Principle | Why |
|---|---|
| **Same shell as IOX** (Header, zinc tokens, max-w-7xl layout) | Looks native, not a bolt-on |
| **Auth-gated to `SUPER_ADMIN` (+ future `PLATFORM_ADMIN`)** | Internal-only |
| **Server-rendered by default**, hydrate only when interaction needed | Fast, cacheable, indexable by the IOX search later |
| **Source = truth** — every tab reads from the canonical artefact (file, API, DB), never a mirror | Zero sync overhead |
| **Read-only first**, write-actions added later only where they pay off | Smaller blast radius, faster ship |
| **Re-use existing UI primitives** (Card, Accordion, MetricExplainer, MasterplanTable, charts) | No new design system |

## Five phases · ~2.5 working days end-to-end

| Phase | Scope | Effort | Closes / Closes-evidence-for |
|---|---|---|---|
| **P1 — Shell + Docs + Overview** | `/platform` route group, nav, overview tiles, `/platform/docs` markdown browser | 3–4 h | Surfaces docs in-app (improves C4-SC5 user-experience evidence) |
| **P2 — Status surfaces** | `/platform/kpis` (board), `/platform/defects` (table), `/platform/releases` (timeline) | 3–4 h | Live view of C5-SC4 defect log, C4-SC4 backlog, C4-SC2 release register |
| **P3 — Live ops** | `/platform/cicd` (GitHub API), `/platform/monitoring` (Azure Log Analytics), `/platform/infrastructure` (Azure SDK) | 5–7 h | Live evidence for C4-SC3 CI/CD, C5-SC1 monitoring, C1-SC1 environment inventory |
| **P4 — Quality + activity** | `/platform/tests` (JUnit viewer), `/platform/performance` (k6 history), `/platform/audit` (activity stream) | 3–4 h | C2-SC3 / C3-SC3 test execution evidence, C5-SC2 performance evidence |
| **P5 — Architecture index** | `/platform/architecture` (ADR browser, system diagram), `/platform/changes` (RFC inbox) | 2 h | Discoverability of C2-SC1 + the change-control gate |

## Phase 1 — Shell + Docs + Overview

**Routes**
- `/platform` — landing tiles (status counts + quick links)
- `/platform/docs` — folder tree on left, rendered markdown on right
- `/platform/docs/[...slug]` — deep-link to any `.md` under `docs/`

**Files** (`web/app/platform/*` + `web/components/platform/*`)
- `layout.tsx` — auth gate (super-admin), shared nav, tab strip
- `page.tsx` — overview tiles
- `docs/page.tsx` + `docs/[...slug]/page.tsx`
- `components/platform/PlatformNav.tsx`
- `components/platform/DocsTree.tsx`
- `components/platform/MarkdownView.tsx`

**Deps** (one npm install): `react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-slug`

**Acceptance**
- Sign in → navigate to `/platform` → see 7 status tiles
- Click "Docs" → folder tree reflects `docs/` filesystem 1:1
- Open any `.md` → renders with tables, code blocks, anchors

## Phase 2 — Status surfaces

**Routes**
- `/platform/kpis` — board view of `BACKLOG.md` (24 cards, 4 columns by status)
- `/platform/kpis/[kpiId]` — single KPI deep page (deliverable, target, evidence links)
- `/platform/defects` — sortable/filterable table of `defect-log.md`
- `/platform/releases` — timeline of `docs/operations/release-notes/*.md`

**Files**
- `lib/platform/parse-backlog.ts` — markdown parser → typed KPI[] (24 entries)
- `lib/platform/parse-defects.ts` — markdown parser → Defect[]
- `lib/platform/parse-releases.ts` — fs glob + frontmatter

**Acceptance**
- KPI counts on `/platform` match `sign-off-matrix.md` (18 🟢 / 3 🟡 / 2 🟠 / 1 🔴 today)
- Defect table filters by severity + module + open/closed
- Releases page shows go-live entry first

## Phase 3 — Live ops (the high-leverage phase)

**Routes**
- `/platform/cicd` — last 20 GitHub Actions runs (workflow / status / duration / commit)
- `/platform/monitoring` — live CPU + memory + syslog-errors charts (Azure Log Analytics)
- `/platform/infrastructure` — resource list pulled from Azure (RG `iox-rg`)

**Deps**
- `@octokit/rest` — GitHub API (uses `GH_TOKEN` env)
- `@azure/identity` + `@azure/arm-resources` + `@azure/arm-compute` — Azure resource list
- `@azure/monitor-query` — Log Analytics Kusto queries

**Secrets / wiring**
- `GH_TOKEN` (personal access token, repo-read) → VM `.env`
- Azure: service principal OR managed identity on the VM. Easier path: SP with `Reader` on `iox-rg` only. Add `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` to `.env`.

**Files**
- `lib/platform/github.ts` — Octokit client (cached, server-only)
- `lib/platform/azure.ts` — Azure SDK clients (server-only)
- `lib/platform/log-analytics.ts` — Kusto query helpers

**Acceptance**
- CI tab shows the last successful deploy's commit + time
- Monitoring tab shows CPU + memory line chart for last 24 h
- Infrastructure tab lists all 9 resources in `iox-rg` with tags

## Phase 4 — Quality + activity

**Routes**
- `/platform/tests` — last JUnit run (parsed from `web/tests/.last-junit.xml`) + pass/fail trend
- `/platform/performance` — last k6 run (parsed from `web/tests/.last-load-test.json`) + p95/p99 timeline
- `/platform/audit` — cross-module activity stream from `activity_logs` + `px_audit_log`

**Files**
- `lib/platform/parse-junit.ts`
- `lib/platform/parse-k6.ts`
- `lib/platform/audit-stream.ts` — Prisma + Drizzle UNION query (typed)

**Acceptance**
- Tests tab shows green/red per test name
- Performance tab plots p95 over time (one bar per k6 run committed)
- Audit tab streams last 100 events, filterable by user / module

## Phase 5 — Architecture index

**Routes**
- `/platform/architecture` — ADR browser (`docs/architecture/decisions/*.md`)
- `/platform/changes` — RFC inbox (open Issues with `enhancement` label, via GH API)

**Files**
- `lib/platform/parse-adrs.ts`

**Acceptance**
- ADRs render as a numbered list with status badge (Accepted / Superseded / Proposed)
- Change inbox shows new feature requests from GitHub Issues

## Dependencies & wiring summary

| What | When | Where |
|---|---|---|
| `react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-slug` | P1 | `npm install --save` |
| `@octokit/rest` | P3 | `npm install --save` + `GH_TOKEN` in env |
| `@azure/identity`, `@azure/arm-resources`, `@azure/arm-compute`, `@azure/monitor-query` | P3 | `npm install --save` + Azure SP secrets in env |
| New `PLATFORM_ADMIN` role | P1 (optional — `SUPER_ADMIN` suffices for now) | extend Prisma `UserRole` enum |
| Azure SP creation | P3 | `az ad sp create-for-rbac --role Reader --scopes /subscriptions/<sub>/resourceGroups/iox-rg` |

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| GitHub token leak via SSR error pages | Wrap every server call in try/catch; never include token in client payloads |
| Azure SP scope too wide | Lock scope to `iox-rg` only, role `Reader` only |
| Markdown rendering opens an XSS hole | `react-markdown` + `rehype-sanitize` (skip HTML by default) |
| Slow Azure Monitor queries blocking page render | Run them in parallel via Suspense; cache 5 min |
| Build size bloat from charts in every tab | Lazy-load chart components with `dynamic(() => import(...), {ssr: false})` |

## What this dashboard does NOT do (deliberate, for now)

| Out of scope | Why |
|---|---|
| Trigger CI runs / pm2 restarts from the UI | Write actions = bigger blast radius. Stays on CLI for now. |
| Show Sentry data | Deferred per PO — using Azure Monitor only. |
| Embed Azure portal `<iframe>` | API-pull renders cleanly inline; no iframe limitations. |
| User management UI (CRUD on `px_user`) | Out of platform-dashboard scope; will live under `/admin/users` later. |

## Acceptance for the whole `/platform`

Once all 5 phases ship, the team's workflow becomes:

1. Open IOX → sign in
2. Click **Platform** in header → see 18/24 KPIs 🟢
3. New PR? → **CI/CD** tab shows pipeline live
4. Performance regression alert? → **Monitoring** tab shows the spike + correlated syslog
5. Need to read a doc? → **Docs** tab, search in browser
6. Defect filed? → **Defects** tab logs it; click through to GitHub Issue
7. Quarterly assessor review? → **KPIs** tab is the assessor checklist

## Reading order for the team after launch

Land them on `/platform` with a 60-second intro tour:
1. **Overview** — what's green, what's blocked
2. **KPIs** — what we owe the assessor
3. **Docs** — read-anywhere reference
4. **Monitoring** — is the VM healthy now?
5. **CI/CD** — what just deployed?

Everything else is reachable in a click; nothing is required reading.

---

## Suggested order to ship

| Day | Build | Outcome |
|---|---|---|
| D+0 | P1 (shell + docs browser + overview) | Team has a home page for IOX-the-product |
| D+1 morning | P2 (KPIs board + defects + releases) | Status visible without opening files |
| D+1 afternoon | P3 first half (CI/CD via GitHub) | Last deploy + pipeline visible in IOX |
| D+2 morning | P3 second half (monitoring + infrastructure) | Azure data in IOX |
| D+2 afternoon | P4 (tests + performance + audit) | Quality surfaces live |
| D+3 morning | P5 (architecture + changes) + polish | Full picture |

**Say "build phase 1"** (or specify a different cut) and I'll start. Same rules
apply: no git ops until you say so.
