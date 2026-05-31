# IOX — RACI Matrix

> Closes part of **C4-SC1 Delivery governance**. Names who's **R**esponsible,
> **A**ccountable, **C**onsulted, **I**nformed for each major activity.

## Roles

| Role | Person / Team |
|---|---|
| **Product Owner** (PO) | Taj Noah |
| **Tech Lead** (TL) | Taj Noah |
| **Platform Engineer** (PE) | Taj Noah (AI-assisted) |
| **QS Domain Lead** (QS) | TBD — appoint before ProcureX user rollout |
| **Assessor** | external sign-off authority per Schedule 1 |

> Solo-dev / AI-assisted today. Names will expand as the team grows; the
> RACI structure is the placeholder.

## Activities

| Activity | PO | TL | PE | QS | Assessor |
|---|---|---|---|---|---|
| **Product strategy / roadmap** | A/R | C | I | C | I |
| **Architecture decisions (ADRs)** | A | R | C | I | I |
| **Schema migrations** | I | A | R | C | I |
| **Code reviews on `main` PRs** | I | A/R | R | I | — |
| **CI/CD pipeline maintenance** | I | A | R | — | — |
| **Production deploys** | I | A/R | R | I | I |
| **Incident response (P1/P2)** | A | R | R | C | I |
| **Security audits & pen tests** | A | R | C | I | A/R |
| **License & secret rotation** | I | A | R | — | — |
| **User onboarding** | A | C | R | R | — |
| **QS workflow validation (ProcureX)** | C | C | I | A/R | I |
| **Cost / spend monitoring (Azure, Anthropic)** | A | R | R | — | — |
| **KPI sign-off (Schedule 1)** | A | R | C | C | A/R |
| **Backlog grooming** | A/R | C | I | C | — |
| **Release notes & docs upkeep** | I | A | R | C | I |

## Decision authority

| Decision class | Approver |
|---|---|
| Architectural change (touches ADR scope) | Tech Lead |
| Schema change requiring data migration | Tech Lead + PO sign-off |
| New module / route group added | PO |
| New 3rd-party SaaS dependency | PO |
| Cost change > $50/mo | PO |
| Security policy change | Tech Lead + Assessor (for prod) |
| External vendor commissioning (e.g., pen test) | PO |

## Escalation path

1. Platform Engineer (operational issue)
2. Tech Lead (technical decision needed)
3. Product Owner (business impact)
4. Assessor (compliance / sign-off)
