# IOX — Support Model

> Closes part of **C4-SC5 Operational usability and support**. Names who
> supports what, with response targets.

## Ownership map

| Surface | Primary owner | Backup | Hours |
|---|---|---|---|
| **VM / infra / nginx / Postgres / pm2** | Platform Engineer (Taj) | — | Business hours UAE |
| **Next.js app code (all routes)** | Tech Lead (Taj) | — | Business hours UAE |
| **AI extraction pipeline (Anthropic)** | Tech Lead (Taj) | — | Business hours UAE |
| **GitHub Actions / CI** | Platform Engineer (Taj) | — | Business hours UAE |
| **HeroUI Pro license** | Tech Lead (Taj) | — | License-vendor dependent |
| **Anthropic API account / billing** | Tech Lead (Taj) | — | — |
| **Azure subscription / billing** | Tech Lead (Taj) | — | — |

> Today everything is owned by a single person. The structure will expand as
> the team grows; this is the placeholder.

## Severity definitions

| Sev | Definition | Response target | Resolution target |
|---|---|---|---|
| **P1** | Site fully down OR data loss in progress | 15 min | 4 hours |
| **P2** | Major feature broken (sign-in, masterplan editor, extraction queue stuck) | 1 hour | 1 business day |
| **P3** | Minor feature degraded, UI bug, slow response | 1 business day | 1 week |
| **P4** | Documentation / enhancement request | 1 week | Next sprint |

## Reporting an issue

| How | Where | Use for |
|---|---|---|
| GitHub Issues | `tajalagawani/BOQs-master` issues | P3 / P4, feature requests |
| Direct message to Tech Lead | Email / Slack | P1 / P2 + after-hours |
| `gh issue create` from CLI | template at `.github/ISSUE_TEMPLATE/` | Anything you'd file as an issue |

## Common operational tasks (runbook references)

| Task | Procedure | Owner |
|---|---|---|
| Re-deploy after a fix | Push to `main` → CI auto-deploys (~3 min) | Tech Lead |
| Re-bootstrap a fresh VM | Run `bash scripts/azure-bootstrap.sh` (after env file staged) | Platform Engineer |
| Re-seed demo data | `npx tsx scripts/seed-procurex.ts` | Platform Engineer |
| Rotate AUTH_SECRET | Edit VM `.env` → pm2 reload | Platform Engineer |
| Rotate ANTHROPIC_API_KEY | Edit VM `.env` → pm2 reload | Tech Lead |
| Rotate HEROUI_AUTH_TOKEN | Generate new in HeroUI dashboard → update GH secret + VM `/tmp/iox-bootstrap.env` | Tech Lead |
| Inspect AI extraction queue | `psql -c "SELECT * FROM px_extraction_job ORDER BY created_at DESC LIMIT 10"` | Platform Engineer |
| Kill stuck extraction job | `psql -c "DELETE FROM px_extraction_job WHERE id = '<id>'"` (or workflow reset) | Platform Engineer |
| Tail app logs | `ssh iox@<vm> 'pm2 logs iox-web --nostream --lines 100'` | Platform Engineer |
| Restart worker | `ssh iox@<vm> 'pm2 restart iox-worker'` | Platform Engineer |
| Restore from backup | Manual: `pg_restore` from Azure Backup Vault | Platform Engineer (procedure TBD — M5+) |

## User-acceptance acceptance template

When IOX personnel validate the platform end-to-end, capture in
`docs/operations/user-acceptance/<date>-<user>.md`:

```
Tester:          <name>
Tested at:       <ISO date>
Modules tested:  [ ] CostX  [ ] BOQs  [ ] ProcureX  [ ] Projects  [ ] Benchmarking  [ ] Configuration
Outcome:         pass / pass-with-notes / fail
Issues raised:   (link to issues filed)
Sign-off:        <signature / approval>
```
