# IOX — Monitoring & Alerting Runbook

> Closes **C5-SC1 Production monitoring** (once Sentry DSN is wired). Tells
> the on-call what to watch and what to do when a signal fires.

## Signals + thresholds

| Signal | Source | Threshold | Severity | Action |
|---|---|---|---|---|
| HTTP 5xx rate on any route | Sentry / nginx access log | > 1% over 5 min | P2 | Check pm2 logs → identify failing route → roll back or hotfix |
| Public IP unreachable | external ping / Better Uptime | down for ≥ 2 consecutive checks | P1 | SSH → `systemctl status nginx`, `pm2 status` → restart or escalate |
| Sentry unhandled error spike | Sentry alert rule | > 10 new events / 10 min | P2 | Open Sentry issue → assign → fix → resolve |
| AI extraction queue backlog | DB query (see below) | `count(*) WHERE status='queued' AND age > 5 min` ≥ 5 | P3 | Trigger worker drain manually; if persists, check Anthropic 429s |
| Postgres connection pool exhausted | pm2 stderr | `Error: timeout exceeded when trying to connect` | P2 | Restart iox-web; investigate slow queries |
| VM CPU sustained > 90% | Azure Monitor | 15 min | P3 | Resize to D4s_v3 or split workload |
| VM RAM sustained > 90% | Azure Monitor | 15 min | P3 | Resize; check for leaks in pm2 |
| Disk > 80% full | Azure Monitor | 1 sample | P3 | Clean uploads/ + runs/, expand OS disk |
| HTTPS cert expiring | certbot.timer log | < 14 days | P3 | Verify auto-renew, force `certbot renew` if stuck |
| Anthropic spend | console.anthropic.com | > $X/month | P3 | Investigate runaway extractions; lower AI_CHUNKED_MAX_UNITS |

## Where each signal lives

| Source | Setup |
|---|---|
| **Sentry** | `sentry.*.config.ts` in web/. Activate by setting `SENTRY_DSN` in VM `.env` + reload pm2. Free tier covers ≤ 5k events/mo |
| **Azure Monitor** | Enable VM Insights: `az vm extension set --vm-name iox-vm-01 -g iox-rg --publisher Microsoft.Azure.Monitor --name AzureMonitorLinuxAgent` |
| **External uptime** | Free tier of [BetterUptime](https://betteruptime.com) or UptimeRobot, hit `http://20.203.125.83/` every minute |
| **Postgres queries** | psql-from-laptop with VM SSH tunnel: `ssh -L 5432:localhost:5432 iox@<vm>` |

## Useful queries

```sql
-- Extraction queue health
SELECT status, count(*), MAX(NOW() - created_at) AS oldest_age
FROM px_extraction_job
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Slow recent extractions
SELECT id, status, attempts,
       EXTRACT(EPOCH FROM (finished_at - started_at))::INT AS seconds,
       SUBSTR(last_error, 1, 80)
FROM px_extraction_job
WHERE finished_at > NOW() - INTERVAL '1 hour'
ORDER BY seconds DESC NULLS LAST
LIMIT 10;

-- Cross-module activity log (last 200 events)
SELECT created_at, action, entity_type, user_id
FROM activity_logs
ORDER BY created_at DESC
LIMIT 200;
```

## Useful pm2 commands

```bash
pm2 status                                    # quick health
pm2 logs iox-web --nostream --lines 200       # last 200 lines
pm2 logs iox-web --err --nostream --lines 50  # errors only
pm2 reload ecosystem.config.cjs --update-env  # reload with new env
pm2 restart iox-worker                        # hard restart one process
pm2 monit                                     # live CPU/RAM TUI
```

## Incident playbook (P1 outage)

1. **Confirm**: hit `http://20.203.125.83/` from two networks
2. **Triage**: SSH → `pm2 status` (processes online?) → `sudo systemctl status nginx` (proxy up?) → `sudo systemctl status postgresql` (DB up?)
3. **Quick wins**:
   - Both pm2 down → `pm2 resurrect` (restores from saved dump)
   - nginx down → `sudo nginx -t && sudo systemctl restart nginx`
   - DB down → `sudo systemctl restart postgresql`
4. **If unfixed in 15 min**: revert the last deploy
   ```bash
   gh workflow run deploy.yml --ref <last-good-sha>
   ```
5. **Post-incident**: file an issue, write a 1-page postmortem to `docs/incidents/<date>-<slug>.md`, update this runbook if a new signal/threshold is needed.

## Alert rules to configure (one-time setup)

In Sentry:
- Issue alert: "Unresolved issue created" → email + (optional) Slack
- Metric alert: "Error rate > 1% over 5 min" → email

In Azure Monitor:
- Metric alert: CPU > 90% for 15 min → email
- Metric alert: Available memory < 800 MB for 10 min → email
- Metric alert: Disk read latency > 100 ms p95 → email

In BetterUptime (or equivalent):
- Monitor `http://20.203.125.83/` every 60s, expect 200
- Monitor `http://20.203.125.83/procurex/sign-in` every 5 min, expect 200
- Escalation policy: 2 consecutive failures → email + SMS to Tech Lead
