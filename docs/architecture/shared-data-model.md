# IOX — Shared Data Model

> Closes **C2-SC2 Shared data model**. Diagram + entity ownership matrix for
> the IOX Postgres database, covering both Prisma and Drizzle tables.

## Database overview

- **DBMS**: PostgreSQL 16
- **Single database**: `iox`
- **Schema**: `public` (default)
- **Tables**: **65 total** — 17 Prisma + 48 Drizzle (`px_*` prefix)
- **No FKs cross the ORM boundary**: a Prisma table never has a FK pointing at `px_*`, and vice versa. Identity continuity is by email convention.

## High-level entity map

```
                          ┌─────────────────────────────┐
                          │       Postgres `iox`        │
                          └─────────────────────────────┘
              ┌──────────────────────┴──────────────────────┐
              │                                             │
        ┌─────▼──────┐                               ┌──────▼──────┐
        │  Prisma    │                               │   Drizzle    │
        │  17 tables │                               │   48 tables  │
        │  no prefix │                               │   px_*       │
        └────────────┘                               └─────────────┘
              │                                             │
   ┌──────────┼──────────────────┐               ┌──────────┼──────────────────┐
   │          │                  │               │          │                  │
   ▼          ▼                  ▼               ▼          ▼                  ▼
Platform    CostX             BOQs            Identity   ProcureX        AI extraction
(users,     (masterplans,    (boq_runs)      (px_user,  (px_project,    (px_extraction_job,
activity,    building_costs,                  px_account, px_revision,   px_workflow_run,
files,       infra_costs,                     px_session, px_tenderer,   px_document,
settings)    cost_model,                      px_workspace_*) px_tender_*) px_compliance_*)
             configurations,
             benchmark_*)
```

## Prisma side (17 tables)

| Table | Module | Purpose |
|---|---|---|
| `users` | Platform | All IOX-native user accounts |
| `activity_logs` | Platform | Audit trail (cross-module) |
| `file_uploads` | Platform | Generic file metadata |
| `system_settings` | Platform | Single-row config |
| `masterplans` | CostX | Top-level estimate |
| `masterplan_phases` | CostX | Per-phase timeline/scope |
| `building_costs` | CostX | NRM Lvl 1 cost rows per masterplan |
| `infrastructure_costs` | CostX | Infra cost rows per masterplan |
| `project_team_members` | CostX | Masterplan-level team |
| `cost_model_entries` | CostX | Rate library (~960 rows seeded) |
| `parametric_matrix` | CostX | Adjustment factors |
| `cost_factors` | CostX | Quarterly cost uplifts |
| `configurations` | CostX | Generic KV store (density, parking, scurve, …) |
| `benchmark_projects` | Benchmarking | Reference cost projects |
| `benchmark_project_team_members` | Benchmarking | Team on benchmark records |
| `benchmark_nrm_data` | Benchmarking | NRM breakdown per benchmark |
| `boq_runs` | BOQs | POMI-coded BoQ imports |

## Drizzle side (48 tables, prefixed `px_*`)

| Domain | Tables | Purpose |
|---|---|---|
| **Identity** | `px_user`, `px_account`, `px_session`, `px_verification_token` | NextAuth Drizzle adapter |
| **Workspace** | `px_workspace`, `px_workspace_member` | Tenant boundary inside ProcureX |
| **Companies** | `px_company`, `px_company_contact` | Tenderer organisations |
| **Documents** | `px_document` | Uploaded tender PDFs / XLSX |
| **Audit** | `px_audit_log` | ProcureX-side actions (separate from `activity_logs`) |
| **Comments** | `px_comment` | Threaded annotations |
| **Notifications** | `px_notification` | In-app / email queue |
| **Workflows** | `px_workflow_run` | Long-running task tracking |
| **BoQ (ProcureX)** | `px_boq_template`, `px_boq_section`, `px_boq_item`, `px_boq_priceset`, `px_boq_item_rate` | ProcureX's own BoQ entities (distinct from IOX BoQs module) |
| **Analysis** | `px_analysis_config`, `px_flag`, `px_tender_deviation`, `px_tender_flag`, `px_tender_review_row`, `px_tenderer_submission` | Tender scoring + flags |
| **Reports** | `px_report_artefact` | Generated tender reports |
| **AI extraction queue** | `px_extraction_job` (+ `px_workflow_run.output`) | Background extraction tracking |
| **Projects** | `px_project`, `px_project_member` | ProcureX project entity |
| **Revisions** | `px_revision`, `px_round`, `px_round_config_ref` | Tender rounds (initial / ptc1 / ptc2 / ptc3) |
| **Config** | `px_compliance_record_template`, `px_responsibility_matrix_row`, `px_project_phase`, `px_project_close_out_item` | Per-project setup |
| **PTC** | `px_compliance_record`, `px_deviation`, `px_ptc_pack`, `px_qualification` | Post-tender clarifications |
| **Portal** | `px_tenderer_invite` | Tenderer-facing portal access |
| **Specifications** | `px_specification_doc`, `px_specification_section`, `px_specification_approved_manufacturer` | Spec docs |
| **SoPR** | `px_compliance_record_template`, `px_project_phase`, `px_responsibility_matrix_row`, `px_project_close_out_item` | Schedule of Project Requirements |
| **Tenderers** | `px_tenderer` | Per-project bidders |
| **Addenda** | `px_tender_addendum`, `px_tender_addendum_file`, `px_tender_addendum_query`, `px_tender_item_event` | Mid-tender addenda |

## Cross-module entity sharing (the "shared" part)

| Entity (logical) | Lives in | Used by | How |
|---|---|---|---|
| **User identity** | `users` (Prisma) + `px_user` (Drizzle) | All modules | Same email → same logical person. Phase 9 will merge to one row. |
| **Configurations KV** | `configurations` (Prisma) | CostX, Configuration page, Rate Analysis | Single source of truth for tunables (density, parking, scurve, etc.) |
| **Cost model entries** | `cost_model_entries` (Prisma) | CostX (rate lookup), Configuration (admin edit), Rate Analysis (read), Benchmarking (calibration) | 960 rows seeded; consumed by 4 modules |
| **Benchmark projects** | `benchmark_projects` (Prisma) | Benchmarking (primary), Projects (cross-module list), CostX (link from masterplan) | 22 projects seeded |
| **Masterplans** | `masterplans` (Prisma) | CostX (primary), Projects (cross-module list), Summary (read) | 28 projects seeded |
| **BOQ runs** | `boq_runs` (Prisma) | BOQs module only; ProcureX has its own `px_boq_*` stack | Intentionally separate |

## Why this counts as "shared"

The framework KPI is "Core shared data entities/models designed and implemented" with sign-off via "shared data schema being used by multiple applications". Three concrete proofs:

1. **`cost_model_entries`** — 4 routes consume it: `/costx/[id]` (editor), `/configuration` (admin), `/cost-model-rate-analysis` (read-only browse), `/benchmarking` (calibration overlay). Same Prisma model, no duplication.
2. **`benchmark_projects`** — 3 routes consume it: `/benchmarking`, `/projects`, `/costx/[id]` (benchmark link dropdown).
3. **`configurations` KV** — every CostX calculation reads from it (parking ratios, density bands, S-curve settings); the Configuration page is the single edit surface.

## Migration ownership

| ORM | Tooling | Migration files |
|---|---|---|
| Prisma | `npx prisma migrate deploy` (on bootstrap) | `web/prisma/migrations/` (1 file: init) |
| Drizzle | Tracked via `_iox_drizzle_applied` table, applied per-deploy in `deploy.yml` | `web/drizzle/migrations/` (2 files today) |
