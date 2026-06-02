# Release v0.4.0 — RatesX AI Assistant

**Released:** 2026-06-02
**Commit range:** `0d95df8..HEAD`
**Staging URL:** http://20.203.125.83/rates/assistant

## Headline

A plain-English assistant over the RatesX warehouse. Ask "what's the
benchmarked rate per m² for reinforced concrete in the UAE?" and a
tool-calling agent runs live SQL against the v2 facts, then streams a
grounded answer — median, q1–q3 range, sample size, currency, and a
caveat. Every number comes from a query; when the library has no data it
says so rather than inventing one. Answers are fully dynamic — no canned
responses.

## What's in this release

### Tool-calling agent (`modules/rates/lib/ai/`)

- Five read-only query tools over the v2 star schema:
  `list_dimensions`, `benchmark_rate`, `market_rate`,
  `elemental_breakdown`, `escalation`.
- `agent.ts` drives the loop (streaming + non-streaming), capped at 8
  iterations, on the shared model client (`AI_DEFAULT_MODEL`). The system
  prompt enforces: ground every number in a tool, be conversational
  (say what you're checking, then run it), and never estimate when a tool
  returns no rows.
- `benchmark_rate` returns a `currencyAvailability` breakdown on empty
  results, so the agent explains *where* data lives (e.g. "Roads: 11
  projects with no currency, 1 in AED") instead of dead-ending.

### Streaming API (`app/api/rates/assistant/route.ts`)

- Server-Sent Events: `text` token deltas, `tool` / `tool_result`
  events, `done`. Gated on the model API key (`503` when unconfigured).

### Chat UI (`/rates/assistant`)

- ChatGPT-style layout: centered greeting + composer + example chips on
  the empty state; centered conversation column with a pinned bottom
  composer once chatting.
- Assistant messages render as plain flowing markdown (GFM tables for
  rate breakdowns) with block-level memoization; user messages are soft
  pills.
- Chain-of-thought panel under each answer showing each live query and
  its outcome; shimmering "Thinking…" while streaming.
- Copy / 👍 / 👎 / regenerate actions; status-driven composer with a
  stop button that aborts mid-generation.
- Wired to the "AI Assistant" card on the RatesX home.

### Documentation

- New module reference `docs/modules/ratesx-ai.md` (architecture, tools,
  agent loop, streaming, data coverage, common edits, file map).

## Known limitations

| Item | Detail |
|---|---|
| Infrastructure benchmarks return little in AED | Infra elements sit on projects with no currency assigned; the assistant explains this rather than estimating. |
| No semantic similarity | Material matching is full-text/ILIKE, not embeddings. |
| Uncaptured splits | RTA-vs-private, curtain-wall-vs-cladding, green-cert premium %, precast-vs-in-situ, city-level — no such dimension; the assistant says so. |
| Out-of-band data | New uploads appear only after the v2 backfill/classify scripts run. |
| HeroUI Pro chat blocks | `PromptInput`/`ChainOfThought`/`Markdown`/`ChatMessage`/`TextShimmer` aren't in the installed package; faithful equivalents are implemented in-repo. |

## Verification

| Check | Result |
|---|---|
| `/rates/assistant` returns 200 | ✅ |
| Streams tool-use then a grounded answer (reinforced concrete → 701 AED/m², 88 projects) | ✅ |
| Returns honest "no data" + currency availability for infra/UAE/AED | ✅ |
| `tsc --noEmit` clean | ✅ |
| Stop button aborts a live stream | ✅ |

## Approval

| Approver | Role | Approved at | Notes |
|---|---|---|---|
| Taj Noah | Tech Lead | 2026-06-02 | Conversational front door to the rates library; grounded-only by construction (tools query, model composes). |

## Next milestones

See [PLAN.md](../../../PLAN.md). Likely v0.5.0: more query tools
(`compare_regions`, `material_trend`, `design_ratio`, `project_lookup`),
backfilling currency on infrastructure projects, and a material-price
time series.
