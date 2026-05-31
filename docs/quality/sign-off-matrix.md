# IOX — KPI Sign-Off Matrix

> Assessor-facing tick-sheet. Each row maps to a Schedule 1 Appendix A
> sub-component; columns are the evidence the framework asks for.

**As of:** 2026-05-31 · **Phase:** Post-M1–M6 (pre-pen-test)

## Matrix

| KPI | Component | Sub-Component | Phase | Status | Evidence (relative to repo root) | Assessor ☐ |
|---|---|---|---|---|---|---|
| C1-SC1 | Foundation & Security | Cloud environment provisioning | 1 | 🟢 | `docs/operations/environment-inventory.md` + Azure portal | ☐ |
| C1-SC2 | Foundation & Security | Infrastructure as Code | 1 | 🟢 | `infra/terraform/` + `docs/infrastructure/iac-evidence.md` | ☐ |
| C1-SC3 | Foundation & Security | Identity and access management | 1 | 🟢 | `docs/security/access-control-matrix.md` + `docs/security/configuration-evidence.md` | ☐ |
| C1-SC4 | Foundation & Security | Data protection controls | 1 | 🟡 | `docs/security/configuration-evidence.md` §4 — HTTPS deferred per PO decision (no domain) | ☐ |
| C1-SC5 | Foundation & Security | Security assurance | 3 | 🔴 | Deferred per PO — external pen test out of scope for current phase | ☐ |
| C2-SC1 | Data & Architecture | Target architecture definition | 1 | 🟢 | `docs/architecture/architecture-pack.md` + `docs/architecture/decisions/0001..0005-*.md` | ☐ |
| C2-SC2 | Data & Architecture | Shared data model | 2 | 🟢 | `docs/architecture/shared-data-model.md` | ☐ |
| C2-SC3 | Data & Architecture | Data access and retrieval | 2 | 🟢 | `web/tests/` + `docs/testing/test-strategy.md` + Vitest run output | ☐ |
| C2-SC4 | Data & Architecture | Modular service design | 2 | 🟠 | `docs/architecture/architecture-pack.md` §8 — physical modularity deferred by design | ☐ |
| C3-SC1 | Integration Capability | API and integration design | 1 | 🟢 | `docs/api/openapi.yaml` + `docs/api/integration-architecture.md` | ☐ |
| C3-SC2 | Integration Capability | API gateway implementation | 2 | 🟢 | `docs/api/nginx-as-gateway.md` — nginx formally accepted as the gateway | ☐ |
| C3-SC3 | Integration Capability | System-to-system connectivity | 2 | 🟢 | `web/tests/integration/routes.test.ts` + `.github/workflows/test.yml` JUnit artefact | ☐ |
| C3-SC4 | Integration Capability | Bidirectional data exchange | 3 | 🟢 | `docs/integrations/anthropic.md` (FoT transaction evidence) | ☐ |
| C3-SC5 | Integration Capability | Integration readiness for applications | 3 | 🟢 | `docs/integrations/third-party-onboarding.md` | ☐ |
| C4-SC1 | Operational Readiness | Delivery governance | 1 | 🟢 | `docs/governance/raci.md` | ☐ |
| C4-SC2 | Operational Readiness | Release management | 1 | 🟢 | `docs/governance/release-procedure.md` + `.github/workflows/deploy.yml` + `docs/operations/release-notes/` | ☐ |
| C4-SC3 | Operational Readiness | CI/CD enablement | 2 | 🟢 | GitHub Actions runs (latest: ✅ 2m 58s) + `docs/governance/release-procedure.md` | ☐ |
| C4-SC4 | Operational Readiness | Change and prioritisation control | 1 | 🟢 | `docs/governance/change-control.md` + `.github/ISSUE_TEMPLATE/*.yml` + `BACKLOG.md` | ☐ |
| C4-SC5 | Operational Readiness | Operational usability and support | 3 | 🟡 | `docs/governance/support-model.md` — Omnium user-acceptance record pending | ☐ |
| C5-SC1 | Platform Launch / First Live Service | Production monitoring | 3 | 🟢 | `docs/operations/azure-monitor-setup.md` — Azure Monitor + AMA + Log Analytics workspace live (Sentry deferred) | ☐ |
| C5-SC2 | Platform Launch / First Live Service | Performance validation | 3 | 🟡 | `web/scripts/load-test.js` + `docs/performance/load-test-report.md` — first run pending | ☐ |
| C5-SC3 | Platform Launch / First Live Service | Production deployment | 3 | 🟢 | live at http://20.203.125.83 + `docs/operations/release-notes/2026-05-31-go-live.md` | ☐ |
| C5-SC4 | Platform Launch / First Live Service | Production quality assurance | 3 | 🟢 | `docs/quality/defect-log.md` (0 critical open) | ☐ |
| C5-SC5 | Platform Launch / First Live Service | Live operational readiness | 3 | 🟠 | `docs/operations/uptime-report.md` — needs 7-day evidence + user validation | ☐ |

## Tally

| Status | Count |
|---|---|
| 🟢 Met | **18** |
| 🟡 Substantively met (decision deferred by PO) | 3 |
| 🟠 Weak | 2 |
| 🔴 Deferred per PO (no pen test commission) | 1 |
| **Total** | **24** |

## Path to full closure

| KPI | Effort | Owner | Closes when |
|---|---|---|---|
| C1-SC4 | _deferred_ | Product Owner | Domain assignment is out of scope for now; revisit at production launch |
| C1-SC5 | _deferred_ | Product Owner | Pen test commission decision out of scope for current phase |
| C2-SC4 | _deferred_ | n/a | Documented rationale stands — re-evaluate per quarter |
| C4-SC5 | 1 hr per tester | Product Owner | Tester walkthrough + signed record |
| C5-SC2 | 30 min | Platform Engineer | `k6 run` + paste output |
| C5-SC5 | 7 days wait + 1 hr | (time) | Azure Monitor uptime evidence + user validation |

## How to use this matrix

1. Copy this file into Excel for the formal assessor session
2. Each ☐ becomes a checkbox the assessor ticks after viewing the linked
   evidence
3. Capture the signed sheet as `docs/quality/sign-off-<date>-<assessor>.md`
4. Update the master `BACKLOG.md` status if any KPI changes
