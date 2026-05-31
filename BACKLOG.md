# IOX — Schedule 1 Appendix A: KPI Backlog & Tracking

> Source of truth: `Schedule 1_Appendix A (KPI Breakdown).pdf`. Each of the
> **24 sub-components** below is mapped to IOX's actual state on **2026-05-31**.
> Re-generate this file: `node scripts/build-backlog.mjs`

## Status summary

| Status | Count | What it means |
|---|---|---|
| 🟢 Strong / Done | 4 | KPI substantively met today. May need formal sign-off artefacts. |
| 🟡 Partial | 14 | Working substance exists but formal deliverable / evidence is missing. |
| 🟠 Weak | 3 | Minimal coverage — would not satisfy an assessor. |
| 🔴 Not Started | 3 | No work begun. |
| **Total** | **24** | |

---

## 1. Foundation & Security

### 🟡 C1-SC1 — Cloud environment provisioning  *(Phase 1)*

**Deliverable:** Agreed core environments established  
**How it's measured:** Count of agreed environments provisioned and accessible  
**Target:** 100% of agreed Dev, Test and Production environments live  
**Sign-off evidence required:** Environment inventory, cloud console evidence, architecture diagram

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | Dev VM `iox-vm-01` live in Azure UAE North (D2s_v3, public IP 20.203.125.83). Resource group iox-rg tagged app=IOX-OS. Public IP+NSG+VNet+OS disk all provisioned. |
| **What's missing** | Separate Test environment not yet stood up. Architecture diagram not produced. Environment inventory not formalised. |

### 🟡 C1-SC2 — Infrastructure as Code  *(Phase 1)*

**Deliverable:** IaC deployment baseline implemented  
**How it's measured:** Percentage of core environments deployed through approved IaC scripts  
**Target:** 100% of core environments deployable through IaC  
**Sign-off evidence required:** IaC repository, deployment logs, version-controlled templates

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | `scripts/azure-bootstrap.sh` (idempotent post-provision setup), committed in repo, re-runnable. NSG and VM created via documented `az` CLI commands. |
| **What's missing** | No declarative IaC (Terraform/Bicep/ARM). Bash bootstrap is procedural. VM-creation steps live in chat history, not in a versioned template. |

### 🟡 C1-SC3 — Identity and access management  *(Phase 1)*

**Deliverable:** Role-based access model configured  
**How it's measured:** Ability to apply user roles and permission configurations  
**Target:** At least 2 distinct roles created and implemented across application services  
**Sign-off evidence required:** Access control matrix, user access test record, security configuration evidence

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | NextAuth v5 + Drizzle adapter wired at `/api/auth/[...nextauth]`. UserRole enum: ADMIN, DEVELOPMENT_MANAGER, VIEWER + SUPER_ADMIN label. Per-module permission helpers (`canAccessProject`, `canAccessMasterplan`, etc.). Mock IOX session honours roles. |
| **What's missing** | Only one seeded user (Arjun, SUPER_ADMIN). No 2nd distinct role actively in use. Access control matrix not documented. Security config evidence not exported. |

### 🟡 C1-SC4 — Data protection controls  *(Phase 1)*

**Deliverable:** Encryption controls implemented  
**How it's measured:** Percentage of in-scope environments and services with encryption enabled  
**Target:** 100% encryption at rest and in transit for in-scope services  
**Sign-off evidence required:** Security settings export, configuration evidence, compliance checklist

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | Azure Premium SSD = encryption at rest by default (platform-managed key). Postgres connection on localhost (no transport needed). Anthropic API calls go over HTTPS. .env permissions 600 on VM. |
| **What's missing** | Public HTTP traffic served on port 80 — no TLS. Need certbot/Let's Encrypt for HTTPS. Compliance checklist not produced. |

### 🔴 C1-SC5 — Security assurance  *(Phase 3)*

**Deliverable:** Independent security validation completed  
**How it's measured:** Number of unresolved critical vulnerabilities at milestone sign-off  
**Target:** 0 critical vulnerabilities outstanding  
**Sign-off evidence required:** Penetration test report, remediation log, assessor confirmation

| | |
|---|---|
| **Status** | **Not Started** |
| **What we have** | Nothing yet. |
| **What's missing** | Pen test not commissioned. Vulnerability scan not run. Remediation log doesn't exist. |

## 2. Data & Architecture

### 🟡 C2-SC1 — Target architecture definition  *(Phase 1)*

**Deliverable:** Core architecture defined and approved  
**How it's measured:** Completion of logical and physical architecture pack  
**Target:** Approved architecture pack issued  
**Sign-off evidence required:** Architecture diagrams, architecture decision record, approval note

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | Inline architectural docs (CLAUDE.md, BACKEND.md, PROJECT.md, UI.md, modules/*/README implied by file tree). Schema definitions are self-documenting. ProcureX migration plan captured in chat. |
| **What's missing** | No single 'architecture pack' artefact. No ADRs (Architecture Decision Records). No formal approval note. |

### 🟢 C2-SC2 — Shared data model  *(Phase 2)*

**Deliverable:** Data model defined and deployed  
**How it's measured:** Core shared data entities/models designed and implemented  
**Target:** Core shared data models deployed  
**Sign-off evidence required:** Shared data schema being used by multiple applications

| | |
|---|---|
| **Status** | **Strong** |
| **What we have** | One Postgres database, two ORMs: Prisma owns 17 tables (User, Masterplan, BoqRun, Configuration, …) used by CostX + BOQs + summary screens; Drizzle owns 48 `px_*` tables used by ProcureX. Users referenced across modules. ConfigModelEntry consumed by 5+ pages. |
| **What's missing** | Formal 'shared data schema' diagram. Documentation of which app uses which entity. |

### 🟡 C2-SC3 — Data access and retrieval  *(Phase 2)*

**Deliverable:** Query and retrieval of data in shared and application data models  
**How it's measured:** Key queries to be defined to showcase successful access to data models  
**Target:** Test queries to return expected results showing (if appropriate) test data  
**Sign-off evidence required:** Test scripts, test execution report, sample output validation

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | Live working queries across both ORMs: getMasterplans, getBenchmarkProjects, getCostModelEntries, getCategoryStatuses, etc. Demo data seeded (28 masterplans, 22 benchmarks, 6 procurex projects, 18 tenderers, 960 cost model entries). Each route smoke-tested HTTP 200. |
| **What's missing** | No formal automated test suite (Vitest/Jest). No execution report. Smoke tests are ad-hoc curl, not codified. |

### 🟠 C2-SC4 — Modular service design  *(Phase 2)*

**Deliverable:** Services separable from other application services  
**How it's measured:** Showcase that modules are deployable independently  
**Target:** 100% of launch modules independently deployable  
**Sign-off evidence required:** Module deployment evidence, dependency map, architecture review

| | |
|---|---|
| **Status** | **Weak** |
| **What we have** | Logical modularity: code organised into `app/{costx,boqs,procurex,benchmarking,...}` route groups and `modules/{identity,workspace,procurex,…}` domain folders. Each module is self-contained per the faithful-port rule. |
| **What's missing** | Physical modularity is monolithic — all modules deploy as one Next.js process. No independent service builds. No dependency map. |

## 3. Integration Capability

### 🟡 C3-SC1 — API and integration design  *(Phase 1)*

**Deliverable:** Integration architecture and API specification completed  
**How it's measured:** Completion of API and interface capability  
**Target:** API configuration documented  
**Sign-off evidence required:** API specification pack, integration architecture document, approval record

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | API surface exists: `app/api/*`, `app/procurex/api/*`, server actions in `modules/*/actions.ts`. Routes auto-documented by Next.js file-system convention. |
| **What's missing** | No OpenAPI/Swagger spec generated. No integration architecture document. No approval record. |

### 🟡 C3-SC2 — API gateway implementation  *(Phase 2)*

**Deliverable:** Secure API gateway deployed  
**How it's measured:** Gateway operational status against agreed design  
**Target:** API gateway live with agreed security controls active  
**Sign-off evidence required:** Gateway configuration evidence, deployment record, security checklist

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | Nginx reverse proxy live in front of Next.js on the VM. Proxies all traffic, sets large body limits (1024M for tender uploads), keeps-alive long extraction reads. |
| **What's missing** | Nginx is a reverse proxy, not a full API gateway. No rate limiting, no per-endpoint auth, no centralised request logging, no quota/throttling. Should adopt Azure API Management or similar for production. |

### 🔴 C3-SC3 — System-to-system connectivity  *(Phase 2)*

**Deliverable:** Application service integration test cases executed  
**How it's measured:** All integration test cases passed  
**Target:** 100% pass rate on defined integration tests  
**Sign-off evidence required:** Integration test report, test logs, transaction evidence

| | |
|---|---|
| **Status** | **Not Started** |
| **What we have** | Ad-hoc smoke tests run during deploys (curl /procurex, /costx, etc.). All routes verified 200 manually. |
| **What's missing** | No integration test framework wired. No test cases defined. No CI test job (CI currently only builds + deploys). |

### 🟡 C3-SC4 — Bidirectional data exchange  *(Phase 3)*

**Deliverable:** End-to-end application service data exchange proven  
**How it's measured:** Number of successful bidirectional transactions completed  
**Target:** Minimum agreed set of test transactions completed successfully  
**Sign-off evidence required:** Transaction logs, sample records, demonstration output

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | Anthropic API integration is fully bidirectional — request → agent loop → submit_verdict tool call → schema validation → persist. Verified end-to-end with a real FoT PDF (4 pages, 2401 in / 1244 out tokens). Workflow run output stored in px_workflow_run. |
| **What's missing** | Other 3rd-party 2-way integrations (e.g. ERP push, Vercel Blob fully wired) not yet defined. No formal 'set of test transactions' documented. |

### 🟢 C3-SC5 — Integration readiness for applications  *(Phase 3)*

**Deliverable:** Integration capabilty for third party application  
**How it's measured:** At least one application service ready to integrate with a third party application  
**Target:** Documented integration instructions  
**Sign-off evidence required:** Integration instructions, assessor confirmation

| | |
|---|---|
| **Status** | **Strong** |
| **What we have** | Anthropic SDK fully wired (`@anthropic-ai/sdk` direct provider). Vercel Blob optional wiring present (`@vercel/blob` installed; falls back to local disk when no token). NextAuth supports OAuth providers (just need to enable Google/MS). |
| **What's missing** | Integration instructions document for a hypothetical 3rd-party app not yet written. Assessor confirmation not pursued. |

## 4. Operational Readiness

### 🟡 C4-SC1 — Delivery governance  *(Phase 1)*

**Deliverable:** Platform delivery governance documented  
**How it's measured:** Completion of agreed governance artefacts  
**Target:** 100% of agreed governance artefacts completed  
**Sign-off evidence required:** Governance playbook, RACI, operating model summary

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | CLAUDE.md (PUB project architectural invariants, kept as a navigation layer). Git history is full and meaningful. Long-form chat transcript captures decisions. Memory file `feedback_faithful_port.md` codifies the do-not-simplify rule. |
| **What's missing** | No RACI matrix. No formal governance playbook. No operating model summary. |

### 🟡 C4-SC2 — Release management  *(Phase 1)*

**Deliverable:** Release process documented and adopted  
**How it's measured:** Completion of formal release management process  
**Target:** Approved release process in place  
**Sign-off evidence required:** Release procedure, approval record, document register

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | De-facto release process: push to main → GitHub Actions builds + rsyncs + pm2 reload → live in ~3 min. Workflow file `.github/workflows/deploy.yml` is the procedure-as-code. README in `.github/workflows/`. |
| **What's missing** | No human-readable release procedure document. No approval record per release. No formal document register. |

### 🟢 C4-SC3 — CI/CD enablement  *(Phase 2)*

**Deliverable:** Automated deployment pipeline operational  
**How it's measured:** Percentage of agreed environments supported by CI/CD pipeline  
**Target:** 100% of agreed environments supported  
**Sign-off evidence required:** CI/CD workflow evidence, pipeline screenshots, deployment logs

| | |
|---|---|
| **Status** | **Strong** |
| **What we have** | GitHub Actions workflow `deploy.yml` triggers on push to main (paths: web/**). Builds on GH runner, rsyncs to Azure VM, applies new Drizzle migrations idempotently, reloads pm2, smoke-tests public IP. ~3 min end-to-end. Last successful run #26712395245. |
| **What's missing** | Test environment not yet covered by CI/CD (Dev/Prod-like only). Rollback not automated. |

### 🟡 C4-SC4 — Change and prioritisation control  *(Phase 1)*

**Deliverable:** Backlog and change control process active  
**How it's measured:** Completion and adoption of prioritisation and change control framework  
**Target:** Approved and in active use  
**Sign-off evidence required:** Backlog process document, change log, governance minutes

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | BACKLOG.md (this file). Git commit history is the change log. Chat transcript captures prioritisation decisions in real time. |
| **What's missing** | No formal backlog process document. No governance minutes. GitHub Issues / Projects not configured. |

### 🟡 C4-SC5 — Operational usability and support  *(Phase 3)*

**Deliverable:** Platform and core modules usable with support ownership defined  
**How it's measured:** Completion of user readiness and support model  
**Target:** Named support ownership active and agreed core modules usable by IOX personnel  
**Sign-off evidence required:** Support model, user walkthroughs, acceptance record

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | All core modules render + work end-to-end (CostX, BOQs, ProcureX, Projects, Benchmarking, Configuration, Rate Analysis). Sign-in works. Demo data populated. Tag `app=IOX-OS` on all Azure resources. |
| **What's missing** | No documented support model. No user walkthroughs / training material. No formal user acceptance record from IOX personnel. |

## 5. Platform Launch / First Live Service

### 🟠 C5-SC1 — Production monitoring  *(Phase 3)*

**Deliverable:** Monitoring and alerting active  
**How it's measured:** Percentage of agreed production monitoring controls enabled  
**Target:** 100% of agreed monitoring controls active  
**Sign-off evidence required:** Monitoring dashboard, alert configuration, operations checklist

| | |
|---|---|
| **Status** | **Weak** |
| **What we have** | pm2 status + pm2 logs (per-process), nginx access/error logs, Postgres logs locally. Activity log table tracks user actions across modules. |
| **What's missing** | No external monitoring (Azure Monitor / Datadog / Sentry). No alerting on crashes / 5xx spikes / queue backups / disk-full. No operations checklist. |

### 🔴 C5-SC2 — Performance validation  *(Phase 3)*

**Deliverable:** Load and performance tests available  
**How it's measured:** Agreed performance measures available  
**Target:** 100% of agreed performance metrics generated  
**Sign-off evidence required:** Load test report, performance test output, assessor review

| | |
|---|---|
| **Status** | **Not Started** |
| **What we have** | Nothing. |
| **What's missing** | No load testing (k6 / Artillery / JMeter). No baseline RPS / latency / error rate captured. No assessor review. |

### 🟢 C5-SC3 — Production deployment  *(Phase 3)*

**Deliverable:** First live service deployed  
**How it's measured:** Count of live services/modules successfully deployed to production  
**Target:** Minimum 1 live service/module deployed  
**Sign-off evidence required:** Production deployment record, release evidence, go-live approval

| | |
|---|---|
| **Status** | **Strong** |
| **What we have** | IOX live at http://20.203.125.83 serving 5+ modules: CostX (masterplan list/editor/summary), BOQs (run dashboard), ProcureX (project + tender wizard), Projects, Benchmarking, Configuration, Rate Analysis. All HTTP 200. CI/CD redeploys on every push. |
| **What's missing** | Formal production deployment record (release notes per deploy). No go-live approval signed. |

### 🟡 C5-SC4 — Production quality assurance  *(Phase 3)*

**Deliverable:** Critical live defects resolved  
**How it's measured:** Number of unresolved critical production defects at sign-off  
**Target:** 0 critical production defects outstanding  
**Sign-off evidence required:** Defect log, remediation record, production readiness report

| | |
|---|---|
| **Status** | **Partial** |
| **What we have** | Defects found in chat have been fixed live: BOQ loader getCell(0) crash, AUTH_TRUST_HOST missing, HeroUI Pro postinstall, NextAuth cookie stale, FoT extraction with empty docs/. Each fix committed. |
| **What's missing** | No formal defect log (severity / status / age tracking). No production readiness report. |

### 🟠 C5-SC5 — Live operational readiness  *(Phase 3)*

**Deliverable:** Live service stable and usable in practice  
**How it's measured:** Completion of agreed live readiness checks and user validation  
**Target:** Production environment stable for at least a week and agreed live module usable by Omnium personnel  
**Sign-off evidence required:** Uptime report, user validation record, go-live sign-off

| | |
|---|---|
| **Status** | **Weak** |
| **What we have** | App live since today (May 31 2026), no observed crashes since the cookie/heroui fixes. pm2 restart counter at 0. |
| **What's missing** | Not yet stable for 1 week (just deployed). No uptime report. No user validation record from Omnium. No go-live sign-off. |

---

## Component level-of-effort (from the PDF)

| Ref | Component | % LoE |
|---|---|---:|
| 1 | Foundation & Security | 10% |
| 2 | Data & Architecture | 45% |
| 3 | Integration Capability | 25% |
| 4 | Operational Readiness | 10% |
| 5 | Platform Launch / First Live Service | 10% |
| **Total** | | **100%** |

## Equity release per phase

| Phase | % LoE |
|---|---:|
| Phase 1 | 5% |
| Phase 2 | 10% |
| Phase 3 | 5% |
| **Total** | **20%** |
