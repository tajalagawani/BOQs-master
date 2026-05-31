# IOX — Load-Test Report

> Closes **C5-SC2 Performance validation**. Run k6 and append a new row to
> the table whenever the load changes meaningfully (new module, infra change,
> traffic spike).

## How to run

```bash
# Install once (Mac)
brew install k6

# Against the live VM
BASE_URL=http://20.203.125.83 k6 run web/scripts/load-test.js

# Against local dev
npm --prefix web run dev &
k6 run web/scripts/load-test.js
```

Test profile (defined in the script):

- Ramp: 0 → 5 VUs in 30 s → 20 VUs in 30 s → hold 20 VUs for 60 s → ramp down 30 s
- Total: ~2.5 minutes per run
- Mix: random pick across 8 public routes
- Thresholds: `http_req_failed < 1%`, `p95 latency < 1 s`

## Run history

| Run # | Date | Target | VUs | Iterations | p95 (ms) | p99 (ms) | Error rate | Pass? | Notes |
|---|---|---|---|---|---|---|---|---|---|
| _Template — fill in after first real run_ | | | | | | | | | |

After each run, copy from k6's printed summary into the row above.

## Baseline targets

| Metric | Target | Action if missed |
|---|---|---|
| p95 latency | < 1 000 ms | Profile slow route; check pm2 CPU; consider VM resize |
| p99 latency | < 2 500 ms | Investigate tail (DB lock? cold cache?) |
| Error rate | < 1% | Inspect Sentry / pm2 logs for the failing route |
| VUs sustained | 20 | If we expect more, scale up (D4s_v3) or out (second VM behind a load balancer) |

## Capacity context

The current VM is `Standard_D2s_v3` — 2 vCPU / 8 GB RAM. Empirical headroom
(observed during normal dev):

- ~5% CPU at rest
- ~30% CPU during AI extraction (worker is fetch+parse-bound)
- ~150 MB RAM per pm2 process (web + worker)

A 20-VU load test on routes that don't trigger AI extraction should leave
ample headroom. The first real run will set the actual numbers.

## Where the JSON output lands

`web/tests/.last-load-test.json` — full k6 JSON dump, useful for graphing
trends later (feed into Grafana, etc.). `.gitignore` should keep this from
being committed.
