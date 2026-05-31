# IOX — Uptime Report

> Closes **C5-SC5 Live operational readiness** (when populated with ≥ 7 days
> of clean uptime). Template; replace with screenshots / CSV exports from
> BetterUptime / Azure Monitor weekly.

## Current status (manual snapshot)

| Field | Value |
|---|---|
| **First go-live** | 2026-05-31 |
| **Last update** | 2026-05-31 |
| **Currently up?** | ✅ (`curl http://20.203.125.83/` → 200) |
| **pm2 restart count (since deploy)** | 0 |
| **Known outages this week** | 0 |

## How to populate

After signing up for an uptime monitor (BetterUptime / UptimeRobot free tier):

```bash
# Weekly CSV export from BetterUptime
# 1. Settings → Reports → Download CSV
# 2. Append to docs/operations/uptime-history.csv
```

## Targets

| Window | SLA | Status today |
|---|---|---|
| 7-day rolling | ≥ 99.5% | (insufficient data — first deploy 2026-05-31) |
| 30-day rolling | ≥ 99.0% | (insufficient data) |
| 90-day rolling | ≥ 99.0% | (insufficient data) |

## Uptime evidence required for KPI sign-off

The framework asks for "Production environment stable for at least a week
and agreed live module usable by Omnium personnel". To demonstrate:

1. Run external uptime monitor for ≥ 7 calendar days starting from go-live
2. Export the 7-day report (CSV + screenshot)
3. Append a user-validation record from at least one Omnium tester (see
   `docs/governance/support-model.md` for the template)
4. Sign off in `docs/quality/production-readiness-report.md`

## Manual uptime check (interim, until automated monitor is live)

Quick command to spot-check the public IP and log the result:

```bash
echo "$(date -u +%FT%TZ) $(curl -s -o /dev/null -w '%{http_code} %{time_total}s' http://20.203.125.83/)" \
  >> docs/operations/uptime-spot-checks.log
```

Schedule via `cron` for crude uptime data while a real monitor is being set up.
