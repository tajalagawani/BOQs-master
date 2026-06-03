# Release v0.5.0 — Project Pulse + Unified Module Shell

**Released:** 2026-06-03
**Commit range:** `934e5a4..HEAD`
**Staging URL:** http://20.203.125.83/

## Headline

Project Pulse is now live data, per module — and every module home page
renders from one shared, fully responsive shell that fits the viewport
without scrolling. The right-hand Pulse widget stopped being a mockup:
each module computes its own rollup server-side from the real database,
with graceful empty and error states. The card walls now flex to fit any
screen height instead of clipping.

## What's in this release

### Project Pulse — dynamic & per-module (`lib/pulse/`)

- New serializable data contract (`ProjectPulseData`) plus a per-module
  provider layer: `getCostxPulse`, `getProcurexPulse`, `getBoqsPulse`,
  `getHomePulse`, `getProjectsPulse`. The widget is now purely
  presentational and consumes the contract.
- Each module shows its own view:
  - **CostX** — masterplan portfolio: count, total plan value, average
    cost/GFA, and a plan-maturity bar (approved ÷ total).
  - **ProcureX** — tender portfolio: pending tenders, total budget,
    active count, returns due in 7 days, committed-vs-budget bar.
  - **BOQs** — template/item rollup with item-level pricing progress.
  - **Home / Projects** — cross-module rollups (masterplans, tenders,
    BOQs, benchmarks, portfolio value).
- "Recent Activity" is wired to the real audit log, filtered per module.
- Currency-aware money formatting (₹ crore/lakh; B/M/K otherwise). Every
  provider is failure-isolated and degrades to an empty/error state
  rather than throwing.
- RatesX keeps its bespoke Data-Freshness panel by design.

### Unified module shell (`components/workspace/WorkspaceShell.tsx`)

- One shared layout used by every module home page — `WorkspaceShell`,
  `ModuleHero`, `WorkspaceSearch`, `CardGrid`, `WorkspaceFooter` — so all
  pages share identical chrome, spacing, and behaviour.
- Fully responsive with no page scroll: the card wall fills the viewport
  via `auto-rows-fr` (rows shrink to fit) with a per-card `max-h` cap
  (cards never balloon); hero, search, controls and footer stay pinned.
- Home, Projects, CostX, ProcureX, BOQs and RatesX all migrated onto it.

## Known limitations

| Item | Detail |
|---|---|
| BOQ Pulse is empty until templates exist | Counts come from the structured `px_boq_*` tables; demo cards on the grid are separate samples. |
| ProcureX tiles use confirmed columns only | There are no separate instruction / change-order / PO tables yet, so those metrics are omitted rather than faked. |
| CostX table view scrolls internally | A long masterplan table scrolls within its own region; the page itself never scrolls. |
| Cross-module money is approximate | Home/Projects totals sum across currencies using the dominant currency. |

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` clean | ✅ |
| Unit suite (Pulse formatters) green | ✅ 22/22 |
| Home / Projects / CostX / BOQs / RatesX render 200 with live Pulse + shared shell | ✅ |
| Pulse degrades to empty/error states without throwing | ✅ |

## Approval

| Approver | Role | Approved at | Notes |
|---|---|---|---|
| Taj Noah | Tech Lead | 2026-06-03 | Pulse is grounded in real queries; all module homes share one responsive shell. |

## Next milestones

See [PLAN.md](../../../PLAN.md). Likely next: cache-tag invalidation so
Pulse tiles refresh on mutation, `<Suspense>` streaming with the Pulse
skeleton, and richer ProcureX metrics once instruction/change-order
tables land.
