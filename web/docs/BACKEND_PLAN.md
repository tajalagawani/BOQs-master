 w# ProcureX — Backend Plan

Companion to [`FLOW.md`](./FLOW.md). This document defines the backend
architecture, data model, API surface, and a milestone-by-milestone build
plan that turns the current mocked UI into a real, multi-user product.

The database is already attached: **Neon Postgres via the Vercel Marketplace**
(env keys `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_PRISMA_URL`, …
present in `.env.local`). The DB is empty and ready for the first migration.

---

## 1. Goals and non-goals

**In scope (v1):**
- Persist everything currently held in client state — projects, tenderers, documents, configuration, analysis results.
- File uploads for tender documents, PTE, PTC, and tenderer returns.
- Server-side rate analysis (high/low/unpriced/arithmetical errors).
- PTC pack and tender report generation (PDF + Excel).
- Single workspace / single QS user (auth wired but multi-tenant model already in schema).
- Audit trail for round transitions and sign-offs.

**Out of scope (v1):**
- Tenderer-facing portal (will be a follow-up app or magic-link form).
- Real-time collaboration (comments stored, but no live presence).
- AI features (auto-flagging via LLM, summarisation) — design hooks now, ship later.

---

## 2. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Runtime | Vercel Fluid Compute (Node.js 24) | Default on Vercel; supports long-running tasks for analysis/export. |
| Framework | Next.js 16 App Router (already installed) | Server Components + Server Actions cover most CRUD without separate API. |
| Database | **Neon Postgres** (Vercel Marketplace) | Already provisioned; pooled URL for runtime, unpooled for migrations. |
| ORM | **Drizzle ORM** | Type-safe, lightweight, works cleanly with Neon's HTTP and serverless drivers. (Prisma is also viable — `POSTGRES_PRISMA_URL` is present — but Drizzle has less cold-start cost and is the current Vercel default.) |
| File storage | **Vercel Blob** | Native to Vercel; signed URLs; supports private uploads (Marketplace integration if not already provisioned). |
| Background jobs | **Vercel Workflow DevKit** | Durable steps for analysis, PTC pack generation, exports. Crash-safe and resumable. |
| Auth | **Clerk** (Vercel Marketplace) | Fast to wire; SSO/email; per-user metadata for roles. Auth.js is a fine alternative. |
| PDF/Excel | `@react-pdf/renderer` + `exceljs` running in Vercel Functions | Both work in Node runtimes; render server-side and upload result to Blob. |
| Validation | `zod` | Shared between Server Action input and DB writes. |
| Observability | Vercel Logs + Drains | OpenTelemetry-ready out of the box. |

Reasoning for Drizzle over Prisma: smaller bundle, no separate engine process, first-class Neon driver, and migrations as plain SQL committed to the repo. If the team prefers Prisma's DX, swap the ORM — the schema below maps 1:1.

---

## 3. Data model

ER summary:

```
workspace ─┬─ user (membership)
           └─ project ─┬─ project_member
                       ├─ tenderer ──── tenderer_document
                       ├─ document         (project-level: ITT, FOT, BOQ template, PTE…)
                       ├─ round       ─┬─ tenderer_submission ─┬─ boq_item_rate
                       │               │                       └─ flag (high/low/unpriced/error)
                       │               ├─ compliance_record
                       │               ├─ deviation
                       │               ├─ qualification
                       │               ├─ ptc_pack
                       │               └─ tender_report
                       └─ analysis_config (current snapshot + history)
```

### 3.1 Core tables

```sql
-- workspaces & users
workspace        (id, name, slug, created_at)
user             (id, clerk_user_id, email, name, default_workspace_id)
workspace_user   (workspace_id, user_id, role)      -- role: owner | qs | viewer

-- projects
project (
  id, workspace_id, name, currency, city, country, project_type,
  basis_of_tender, conditions_of_contract, gfa, bua, budget,
  project_lead_id, procurement_lead_id, tender_coordinator_id,
  tender_issued_at, original_return_at, adjusted_return_at,
  status,                                  -- draft | configured | analyzing | review | reported | archived
  pte_present boolean default false,
  created_at, updated_at, created_by_user_id
)

-- tenderers (companies invited to a project)
tenderer (
  id, project_id, code,                    -- T1, T2…
  company_name, contact_name, contact_email,
  invited_at, invited_by_user_id,
  rank_initial, rank_current,
  short_name, full_name,
  is_active, created_at
)

-- documents (project-level OR tenderer-level)
document (
  id, project_id, tenderer_id,             -- null when project-level
  scope,                                   -- required | applicable | pte | ta | ptc | tenderer_submission
  category,                                -- "Form of Tender", "Drawings", "PTC/Pricing Schedule"…
  filename, mime_type, size_bytes,
  blob_url, blob_pathname,
  uploaded_by_user_id, uploaded_at,
  round_id                                 -- null until associated with a round
)

-- rounds (Initial, PTC 1/2/3)
round (
  id, project_id, key,                     -- 'initial' | 'ptc1' | 'ptc2' | 'ptc3'
  label, opened_at, closed_at,
  baseline_kind,                           -- avg_lowest_three | median | average | pte
  high_rate_threshold_pct,
  low_rate_threshold_pct,
  unpriced_strategy,                       -- list_only | avg_lowest_three | normalise_avg | normalise_pte
  unpriced_quality_check_pct,
  ptc_sections_enabled jsonb,              -- { highRate: true, lowRate: true, … }
  pte_visible_to_tenderers boolean,
  is_locked boolean,
  signed_off_at, signed_off_by_user_id
)

-- per-tenderer submission for a given round
tenderer_submission (
  id, round_id, tenderer_id,
  tender_sum_cents bigint, adjusted_sum_cents bigint,
  variance_pct numeric(6,3),
  priced_items int, unpriced_items int,
  arithmetical_errors int, high_rates_count int, low_rates_count int,
  status,                                  -- pending | uploaded | analyzed | clarified | locked
  notes text
)

-- BOQ rates per submission
boq_item (
  id, project_id, section_no, section_label,
  item_no, item_label, unit, quantity_planned numeric
)

boq_item_rate (
  id, submission_id, boq_item_id,
  unit_rate_cents bigint,                  -- nullable for unpriced
  amount_cents bigint,
  is_unpriced boolean,
  is_arithmetical_error boolean,
  normalised_rate_cents bigint
)

flag (
  id, submission_id, boq_item_rate_id,
  kind,                                    -- high_rate | low_rate | unpriced | error
  baseline_rate_cents bigint, baseline_kind text,
  variance_pct numeric(6,3),
  ptc_question text, tenderer_response text,
  status                                   -- open | answered | accepted | rejected
)

compliance_record (
  id, submission_id,
  fot_submission jsonb,                    -- { status, label } status in compliant|partial|non_compliant|missing
  time_for_completion jsonb,
  ohp_markup jsonb,
  tender_validity jsonb,
  signatures jsonb
)

deviation (
  id, submission_id, kind,                 -- commercial | technical
  ref text, summary text, detail text, impact_cents bigint,
  status                                   -- open | clarified | accepted | rejected
)

qualification (
  id, submission_id, label, evidence_document_id
)

ptc_pack (
  id, round_id, tenderer_id,
  blob_url, generated_at, generated_by_user_id,
  status                                   -- draft | issued | responded
)

tender_report (
  id, round_id, scope,                     -- executive | full
  include_appendices boolean,
  blob_url, generated_at, generated_by_user_id
)

audit_log (
  id, workspace_id, project_id, actor_user_id,
  action, target_kind, target_id, payload jsonb, created_at
)
```

Indexes: every FK gets an index; `(project_id, round_key)` unique on `round`;
`(submission_id, boq_item_id)` unique on `boq_item_rate`.

Money is stored as `bigint` minor units (cents) to dodge floating-point.

### 3.2 Why this shape

- **Round-scoped submissions** model the PTC loop cleanly. A bidder has one
  `tenderer_submission` per round; rates carry over from the previous round
  unless re-priced.
- **`flag` is the bridge between analysis and PTC** — a flagged rate becomes
  a question in the pack; the response feeds the next round's submission.
- **`document` is unified** across project-level docs, PTE, and tenderer
  submissions — one upload pipeline, one access-check shape, scope/round
  attributes disambiguate.
- **`ptc_pack` and `tender_report` carry blob URLs** so re-issuing always
  produces a new immutable artefact (no in-place mutation).

---

## 4. API surface

Almost all writes are **Server Actions**; reads happen inside Server
Components. Long-running operations (analysis, exports) are triggered as
**Vercel Workflows** that update a status row the UI polls or subscribes to.

### 4.1 Server Actions (mutations)

```
project.create(input)                        → projectId
project.update(projectId, partial)
project.delete(projectId)

tenderer.add(projectId, input)
tenderer.bulkImport(projectId, csvRows)
tenderer.invite(tendererId)
tenderer.remove(tendererId)

document.requestUploadUrl(scope, projectId, tendererId?, roundId?)
                                             → { uploadUrl, blobPathname, documentId }
document.commit(documentId, { mimeType, size })
document.delete(documentId)

round.open(projectId, key)
round.updateConfig(roundId, configPatch)
round.lock(roundId)
round.signOff(roundId)

submission.upload(roundId, tendererId, sourceDocumentId)  → triggers ingest workflow
submission.recalculate(submissionId)                       → triggers analysis workflow

flag.answer(flagId, response)
flag.updateStatus(flagId, status)

deviation.create / update / resolve
qualification.create / delete
compliance.update(submissionId, patch)

ptcPack.generate(roundId, tendererIds)        → workflowRunId
tenderReport.generate(roundId, { scope, appendices })  → workflowRunId
```

All inputs validated with zod schemas colocated in `lib/schemas/`.

### 4.2 Route Handlers (where Actions don't fit)

```
GET  /api/projects/:id/export.xlsx           — streamed export (returns blob URL after job)
POST /api/webhooks/clerk                     — user sync
POST /api/webhooks/blob                      — confirm uploads
GET  /api/health                              — DB + Blob + Workflow probes
```

### 4.3 Realtime / polling

Initial implementation: client polls a `useSWR` endpoint that returns
`workflow_run` status every 1-2s while a job is active. Upgrade to Postgres
`LISTEN/NOTIFY` over an SSE endpoint when interaction grows.

---

## 5. File handling

**Direct-to-Blob uploads** keep large files out of Function memory:

1. UI requests `document.requestUploadUrl(...)` (Server Action).
2. Server creates a `document` row with status `pending` + generates a
   `@vercel/blob` upload URL (private scope).
3. Browser PUTs the file directly to Blob.
4. UI calls `document.commit(documentId, ...)` to finalise. Server verifies
   size and mime against the document row, sets `status = uploaded`.
5. For `tenderer_submission` uploads, commit also enqueues an **ingest
   workflow** that parses the BOQ Excel/PDF and writes `boq_item_rate` rows.

Allowed types per scope are enforced server-side. All Blob URLs are
private; downloads go through a server route that runs an access check
and returns a signed redirect.

---

## 6. Background workflows (Vercel Workflow DevKit)

Workflows are crash-safe, step-by-step, resumable. Three primary flows:

### 6.1 `ingestSubmission(submissionId)`
1. Load document and submission.
2. Parse rates → write `boq_item_rate` rows in batches.
3. Compute totals, variance, item counts.
4. Mark submission `uploaded → analyzed`.
5. Emit audit event.

### 6.2 `runAnalysis(roundId)`
1. For each submission in the round, compute baseline rates from
   `round.baseline_kind` (avg-lowest-3 / median / avg / PTE).
2. For each item rate, compare to baseline, write or update `flag` rows.
3. Apply unpriced strategy, set `normalised_rate_cents`.
4. Detect arithmetical errors (item amount ≠ qty × unit rate within
   tolerance).
5. Refresh `tenderer_submission` aggregates (priced / unpriced / errors).
6. Update `round.is_locked = false` and bump `analyzed_at`.

### 6.3 `generatePtcPack(roundId, tendererId)` / `generateTenderReport(roundId, opts)`
1. Pull round config + flags + sections enabled.
2. Render PDF via `@react-pdf/renderer` (PTC) or Excel via `exceljs`
   (Appendix-A breakdowns).
3. Upload to Blob → store URL on `ptc_pack` / `tender_report` row.
4. Emit audit event; notify creator.

Each workflow exposes a `workflow_run` row the UI subscribes to for
progress.

---

## 7. Auth & multi-tenancy

- Clerk middleware on every route except `/api/health` and signed-blob
  download routes (which carry their own short-lived token).
- `workspace_user` is the source of truth for access. Server Actions take
  `(workspaceId, projectId)` and enforce membership + role.
- Roles for v1: `owner`, `qs`, `viewer`. Future: `tenderer` (portal) lives
  in a separate `tenderer_user` table to keep concerns separated.
- Row-level security in Postgres can be deferred — application-layer guards
  are enough until we have external integrations writing to the DB.

---

## 8. Reports and exports

- **PTC Pack** — per-bidder PDF. Sections gated by `round.ptc_sections_enabled`:
  cover, summary of flags, high-rate appendix, low-rate appendix, unpriced
  items, excluded / by client / by others, completion checker.
- **Tender Report** — Executive or Full. Includes Appendix A breakdown if
  `include_appendices = true`.
- **Excel Export** — one workbook per round: BOQ comparison, adjustments,
  per-bidder summaries, deviations, qualifications.

All artefacts immutable; re-running creates a new row + URL. The Export
History panel (already in the UI) lists `ptc_pack` and `tender_report`
rows scoped to the project.

---

## 9. Milestones (build order)

Eight ordered milestones. Each ends in something demoable.

### M1 — Foundation (1-2 days)
- Add Drizzle, define schema files, set up `drizzle-kit` migrations.
- Wire Neon pooled (`DATABASE_URL`) and unpooled (`DATABASE_URL_UNPOOLED`)
  clients (`lib/db.ts`).
- Add Clerk to `app/layout.tsx`, gate `/projects` behind `auth()`.
- Seed a default workspace + the current user on first sign-in.

### M2 — Projects CRUD (1 day)
- Replace `lib/data/omni-data.ts` mock fetcher with DB queries.
- Server Action `project.create` from Step 1 of the wizard.
- `/` lists real projects from DB.
- Wizard URL becomes `/projects/[projectId]/setup?step=1` so state can be
  resumed.

### M3 — Tenderers + document uploads (2-3 days)
- `tenderer.add`, `tenderer.bulkImport`, `tenderer.invite`.
- Vercel Blob integration; direct-upload from Step 2 (PTE, ITT, FOT…) and
  Step 3 (per-tenderer docs).
- Excel template download / parse-on-upload (basic columns only).

### M4 — Rounds + analysis config (2 days)
- `round` table populated from Step 4 sub-steps.
- Server Actions for baseline / thresholds / unpriced strategy /
  PTC summary toggles.
- Stepper "Continue" persists progress.

### M5 — Submission ingest + analysis (3-5 days)
- `ingestSubmission` workflow with a real BOQ parser (start with a
  hand-defined Excel template).
- `runAnalysis` workflow: baselines, flags, errors, normalisation.
- Step 5 Tender Returns / Executive Summary / per-bidder cards rendered
  from `tenderer_submission` + `flag` aggregates.

### M6 — Compliance, deviations, qualifications (2 days)
- CRUD for compliance rows + deviations + qualifications.
- Wire the per-bidder review sub-routes (`step5/review/*`) to real data.
- QS sign-off action that locks a round.

### M7 — PTC packs + tender reports (3-4 days)
- `generatePtcPack` + `generateTenderReport` workflows.
- PDF templates with `@react-pdf/renderer`; Excel with `exceljs`.
- Step 6 "Generate" buttons trigger workflows; status pill polls
  `workflow_run`.
- Export History list reads `ptc_pack` + `tender_report` rows.

### M8 — Observability, audit, hardening (1-2 days)
- `audit_log` writes on every mutation.
- Vercel Drains for runtime logs.
- Rate-limit Server Actions per workspace.
- Sentry (or equivalent) for client errors.

---

## 10. Open questions blocking schema lock

These need product answers before M5 — they shape the round/submission
tables:

1. **Rounds vs revisions** — are PTC rounds the same as revisions (`rev-0`
   in the UI)? The plan currently treats them as the same with `round.key`.
   If a tender can have multiple "Revisions" each with their own PTC rounds,
   we need a `revision` table between `project` and `round`.
2. **Currency handling** — Appendix A is in AED, the project carries an
   arbitrary currency. Do we store rates in project currency and convert
   for display, or vice versa? Need an FX strategy.
3. **Tenderer portal** — if tenderers ever submit through a UI, we need a
   `tenderer_user` table and a magic-link / invite flow. Building it as a
   pluggable module from the start avoids churn.
4. **Comments / sharing** — schema hooks in or skip until v2? Recommend a
   single polymorphic `comment` table on the side, off the critical path.
5. **Sign-off chain** — single QS sign-off, or a multi-person approval?
   The `signed_off_*` columns only support the former today.

---

## 11. First three concrete commits

To start the work right now without overthinking:

1. **`feat(db): add drizzle + first migration`** — install
   `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`; commit
   `lib/db.ts`, `drizzle/schema.ts` with the workspace/user/project/
   tenderer/document tables; run the first migration against Neon.
2. **`feat(auth): clerk middleware + workspace bootstrap`** — wrap
   layout, add sign-in route, on first sign-in create a personal
   workspace and a `workspace_user` row.
3. **`feat(projects): persist step 1`** — replace the in-memory state
   in `tender-setup.tsx` with a Server Action that creates a `project`
   row and routes to `/projects/[id]/setup?step=2`.

After those three the wizard has a real, persisted starting point and
everything else extends naturally.
