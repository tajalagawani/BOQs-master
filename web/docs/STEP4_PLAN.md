# Step 4 — Configure Outputs — Full Implementation Plan

Reference plan for completing **Step 4: Configure Outputs** on the
project-setup wizard (`app/projects/new/step-4-configure.tsx`). Step 4
captures **how the rate analysis runs** — which baseline to compare
each bidder against, when a rate gets flagged High or Low, how to handle
items the bidder left unpriced, and which appendices to include in the
two output packs.

Today the UI is 100% client-state — 890 lines of `useState`, no backend.
This doc specifies the gap, the build order, and the inline UI copy a
user will see in each state. Mirror of `docs/STEP3_PLAN.md`.

---

## 0. Scope at a glance

Step 4 produces **two configurations**, one per "audience":

| Context | Audience | Purpose |
| --- | --- | --- |
| **PTC** | Tenderers (bidders) | What we send to bidders in the Post-Tender Clarification pack — questions about high rates, lists of unpriced items, requests for re-pricing. |
| **Tender** | Employer / client | What we report internally — full comparison incl. low rates, normalised totals, employer-facing analytics. |

Each config has the same 4 sub-steps:

1. **High-Rate Analysis** — which baseline to compare against (avg of lowest 3 / median / avg of all / PTE).
2. **Variance Thresholds** — at what % above/below the baseline does an item get flagged.
3. **Unpriced Items** — list-only or normalise (using avg / PTE).
4. **Summary** — which appendices to include in each pack (toggles + checkboxes).

What Step 4 IS:
- The settings panel. Persists choices to `analysis_config` rows bound to the round.
- The "lock" before analysis runs — once Step 4 is saved, `runAnalysis(roundId)` consumes these configs.

What Step 4 is NOT:
- It does **not** run the analysis itself — that's the `runAnalysis()` pipeline (separate phase, BACKEND_PLAN §6.2).
- It does **not** generate PTC packs or Tender reports — that's Step 5/6.
- It does **not** display flag results — that's the review panel in Step 5.

---

## 1. What's already in place

### Data model (built, ready to write)

| Module | Table | What's there |
| --- | --- | --- |
| `modules/analysis/schema.ts` | `analysisConfigs` | All needed columns: `baselineKind, highThresholdPct, lowThresholdPct, highThresholdEnabled, lowThresholdEnabled, unpricedStrategy, unpricedQualityCheckEnabled, unpricedQualityCheckPct, sectionsEnabled (jsonb), referencePricesetId`. ✅ |
| `modules/analysis/schema.ts` | enums: `baselineKindEnum`, `analysisContextEnum`, `unpricedStrategyEnum`, `flagKindEnum`, `flagStatusEnum` | All five enums present with the right values. ✅ |
| `modules/procurex/config/schema.ts` | `roundConfigRefs` | Binds `(roundId, context) → configId` with unique index. **This is the key**: one round can have separate configs for `context='ptc'` vs `context='tender'`. ✅ |
| `modules/analysis/schema.ts` | `flags` | Output table for the analysis pipeline (item-level high/low/unpriced/error flags). Not written by Step 4 — written by `runAnalysis()`. ✅ |
| `modules/analysis/schema.ts` | `tendererSubmissions` | The roll-up table — Step 4 doesn't write to it; `runAnalysis()` populates the aggregates. ✅ |

### UI (built visually, no persistence)

`app/projects/new/step-4-configure.tsx` — 890 lines:
- `SubStepper` (1/2/3/4 with check-mark on done)
- `PillTabs` (PTC Report / Tender Report)
- `BaselineRadioCard` rendered for each baseline option
- `VarianceThresholds` (two columns: High Rate / Low Rate with toggle + % input)
- `TenderUnpricedItems` (4 strategy radios + Quality check section)
- `PTCSummary` (5 toggle/checkbox rows)
- All state lives in `useState`; nothing reads from or writes to the DB.

The two report contexts ALREADY have separate state for baseline:
- `ptcBaseline = useState("lowest-three")`
- `tenderBaseline = useState("pte")`

The current value maps (UI key → enum):
| UI key | `baseline_kind` enum |
| --- | --- |
| `lowest-three` | `avg_lowest_three` |
| `median` | `median` |
| `average-all` | `average` |
| `pte-internal` / `pte` | `reference` (with `referencePricesetId` pointing at the PTE priceset) |
| `lowest-three-tenderers` | `avg_lowest_three` |

For unpriced strategies:
| UI key | `unpriced_strategy` enum |
| --- | --- |
| `list-only` | `list_only` |
| `lowest-three` | `avg_lowest_three` |
| `normalise-others` | `normalise_avg` |
| `normalise-pte` | `normalise_pte` |

### What's missing (gap to close)

| Missing | Note |
| --- | --- |
| Server Actions | No `getStep4Config(projectId, roundId)`, no `saveStep4Config(...)`. |
| Round resolution | The Step 4 parent (`tender-setup.tsx`) doesn't pass `roundId` to `Step4Configure` — currently it only passes `subStep`, `reportTab`. |
| Default seeding | When a round is created (today implicit as `${projectId}::initial`), no `analysis_config` rows are seeded. Step 4 needs to either lazily-create on first save or eagerly-seed on round creation. |
| Section-toggle persistence | The PTCSummary's 5 toggles aren't persisted anywhere yet — they map to `analysis_config.sections_enabled` (jsonb). |
| Tender-side Summary panel | The Tender tab's sub-step 4 currently shows "design hasn't been wired up yet." Needs the same shape as PTC Summary, with different fields (e.g. high+low both default ON, plus normalisation note). |
| PTE-baseline gate | The "Pre-Tender Estimate (PTE)" baseline option requires a PTE document to exist for the project. Currently no enforcement — clicking it works silently even though there's no PTE. |
| Continue-gate | `tender-setup.tsx` lets you Continue from Step 4 without saving. Need a "Save" step + dirty-state warning. |
| `runAnalysis()` pipeline | The actual analysis is a separate, larger phase. Step 4 only persists the **configuration**; running it is Step 5 / a backend job. |

---

## 2. Data model — the two rows we write per round

Each save creates / updates two `analysis_config` rows + two `round_config_ref` rows:

```text
round (projectId::initial)
   ↓
   ├── round_config_ref (round, context='ptc') → analysis_config (ptc shape)
   └── round_config_ref (round, context='tender') → analysis_config (tender shape)
```

Single `analysis_config` row carries:

```ts
{
  ownerKind: "round",
  ownerId: roundId,                       // e.g. "<projectId>::initial"
  context: "ptc" | "tender",

  baselineKind: "avg_lowest_three" | "median" | "average" | "reference",
  referencePricesetId: string | null,     // only set when baselineKind='reference' (= PTE)

  highThresholdEnabled: boolean,
  highThresholdPct: numeric,              // e.g. "15"
  lowThresholdEnabled: boolean,
  lowThresholdPct: numeric,               // e.g. "-15"

  unpricedStrategy: "list_only" | "avg_lowest_three" | "normalise_avg" | "normalise_pte",
  unpricedQualityCheckEnabled: boolean,
  unpricedQualityCheckPct: numeric,       // e.g. "20"

  sectionsEnabled: {                      // jsonb — sub-step 4 toggles
    highRateAppendix: boolean,
    lowRateAppendix: boolean,
    unpricedItems: boolean,
    excluded: boolean,
    completionChecker: boolean,           // PTC-only; "block PTC generation until QS Review complete"
    // Tender-only additions:
    normalisedTotals?: boolean,
    arithmeticalAdjustments?: boolean,
    rankingTable?: boolean,
  },

  updatedByUserId: string,
  updatedAt: timestamp,
}
```

**Defaults the action will use when no row exists:**

| Field | PTC default | Tender default |
| --- | --- | --- |
| `baselineKind` | `avg_lowest_three` | `reference` (PTE) — falls back to `avg_lowest_three` if no PTE uploaded |
| `highThresholdEnabled` | true | true |
| `highThresholdPct` | `15` | `15` |
| `lowThresholdEnabled` | **false** (the UI note says "Typically used in the tender report, not the PTC") | **true** |
| `lowThresholdPct` | `-15` | `-15` |
| `unpricedStrategy` | `list_only` (PTC only lists; never normalises) | `list_only` |
| `unpricedQualityCheckEnabled` | false | true |
| `unpricedQualityCheckPct` | `20` | `20` |
| `sectionsEnabled.highRateAppendix` | true | true |
| `sectionsEnabled.lowRateAppendix` | false | true |
| `sectionsEnabled.unpricedItems` | true | true |
| `sectionsEnabled.excluded` | true | true |
| `sectionsEnabled.completionChecker` | true | n/a |

---

## 3. Implementation plan — phased

### Phase A — Wire UI to a real round (foundation, no user-facing change)

The Step 4 component currently has signature:
```ts
Step4Configure({ subStep, onSubStepChange, reportTab, onReportTabChange })
```
Extend to:
```ts
Step4Configure({
  projectId, roundId,
  subStep, onSubStepChange,
  reportTab, onReportTabChange,
})
```
And `tender-setup.tsx` passes `projectId={project?.id ?? ""}` and `roundId={\`${project.id}::initial\`}`.

**Acceptance:** Refreshing Step 4 round-trips the saved settings (next phase makes them save).

### Phase B — Server Actions

Create `modules/procurex/configurations/actions.ts`:

```ts
"use server"

export interface Step4Config {
  baselineKind: BaselineKind
  referencePricesetId: string | null
  highThresholdEnabled: boolean
  highThresholdPct: string                  // numeric stored as string (drizzle)
  lowThresholdEnabled: boolean
  lowThresholdPct: string
  unpricedStrategy: UnpricedStrategy
  unpricedQualityCheckEnabled: boolean
  unpricedQualityCheckPct: string
  sectionsEnabled: Record<string, boolean>
}

// Load both contexts in ONE call.
export async function getStep4Config(projectId: string, roundId: string): Promise<{
  ptc: Step4Config        // returns defaults when no row exists
  tender: Step4Config
  pteAvailable: boolean   // true iff a 'pte'-scope document exists for this project
  isLocked: boolean       // true once Step 4 has been signed off (round.signedOffAt)
}>

// Single round-trip save (both contexts at once).
export async function saveStep4Config(args: {
  projectId: string
  roundId: string
  ptc: Step4Config
  tender: Step4Config
}): Promise<{ ok: true } | { ok: false; error: string; field?: string }>
```

Inside `saveStep4Config`:
1. Validate (e.g. high/low thresholds parse as numbers within sensible ranges).
2. If `baselineKind = 'reference'` and `pteAvailable === false`, return `{ok:false, error:"Upload a PTE before selecting it as a baseline.", field:"baselineKind"}`.
3. UPSERT `analysis_config` for each context.
4. UPSERT `round_config_ref` to link them.
5. Audit `config.save:ptc`, `config.save:tender`.

### Phase C — Default seeding

When a round is created (today the `${projectId}::initial` round is implicit; will be made explicit when the rounds table is properly populated), seed both configs with the defaults table in §2.

Lazy-create alternative: the Step 4 page itself can seed on first save — simpler now, less surprising than eager-seed.

### Phase D — Sub-step 4 (Summary) is the part with the most missing UI work

PTC Summary panel already exists in code with 5 rows.

Tender Summary panel currently shows the "design hasn't been wired up yet" placeholder. Build it to mirror PTC Summary with these rows:

| Row | Type | Default | Note |
| --- | --- | --- | --- |
| High-Rate Appendix | toggle | on | Show `% from baseline` |
| Low-Rate Appendix | toggle | on | Show `% below baseline` |
| Unpriced Items list | toggle | on | List items with no rate |
| Normalised Totals | toggle | depends on `unpricedStrategy` (auto-on if anything but `list_only`) | "Show tender sums adjusted for unpriced items" |
| Arithmetical Adjustments | toggle | on | "Show items where amount ≠ qty × rate" |
| Ranking Table | toggle | on | Tender-sum ranking, low → high, with deltas |
| QS sign-off required | checkbox | on | "Block Tender Report generation until QS review is complete" |

### Phase E — PTE-baseline guard

When the user clicks the **Pre-Tender Estimate (PTE)** baseline option:

- Look up `documents WHERE projectId=$ AND scope='pte' AND deletedAt IS NULL`.
- If found: enable it normally.
- If NOT found: show a tooltip/banner: *"No PTE has been uploaded for this project. Upload a PTE in Step 2 (Optional documents) before choosing this baseline."* with a link back to Step 2.

In the save action, double-check server-side so a stale UI can't bypass it.

### Phase F — `runAnalysis(roundId)` pipeline

**Out of scope for Step 4** — but worth flagging the contract since Step 4 is the only producer of inputs:

```ts
// modules/analysis/run.ts (separate phase / future)
export async function runAnalysis(roundId: string): Promise<AnalysisOutcome>
```

Per BACKEND_PLAN §6.2:
1. Load both `analysis_config` rows for the round (ptc + tender).
2. For each tenderer's submission: compute baseline rates per `baselineKind`.
3. For each item rate: compare to baseline, write/update `flag` rows of kind `high_rate` / `low_rate`.
4. Apply `unpricedStrategy` and set `normalised_rate_cents`.
5. Detect arithmetical errors.
6. Refresh `tenderer_submission` aggregates.
7. Stamp `analysed_at`.

Step 4 only writes the configs; Step 5 reads the flags and presents them.

### Phase G — Continue-gate

The sticky footer's `Continue` button on Step 4:
- Disabled until *at least one* baseline has been selected on each tab (effectively always satisfied because the UI defaults are pre-selected).
- Pressing Continue triggers `saveStep4Config()` first, then advances to Step 5.
- If save fails, surface the error inline + stay on Step 4.

### Phase H — In-page help copy refinement

See §4. The plan inherits the existing copy and only suggests additions where it's currently bare (Tender-side Summary, PTE guard, save-pending banner).

---

## 4. In-page UI instructions — what the user reads in each state

### 4.1 Section header (always visible)

The current header is correct and clear:

```
⚙  Configure Outputs

Choose separate settings for:
  • PTC (Tenderer facing): what we send to tenderers
  • Tender Report (Employer facing): what we report to the client/employer

[SubStepper 1 — 2 — 3 — 4]
```

Add a small saved-state pill on the right of the header:

```
                                                      🟢 Saved 2 min ago
                                                      🟡 Unsaved changes
                                                      🔵 Saving…
```

### 4.2 Pill tabs (between header and content)

`PTC Report` / `Tender Report`. Stays.

Add subtle subtitle under the active tab:

| Tab | Subtitle |
| --- | --- |
| PTC Report | `Settings applied when generating the bidder-facing Post-Tender Clarification pack.` |
| Tender Report | `Settings applied when generating the employer-facing Tender Report.` |

### 4.3 Sub-step 1 — High-Rate Analysis (baseline picker)

The card content is already excellent. Two refinements:

- The **PTE option** in PTC tab needs the disabled state:
  ```
  Pre-Tender Estimate (PTE) — Internal only          [disabled]
  ⚠ No PTE has been uploaded for this project. Upload a PTE in
  Step 2 → Optional documents before choosing this baseline.
  [Go to Step 2 →]
  ```
- Add a per-tab Info banner above the options on PTC tab:
  ```
  These settings affect what bidders see in their PTC pack. Use a
  market-based reference (e.g. Average of Lowest Three) so the
  questions look fair. Never expose the PTE to bidders.
  ```
- And on Tender tab:
  ```
  These settings affect employer-facing reporting only. They do NOT
  change what's sent to tenderers in PTCs unless mirrored in the PTC tab.
  ```
  (already shown — keep)

### 4.4 Sub-step 2 — Variance Thresholds

Two columns: High Rate / Low Rate. Already implemented. Tweaks:

- The PTC tab should default `Low Rate Threshold` to OFF with the inline note (already shows the note "Typically used in the tender report, not the PTC.").
- Add a third inline message under the columns when ONE side is OFF:
  ```
  ⓘ With Low-rate flagging off, items priced unusually low will not
  appear in the PTC pack — bidders will only be questioned on high rates.
  ```
- Range validation: 0 < high ≤ 100, -100 ≤ low < 0. Show field-level error pill on invalid input.

### 4.5 Sub-step 3 — Unpriced Items

PTC tab is plain text — fine as-is. Tender tab has 4 radio options + Quality check box. Add:

- Above the 4 options on Tender tab:
  ```
  Why this matters: bidders sometimes leave items unpriced (gaps,
  errors, exclusions). Choose how the report should handle those
  for fair comparison.
  ```
- Quality check section already has its own banner. Add the dependency:
  ```
  ⓘ Quality check uses the PTE as the reference. Disabled when no
  PTE is uploaded.
  ```

### 4.6 Sub-step 4 — Summary (the big "what to include" panel)

PTC Summary panel works. Tender Summary panel needs to be built (see Phase D table above). Suggested copy for it:

```
4. Tender Report Summary (Employer facing)

Choose what Procurex includes in the employer report. This is the
internal document — you can show PTE comparisons, normalised totals,
and ranking tables here that are NOT visible to tenderers.

[toggle] High-Rate Appendix
        Show every flagged high item with % from baseline.

[toggle] Low-Rate Appendix
        Show every flagged low item with % from baseline.

[toggle] Unpriced Items list
        Items left without a rate. Includes the normalisation strategy
        chosen above.

[toggle] Normalised Totals
        Show tender sums adjusted for unpriced items so totals are
        comparable like-for-like. Auto-enabled when normalisation is on.

[toggle] Arithmetical Adjustments
        Show items where the bidder's "amount" doesn't equal qty × rate.
        Honour the ITT Clause 18.2 policy you set in Step 2.

[toggle] Ranking Table
        Tender sums ranked low → high with deltas from lowest and PTE.

[checkbox] QS sign-off required
        Block Tender Report generation until a QS has signed off the
        round in Step 5.
```

### 4.7 Bottom-of-page Continue gate

Sticky footer state machine:

| Step-4 state | Button text | Helper line below |
| --- | --- | --- |
| Pristine (defaults) | `Continue` | (none) |
| Dirty (any field changed since last load) | `Save & Continue` | `Your settings will be saved when you continue.` |
| Saving | `Saving…` (disabled) | (spinner) |
| Save failed | `Continue` (re-enabled) | `Couldn't save — <reason>. Try again or skip.` |
| Locked (signed off) | `Continue` | `Round is locked. Settings are read-only until unlocked.` |

### 4.8 Help drawer (top-right `?` icon — optional v1)

Same pattern as Step 3:

- **Why two configs?** PTC is what bidders see; Tender Report is internal. The settings can differ — e.g. you may want to question bidders on high rates only (PTC) while showing both high AND low in the employer report (Tender).
- **Which baseline should I pick for PTC?** *Average of Lowest Three* is the safe default — fair market reference, no PTE exposure.
- **What's the PTE?** Pre-Tender Estimate — your internal QS cost benchmark. Never sent to bidders.
- **What if a bidder leaves items unpriced?** Configure under sub-step 3. The PTC always lists them; the Tender Report can normalise totals using the average of other bidders' rates OR the PTE.
- **Can I change settings after generating reports?** Yes, until QS sign-off locks the round.

---

## 5. Build order — concrete sequence

| # | Task | Files touched | DoD |
| --- | --- | --- | --- |
| 1 | Pass `projectId`, `roundId` to `Step4Configure` | `tender-setup.tsx`, `step-4-configure.tsx` | Component prop signature updated; renders without errors. |
| 2 | Server Action `getStep4Config(projectId, roundId)` | `modules/procurex/configurations/actions.ts` | Returns defaults when no rows exist; returns saved values when they do. |
| 3 | Server Action `saveStep4Config(...)` | same | Two `analysis_config` UPSERTs + two `round_config_ref` UPSERTs in one transaction; audit log entries. |
| 4 | Initial load in `Step4Configure` | `step-4-configure.tsx` | On mount, calls `getStep4Config` and seeds `useState`. Loading spinner on first render. |
| 5 | Dirty tracking + Save & Continue button wiring | `step-4-configure.tsx` + parent footer | Continue triggers save; "Saved Xs ago" pill in header. |
| 6 | PTE-baseline guard (UI + server-side) | `step-4-configure.tsx`, `saveStep4Config` | Disabled radio when no PTE; server-side 400 if attempted. |
| 7 | Build Tender Summary panel (Phase D) | `step-4-configure.tsx` | New `TenderSummary` mirror of `PTCSummary` with the 7 rows. |
| 8 | Threshold validation | `step-4-configure.tsx` | Inline error on invalid input; save blocked. |
| 9 | Locked-round read-only mode | `step-4-configure.tsx` | When `isLocked === true`, all controls disabled. |
| 10 | Help drawer (§4.8) | `step-4-configure.tsx` | Optional v1; can skip. |
| 11 | Audit log entries (`config.save:ptc`, `config.save:tender`) | `saveStep4Config` | Visible in audit trail (already wired). |
| 12 | Snapshot the dump for verification | `dump-project-full.cjs` / `dump-project.sh` | Output includes the new `step4Configs` block with both contexts. |

---

## 6. Out of scope for Step 4 (handled elsewhere)

- **`runAnalysis(roundId)` pipeline** — actually computing baselines, comparing rates, writing `flag` rows. This is a separate, larger phase (BACKEND_PLAN §6.2). Step 4 is purely configuration.
- **Per-flag QS review** — Step 5 review panel reads the flag table and lets the QS accept / reject / ask questions.
- **PTC pack generation** — Step 5 / report exporter.
- **Tender Report generation** — Step 6 / report exporter.
- **Multi-round handling** — today the round is implicitly `${projectId}::initial`. When PTC rounds (`ptc1`, `ptc2`, `ptc3`) are introduced, Step 4's data model already supports them via `roundId`; the parent will just pass the active round.

---

## 7. Open questions to confirm before building

1. **Defaults** — confirm the §2 default tables. The biggest call: Tender baseline default = `reference` (PTE), falling back to `avg_lowest_three` if no PTE. OK?
2. **PTE upload location** — `documents.scope='pte'` per Step 2. Confirm we keep that single-source-of-truth (vs introducing a separate "primary PTE" pointer per round).
3. **Round lifecycle** — today `${projectId}::initial` is implicit. Should I introduce real `round` rows (the table exists) before Step 4 ships, or keep the deterministic-string convention until rounds need to be created (PTC round 1)?
4. **Tender Summary "Ranking Table" toggle** — should this be a toggle or a fixed always-on (since a tender report without rankings is unusual)?
5. **Threshold ranges** — confirm 0 < high ≤ 100 and -100 ≤ low < 0. Or should we allow > 100% (some workflows do).
6. **Lock semantics** — does locking happen at Step 4 save or only at Step 5 QS sign-off? Recommendation: only at Step 5 sign-off so the QS can iterate freely until then.

---

End of plan. Awaiting sign-off on §1–§5 and answers to §7 before any code is written.
