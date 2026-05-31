# IOX — Architecture Pack

> Source-of-truth architecture document. Closes **C2-SC1 Target architecture
> definition**. Re-read before any change that crosses a module boundary.

## 1. Purpose

IOX is a unified construction-intelligence platform that consolidates pre-construction (CostX), bill-of-quantities (BOQs), tender management (ProcureX), and cross-module reporting under one shell, one identity, one database.

The platform is intentionally a **single deployment** with **multiple route groups**, sharing infrastructure to minimise operational overhead while keeping module code physically separated.

## 2. Logical view — modules

```
┌─────────────────────────────────────────────────────────────────┐
│                        IOX shell (Next.js)                      │
│  Header + nav + Project Pulse pinned right + module cards on /  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌────────────┬────────┼────────┬────────────┬──────────────┐
        ▼            ▼        ▼        ▼            ▼              ▼
   ┌───────┐  ┌──────────┐ ┌────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐
   │ Home  │  │ CostX    │ │BOQs│ │ProcureX  │ │ Projects   │ │ Benchmarking │
   │ /     │  │ /costx   │ │/bo │ │/procurex │ │ /projects  │ │/benchmarking │
   └───────┘  └──────────┘ └────┘ └──────────┘ └────────────┘ └──────────────┘
                  │           │        │
                  │           │        ├─ requires NextAuth session (px_user)
                  │           │        └─ owns 48 px_* Drizzle tables
                  │           └─ Prisma BoqRun table + on-disk xlsx runs
                  └─ Prisma Masterplan / BuildingCost / Configuration tables
```

| Module | Route group | Primary tables | Owner of |
|---|---|---|---|
| **Shell / Home** | `/` | — | Module discovery, Project Pulse |
| **CostX** | `/costx` | `masterplans`, `building_costs`, `infrastructure_costs`, `masterplan_phases`, `cost_model_entries`, `parametric_matrix`, `cost_factors`, `configurations`, `benchmark_projects` | Parametric estimating |
| **BOQs** | `/boqs` | `boq_runs` (+ on-disk xlsx artefacts under `/tmp/iox-runs/`) | POMI-coded BoQ imports |
| **ProcureX** | `/procurex` | 48 `px_*` tables (drizzle): identity, workspace, audit, companies, documents, comments, notifications, workflows, boq, analysis, reports, ai-extraction queue, projects, revisions, config, ptc, portal, specifications, sopr, tenderers, addenda | Tender management + AI extraction |
| **Projects** | `/projects` | reads from `masterplans` + `benchmark_projects` | Cross-module project list |
| **Benchmarking** | `/benchmarking` | `benchmark_projects`, `benchmark_nrm_data` | Cost reference library |
| **Rate Analysis** | `/cost-model-rate-analysis` | `cost_model_entries` | Drill-down of rate library |
| **Configuration** | `/configuration` | `configurations`, `parametric_matrix`, `cost_factors`, `cost_model_entries` | System defaults |

## 3. Physical view — runtime

```
                     INTERNET
                        │
                        ▼
              ┌─────────────────────┐
              │   nginx :80         │  ─── (M5: + :443 with Let's Encrypt)
              │   reverse proxy     │
              └──────────┬──────────┘
                         │ proxy_pass 127.0.0.1:3000
                         ▼
        ┌──────────────────────────────────┐
        │  pm2-managed Node.js processes   │
        ├──────────────────────────────────┤
        │  iox-web    → `next start`       │
        │  iox-worker → `tsx dev-worker`   │   drains px_extraction_job queue
        └─────────┬────────────────────────┘
                  │
        ┌─────────▼──────────┐         ┌─────────────────┐
        │  PostgreSQL 16     │         │  Anthropic API  │
        │  iox database      │         │  (HTTPS)         │
        │   ├ Prisma: 17 tbl │         │  Sonnet 4.6 +    │
        │   └ Drizzle: 48 tbl│         │  Haiku 4.5       │
        └────────────────────┘         └─────────────────┘
        ┌────────────────────┐
        │  Local disk        │
        │  /home/iox/app/    │
        │   web/uploads/     │  user-uploaded tender PDFs
        │   web/runs/        │  BOQ run artefacts
        └────────────────────┘
```

**Single Azure VM**: `iox-vm-01` · Standard_D2s_v3 · 2 vCPU / 8 GB / 32 GB Premium SSD · UAE North · public IP `20.203.125.83`.

## 4. Data architecture — two ORMs, one database

IOX deliberately runs **two ORMs** against one Postgres instance:

| ORM | Tables | Naming | Rationale |
|---|---|---|---|
| **Prisma 7** | 17 (no prefix) | `users`, `masterplans`, `cost_model_entries`, … | IOX-native modules (CostX, BOQs) ported from roshn |
| **Drizzle 0.45** | 48 (`px_*` prefix) | `px_user`, `px_project`, `px_extraction_job`, … | OmniApp (ProcureX) ported wholesale; the `px_` prefix prevents collision with Prisma tables |

**Why coexist instead of unifying?** Per the faithful-port rule: ProcureX shipped on Drizzle in production; converting hundreds of queries to Prisma would be a large rewrite with no behavioural benefit. The prefix isolation lets each ORM own its tables cleanly. See [ADR-0001](decisions/0001-prisma-drizzle-coexistence.md).

Cross-ORM identity: see [shared-data-model.md](shared-data-model.md).

## 5. Identity & access

- **Authentication**: NextAuth v5 (`/api/auth/[...nextauth]`), Drizzle adapter, Credentials provider with bcrypt password hashing.
- **Session model**: JWT, `AUTH_SECRET` from env, `AUTH_TRUST_HOST=true` because the VM serves from a bare IP.
- **Mock-session shim** at `web/lib/session.ts` — IOX-native modules still call `getSession()` and get Arjun by default in dev; will resolve from NextAuth when the IOX-side users table merges with `px_user` (Phase 9, deferred).
- **Role enums**:
  - Prisma `UserRole`: `ADMIN`, `DEVELOPMENT_MANAGER`, `VIEWER` (+ super-admin label)
  - ProcureX dev role label: `SUPER_ADMIN` (free-text on `px_user.dev_role_label`)
- **Super-admin spans all modules**: enforced via permission helpers that short-circuit on `role === "ADMIN"`. See [docs/security/access-control-matrix.md](../security/access-control-matrix.md).

## 6. Deployment

- **Repo**: `tajalagawani/BOQs-master` on GitHub
- **CI/CD**: `.github/workflows/deploy.yml` — push to `main` (touching `web/**`) triggers build on GH runner → rsync to VM → pm2 reload. ~3 min end-to-end.
- **No git on VM**: source comes from runner rsync; repo can be private.
- **Schema migrations**: Prisma migrations run on bootstrap; Drizzle migrations applied idempotently per-deploy via `_iox_drizzle_applied` tracking table.

## 7. Cross-cutting concerns

| Concern | Approach |
|---|---|
| **AI extraction** | Anthropic SDK direct calls. Two paths: single-shot (≤700 k chars) on Sonnet 4.6; chunked (>700 k) on Haiku 4.5. Capped at `AI_CHUNKED_MAX_UNITS=30` units locally. |
| **File storage** | Vercel Blob in production, local disk fallback (`/home/iox/app/web/uploads/`) when no `BLOB_READ_WRITE_TOKEN`. |
| **Worker queue** | `px_extraction_job` table; `dev-worker.ts` polls every 5s and POSTs the worker route. In production cron-driven. |
| **Activity logging** | Single `activity_logs` table (Prisma) + `px_audit_log` (Drizzle) until Phase 9 unifies. |

## 8. What's deliberately deferred (with rationale)

| Item | Why deferred |
|---|---|
| Microservices split (C2-SC4) | Modules are logically isolated but ship as one Next.js process. Splitting would require message queues, service mesh, distributed auth. Not justified by current traffic. |
| Unifying Prisma + Drizzle users | Surface-area large, no UX benefit. Identity continuity handled by shared email today. |
| Real CDN in front of nginx | Single-region deployment, latency adequate. |

## 9. References

- ADRs: [docs/architecture/decisions/](decisions/)
- Schema: [docs/architecture/shared-data-model.md](shared-data-model.md)
- API: [docs/api/openapi.yaml](../api/openapi.yaml) *(M4)*
- Security: [docs/security/](../security/)
- Governance: [docs/governance/](../governance/)
- Operations: [docs/operations/](../operations/)
