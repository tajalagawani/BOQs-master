# IOX — Change Control

> Closes **C4-SC4 Change and prioritisation control**. How work is captured,
> prioritised, and authorised before it ships.

## Backlog

The single source of truth for outstanding work is `BACKLOG.md` (KPI scope) +
GitHub Issues (everything else). Re-generate the KPI side via
`node scripts/build-backlog.mjs`.

## Issue lifecycle

```
[idea] → file issue (template at .github/ISSUE_TEMPLATE/)
   │
   ▼
[triaged] → priority assigned (P1..P4) + milestone optional + assignee
   │
   ▼
[in progress] → branch off main, work, push, open PR
   │
   ▼
[in review] → Tech Lead reviews diff, runs checklist
   │
   ▼
[merged] → CI deploys to live VM automatically (~3 min)
   │
   ▼
[verified] → curl smoke / manual verification → close issue with reference to deploy SHA
```

## Prioritisation rules

| Priority | Triggered by | SLA to start | SLA to ship |
|---|---|---|---|
| **P1** | Outage / data loss | Immediately | Same day |
| **P2** | Major feature broken | Same business day | Same week |
| **P3** | Minor bug / small enhancement | Same week | Next sprint (2 wk) |
| **P4** | Nice-to-have | When capacity allows | No commitment |

## Change-control gates

For changes that **must not** ship without explicit approval:

| Trigger | Required approvals |
|---|---|
| New module (top-level route group) | Tech Lead |
| Schema migration (Prisma or Drizzle) | Tech Lead |
| Production-touching infra change (NSG, VM SKU, image, secrets) | Tech Lead |
| New 3rd-party paid service | Tech Lead |
| Removal of feature already in production | Tech Lead |
| Change to RBAC / permission helpers | Tech Lead |
| Change to release/deploy pipeline | Tech Lead |
| Pen-test remediation that touches business logic | Tech Lead + Assessor |

For changes inside an approved scope (typical feature work, bug fixes, docs),
PR + Tech Lead review is sufficient.

## Change log

The git commit history *is* the authoritative change log. Use:

```bash
git log --pretty=format:'%h  %ad  %s' --date=short
```

For per-release narratives, see `docs/operations/release-notes/`.

## Governance minutes

When the team grows beyond 1 person, a weekly 30-min standing meeting
captures:
- Issues triaged this week
- KPIs that changed status
- Outages or near-misses
- Upcoming change-control gates

Notes live in `docs/governance/minutes/YYYY-MM-DD.md`. Until that team grows,
the chat / commit history serves as the minutes.

## Issue templates

See `.github/ISSUE_TEMPLATE/`:
- `bug.yml` — bug report with severity selector
- `feature.yml` — feature request with priority guidance
