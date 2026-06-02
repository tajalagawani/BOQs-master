# IOX — RACI Matrix

> Closes part of **C4-SC1 Delivery governance**. Names who's **R**esponsible,
> **A**ccountable, **C**onsulted, **I**nformed for each major activity.

## Roles

| Role | Person / Team |
|---|---|
| **Tech Lead** (TL) | Taj Noah |
| **Platform Engineer** (PE) | Taj Noah (AI-assisted) |
| **QS Domain Lead** (QS) | TBD — appoint before ProcureX user rollout |
| **Assessor** | external sign-off authority per Schedule 1 |

> Solo-dev / AI-assisted today. Names will expand as the team grows; the
> RACI structure is the placeholder.

## Activities

| Activity | TL | PE | QS | Assessor |
|---|---|---|---|---|
| **Product strategy / roadmap** | A/R | I | C | I |
| **Architecture decisions (ADRs)** | A/R | C | I | I |
| **Schema migrations** | A | R | C | I |
| **Code reviews on `main` PRs** | A/R | R | I | — |
| **CI/CD pipeline maintenance** | A | R | — | — |
| **Deploys** | A/R | R | I | I |
| **Incident response (P1/P2)** | A/R | R | C | I |
| **Security audits & pen tests** | A/R | C | I | A/R |
| **License & secret rotation** | A | R | — | — |
| **User onboarding** | A | R | R | — |
| **QS workflow validation (ProcureX)** | C | I | A/R | I |
| **Cost / spend monitoring (Azure, Anthropic)** | A/R | R | — | — |
| **KPI sign-off (Schedule 1)** | A/R | C | C | A/R |
| **Backlog grooming** | A/R | I | C | — |
| **Release notes & docs upkeep** | A | R | C | I |

## Decision authority

| Decision class | Approver |
|---|---|
| Architectural change (touches ADR scope) | Tech Lead |
| Schema change requiring data migration | Tech Lead |
| New module / route group added | Tech Lead |
| New 3rd-party SaaS dependency | Tech Lead |
| Cost change > $50/mo | Tech Lead |
| Security policy change | Tech Lead + Assessor |
| External vendor commissioning (e.g., pen test) | Tech Lead |

## Escalation path

1. Platform Engineer (operational issue)
2. Tech Lead (technical / business decision needed)
3. Assessor (compliance / sign-off)
