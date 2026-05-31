# IOX × Anthropic — Integration Evidence

> Closes part of **C3-SC4 Bidirectional data exchange** and **C3-SC5
> Integration readiness**. End-to-end trace of a real transaction.

## Why this is "bidirectional"

The Anthropic integration is request/response with **agent tool calls** —
the model emits structured `tool_use` blocks which IOX's local code
executes, then feeds the result back into the next turn. Multiple
round-trips per extraction = bidirectional flow at the application layer.

## Test transaction: real FoT PDF

| Field | Value |
|---|---|
| Date | 2026-05-30 20:58 UTC |
| Document | `1. EMR DCH PUBLIC REALM MW 0214 FOT (DEC 2025).pdf` (4 pages, 240 KB) |
| Spec | `fot` — Form of Tender |
| Path | Single-shot (surface 6 326 chars ≤ 700 000 threshold) |
| Model | `claude-sonnet-4-6` |
| Iterations | 1 (agent submitted verdict in first turn) |
| Input tokens | 2 401 |
| Output tokens | 1 244 |
| Cache tokens | 0 read / 0 write (first call) |
| Total wall time | ~21 s |
| Result | `succeeded` |

## Verdict extracted (truncated)

```json
{
  "project": {
    "name": "Dubai Creek Harbour Public Realm – Main Works",
    "location": "Dubai Creek Harbour, Emirate of Dubai",
    "development": "Dubai Creek Harbour Development"
  },
  "employer": {
    "name": "Dubai Creek Harbour LLC",
    "city": "Dubai",
    "po_box": "9440",
    "country": "United Arab Emirates"
  },
  "tender_date": "2025",
  "percentage_markups": {
    "nominated_subcontractors":  { "percentage": 4, "applicable_to": "Contractor's overheads, profit and attendance..." },
    "variation_orders_and_provisional_sums_not_nominated_subcontractors": { "percentage": 4, "applicable_to": "..." }
  },
  "time_for_completion": {
    "sections": [
      { "section": "Stage 1", "calendar_days": 240, "reference_point": "from and including the Commencement Date" },
      { "section": "Stage 2", "calendar_days": 240, "reference_point": "after the completion of Stage 1" }
    ],
    "whole_works_calendar_days": 480
  },
  "tender_validity_days": 90,
  ...
}
```

Full output stored in `px_workflow_run.output` for inspection:

```sql
SELECT jsonb_pretty(output->'verdict')
FROM px_workflow_run
WHERE id = '<run id>';
```

## Two extraction paths

| Path | Trigger | Model | Best for |
|---|---|---|---|
| **Single-shot** | Surface ≤ 700 000 chars (~175 k tokens) | Sonnet 4.6 (configurable: `AI_DEFAULT_MODEL`) | FoT, ITT, BoQ template (small/medium PDFs) |
| **Chunked** | Surface > 700 000 chars | Haiku 4.5 (configurable: `AI_CHUNKED_MODEL`) | SoPR, large technical specifications (hundreds of pages) |

Router lives at `modules/ai-extraction/agent/runner.ts:184`. The single-shot
path inlines the full pre-extracted surface into the user prompt; chunked
splits into ≤150 k-token units and merges verdicts deterministically.

For dev, `AI_CHUNKED_MAX_UNITS=30` caps the number of chunks processed
(SoPR with ~554 chunks → 30) so dev iterations finish in 1–2 min instead of
30+.

## Failure modes & retry policy

| Failure | Mark | Auto-retry? | Operator action |
|---|---|---|---|
| Network blip / timeout | `requeued` | Yes (re-claimed on next drain) | None — usually self-heals within 1 min |
| Anthropic 401 (bad key) | `failed` | No | Update `ANTHROPIC_API_KEY` in `.env`, `pm2 reload --update-env`, manually re-queue stuck jobs |
| Anthropic 429 (rate limit) | `requeued` | Yes (with backoff via `next_attempt_at`) | None |
| Verdict fails Zod validation | `failed` | No | Investigate the agent prompt (`docs/prompts/<spec>.md`) — usually a schema drift |
| Worker crashed mid-extraction | `requeued` after 10 min (via `reclaimStuck`) | Yes | None |

## Configuration reference

| Env var | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required, length ≥ 10) | API key |
| `AI_DEFAULT_MODEL` | `claude-sonnet-4-6` | Single-shot model |
| `AI_CHUNKED_MODEL` | `claude-haiku-4-5` | Chunked model |
| `AI_DEFAULT_EFFORT` | `medium` | Thinking budget bucket |
| `AI_MAX_ITERATIONS` | `500` | Per-extraction loop cap |
| `AI_MAX_TOKENS` | `32000` | Per-call max output tokens |
| `AI_CHUNKED_MAX_UNITS` | `0` (no cap) | Dev cap; we set `30` |
| `AI_CLASSIFY_DISABLED` | `false` | Disable the optional upload-classifier Haiku call |

## Cost evidence

Cost computed inline by `getCategoryStatuses` for each successful run (Sonnet
4.6 pricing: $3/$15 per Mtok input/output). Displayed in the accordion
footer after extraction. Aggregated cost per project comes from summing
`px_workflow_run.output.totals` rows.

## Renewal / monitoring

- API key lives in VM `.env` + GitHub Actions secrets — not in source.
- Anthropic spend visible at https://console.anthropic.com — monitor weekly.
- See `docs/governance/support-model.md` for rotation procedure.
