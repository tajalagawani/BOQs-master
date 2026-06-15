# ProcureX → 10X Redesign — Detailed Component, Section & Page Specification

> Status: **PLAN — to review before any building.**
> References: `~/Downloads/procurex-step3-10x-style (3).html` (Tenderers/intake),
> `~/Downloads/procurex-step6-10x-style (1).html` (Report & PTC).
> Contract: **presentation only** — every data binding, prop, handler, action,
> href, and number from the existing pages is preserved. Bind to real
> `modules/procurex/*` data; never fabricate the references' illustrative figures.

---

## 0. Principles

1. **Atomic + parent split.** Two layers:
   - **Micro-components** (atoms/molecules) are *width-agnostic*: they fill whatever cell they're given and never set their own grid. They carry their own internal wrapping/truncation only.
   - **Parent/container components** (organisms/shells) own layout: they establish a **container context** and decide how many columns/how content reflows.
2. **Responsive by itself = container queries.** Every parent sets `@container` (Tailwind v4) and uses `@sm/@md/@lg/@xl/@2xl/@3xl` variants. A section therefore reflows based on *its own* width — correct in a wide panel, a narrow split, a modal, or a print column — not just the viewport.
3. **Tables** are responsive via a scroll wrapper (`overflow-x-auto` + `min-w-[…]`); the few comparison/appendix tables that must stay legible collapse to stacked cards under `@lg`.
4. **No fixed pixel grids.** The references use `repeat(4,1fr)` etc.; we replace each with a container-query column ramp (below).
5. **One token source.** All colors/spacing come from the `suite-*` tokens already in `globals.css`. New table-row classes (`tr.low`, `tr.total`) are added there once.

### 0.1 Container-query breakpoint convention (used everywhere)

| Layout | Base (narrow) | ramp |
|---|---|---|
| 3-up (totals) | 1 col | `@md:grid-cols-3` |
| 4-up (headline cards, PTC timeline) | 1 col | `@sm:grid-cols-2 @2xl:grid-cols-4` |
| 5-up (conclusions gate) | 2 col | `@lg:grid-cols-3 @3xl:grid-cols-5` |
| 6-up (tiles) | 2 col | `@md:grid-cols-3 @2xl:grid-cols-6` |
| fixed-px grids (`.dev`, `.clar`) | stacked block | `@lg:grid` (the px template) |
| hero top (title ↔ controls) | `flex-col` | `@lg:flex-row` |
| meta band | `flex-wrap` | — |
| any data table | `overflow-x-auto` + `min-w` | collapse-to-cards `@lg` for comparison tables |

### 0.2 File structure
```
components/suite/procurex/
  atoms.tsx        — CodeBadge, CodeInline, Chip helpers, MatchTag, Miss,
                     InternalBadge, Delta, Rank, Dot
  molecules.tsx    — WhoCell, MiniStat, SumAdj, ConfidenceBar, DocChip, TBox,
                     Tile, HCard, GBox, MetaItem, PtcRoundCard, SegControl,
                     SelPill, HeroGhostBtn, SourceTag, CatTag, PtcCheckbox
  organisms.tsx    — SecBar, SectionTitle, SubTitle, DocStrip, Band, AINote,
                     TotalsRow, TilesRow, HeadlineCards, MetaBand, SectionNav,
                     RecBox, Prose, QsCommentRow, PtcTimeline, ClarRow,
                     DeviationRow, ConclusionsGate, Legend
  tables.tsx       — DataTable, THead, Row, Cell (r/c/low/total), RankCell
  ProcurexWizardShell.tsx  (exists — extend)
  ProcurexReportShell.tsx  (new)
  index.ts         — barrel
```
`globals.css`: add `.suite-tbl tr.low/.total td`, `.suite-tbl td.up/.dn`, and `@container` is enabled per-component (no global change).

---

## 1. Atoms (`atoms.tsx`)

Each atom is inline/intrinsic — responsive = it wraps/truncates, never grids.

| Component | Ref class | Props | Notes / responsive |
|---|---|---|---|
| `CodeBadge` | `.code` | `children` | mono navy-2 pill; `shrink-0` |
| `CodeInline` | `.codei` | `children` | blue inline code (addenda refs) |
| `Chip` | `.chip` | `tone: good\|warn\|dang\|neut`, `children`, `dot?` | already `SuiteChip`; reuse |
| `MatchTag` | `.mm` | `kind: fuzzy\|none`, `children` | exists |
| `Miss` | `.miss` | `children` | italic ink-4; exists |
| `InternalBadge` | `.internal` | `label?` | PTE-lock badge; `whitespace-nowrap` |
| `Delta` | `.up/.dn/.flat` | `dir: up\|down\|flat`, `children` | variance text; mono |
| `Rank` | `.rk/.rk2` | `children` | mono bold rank number |
| `Dot` | `.d` | `color` | 7px status dot |
| `Num` | `.num` | — | utility class `suite-num` (exists) |

---

## 2. Molecules (`molecules.tsx`)

Composed but still width-agnostic (fill cell). A few carry a tiny `@container` only for internal label/value stacking.

| Component | Ref | Props | Responsive |
|---|---|---|---|
| `WhoCell` | `.who` | `code, name, meta?` | exists; `min-w-0` + truncate name/meta |
| `MiniStat` | `.ministat` | `parts: {n,label,tone?}[]` | exists; wraps |
| `SumAdj` | `.sum/.adj` | `sum, delta?, deltaTone` | mono; right-aligned in cell |
| `ConfidenceBar` | `.ci` | `pct, align?` | exists; bar fixed 56px, pct mono |
| `DocChip` | `.dchip` | `code, label, state: on\|rev\|off` | inside DocStrip; pill wraps |
| `TBox` | `.tbox` | `k, v, vs?, vsTone?` | exists (TotalsRow uses) |
| `Tile` | `.tile` | `k, v, dotColor?, muted?` | exists (TilesRow) |
| `HCard` | `.hcard(.lead)` | `k, who?{code,name}, v, vs?, lead?` | `@container`: value font steps down `<@xs` |
| `GBox` | `.gbox` | `k, children` | conclusions gate cell |
| `MetaItem` | `.meta .m` | `k, v` | meta band cell + divider |
| `PtcRoundCard` | `.ptcr(.active)` | `title, status, sub?, sub2?, active?` | timeline cell |
| `SegControl` | `.seg` | `options:{id,label}[], value, onChange` | segmented; hero ghost styling |
| `SelPill` | `.selpill` | `children, onClick?` | round selector pill |
| `HeroGhostBtn` | `.btnw(.go)` | `children, go?, href?/onClick?` | white-on-navy hero button |
| `SourceTag` | `.src` | `children` | clarification source tag |
| `CatTag` | `.cattag` | `children` | deviation category (in DeviationRow) |
| `PtcCheckbox` | `.ptc .box` | `checked, onChange, label` | include-in-PTC toggle |

---

## 3. Organisms / Sections (`organisms.tsx`) — the parent components

Each owns `@container` + reflow. Detailed:

### 3.1 `SecBar` *(exists)*
- Composition: waffle + `h2` + count + `actions` slot.
- Responsive: `flex-wrap`; actions drop below title under `@sm`.

### 3.2 `SectionTitle` ★ (`.sectitle`)
- Props: `no?` (e.g. "01"/"App A"), `title`, `actions?`.
- Markup: numbered mono + bold title + 2px blue bottom border.
- Responsive: `flex items-baseline gap-3 flex-wrap`; border full-width.

### 3.3 `SubTitle` ★ (`.subt`)
- Props: `children`, `count?`, `right?`.
- Uppercase label + muted count; `right` (e.g. InternalBadge) pushes right; `flex-wrap`.

### 3.4 `DocStrip` *(exists)* (`.docstrip`) — `flex-wrap gap`.

### 3.5 `Band` *(exists)* (`.band`) — `flex-wrap`; file meta hides `<@sm`, status chip stays.

### 3.6 `AINote` *(exists)* (`.ainote`).

### 3.7 `TotalsRow` *(exists)* (`.totals`) — `@container grid-cols-1 @md:grid-cols-3`.

### 3.8 `TilesRow` *(exists)* (`.tiles`) — `@container grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-6`. Accepts `cols` override.

### 3.9 `HeadlineCards` ★ (`.heads`)
- Props: `cards: HCardProps[]`.
- `@container grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-4`.

### 3.10 `MetaBand` ★ (`.meta`)
- Props: `items: {k,v}[]`.
- `flex flex-wrap items-center gap-4`; dividers hidden when wrapped (`hidden @md:block`).

### 3.11 `SectionNav` ★ (`.nav`)
- Props: `links: {no?, label, href}[]`.
- `flex flex-wrap gap-2`; pill links; active/hover blue.

### 3.12 `RecBox` ★ (`.recbox`)
- Props: `award:{code,name,amount}`, `body`, `sign`.
- Green recommendation panel; title row `flex-wrap`.

### 3.13 `Prose` ★ (`p.prose`)
- Props: `children`, `size?`. Narrative paragraph; `max-w` for readability; bold via `<b>`.

### 3.14 `QsCommentRow` ★ (`.qsrow`)
- Props: `code, name, body`. Label row + prose; bottom divider.

### 3.15 `PtcTimeline` ★ (`.ptctl`)
- Props: `rounds: PtcRoundCardProps[]`.
- `@container grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-4`.

### 3.16 `ClarRow` ★ (`.clar`)
- Props: `source, question{text,ref}, answer, status`.
- `@container`: stacked block `<@lg`; `@lg:grid-cols-[110px_1fr_1fr_120px]`.

### 3.17 `DeviationRow` *(exists, add 2nd variant)* (`.dev`)
- Variant A (Step 3): `[110px_1fr_90px_130px]` (category, stmt, severity, PTC checkbox).
- Variant B (Step 6): `[110px_1fr_90px_90px]` (category, stmt, status, resolved).
- `@container`: stacked block `<@lg`; grid `@lg`.

### 3.18 `ConclusionsGate` ★ (`.gate`)
- Props: `boxes: {k, v}[]`.
- `@container grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-5`.

### 3.19 `Legend` ★ (`.legend`) — `flex flex-wrap gap`.

---

## 4. Tables (`tables.tsx`) — responsive data tables

- `DataTable` = `<div class="suite-tbl overflow-x-auto"><table class="min-w-[Npx]">…</table></div>`.
- Helpers: `THead(cols)`, `Tr`, `Td`/`Th` with `align: r|c`, row modifiers `low` (green) / `total` (bold top-border).
- **Comparison/section tables** (1 label col + N bidder cols): `min-w` scales with bidder count; under `@lg` a `CompareCards` fallback renders one card per bidder (same data) — toggled by the parent via `@container`.
- Cells: `Ref` (mono), `Delta` up/dn, `RankCell`.

---

## 5. Parent shells / templates

### 5.1 `ProcurexWizardShell` *(exists — extend)*
- Already: navy topnav + hero (title/subtitle + project pill + `actions`) + 6-step `SuiteSteps` rail + panel slot.
- Add: `heroControls` slot (for Step 6's SegControl/SelPill/HeroGhostBtns).
- Responsive: hero top `flex-col @lg:flex-row`; step rail `overflow-x-auto`; controls `flex-wrap justify-end`.

### 5.2 `SuitePanel` *(exists)* — white rounded panel; `first` floats over hero; `@container` root so all sections inside it query the panel width.

### 5.3 `ProcurexReportShell` ★ (new)
- Props: `meta:{k,v}[]`, `aiNote`, `nav:link[]`, `children` (ordered sections).
- Composition: `SuitePanel first` → `MetaBand` → `AINote` → `SectionNav` → sections.
- Responsive: it's just a panel; each child section self-reflows via its own `@container`.

---

## 6. Page specifications

Each page = `ProcurexWizardShell` (step set) + ordered sections built from §3. Data column = the existing `modules/procurex/*` already wired into the page (preserved).

### 6.1 Step 1 — Project & Contract  (`step1-toc.tsx`, 73 ln)
- Sections: project form (existing Step-1 form sections), contract basis, team.
- Components: `SuitePanel` + `SecBar` + **form atoms** (see §8, not in the refs — inputs/selects styled with suite tokens) + `Chip`/`InternalBadge`.
- Responsive: form grid `@container grid-cols-1 @lg:grid-cols-2`.
- Data: `updateProject` action + project fields (unchanged).

### 6.2 Step 2 — Tender Documents  (`step-2-tender-documents.tsx`, 748 ln)
- Sections: issued-doc set, priced-spine BOQ upload, document bands per doc type.
- Components: `SecBar`, `Band`, `DocStrip`, upload panels (suite-token reskin of the existing dropzones), `Chip`.
- Responsive: doc bands stack; upload zones `@container grid-cols-1 @md:grid-cols-2`.
- Data: existing document upload/parse actions (unchanged).

### 6.3 Step 3 — Tenderers & Submissions  (`step-3-tenderer.tsx`, 1265 ln) — **P1 done, re-point to final atoms**
- Sections: **Tenderer roster** (`DataTable` rows: `WhoCell` · `Chip` status · submitted · `MiniStat` intake · `SumAdj` · row action) + **Submission intake** (`intake-head` · `DocStrip` · `Band` ×3 · `TotalsRow` · `TilesRow` · arith/unpriced/unmatched `DataTable`s · FOT extraction `DataTable`+`ConfidenceBar` · CL cross-check · `DeviationRow`s + `Legend`).
- Responsive: roster table scrolls `<@lg`; intake totals/tiles ramp; deviation rows stack `<@lg`.
- Data: tenderers + applied-submission totals + FOT/CL slots (real; honest awaiting states pre-analysis).

### 6.4 Step 4 — Analysis Config  (`step-4-configure.tsx`, 1358 ln)
- Sections: scoring weights, unpriced treatment, normalization rules, round config, sub-step tabs.
- Components: `SecBar`, `SegControl`/tabs, config `DataTable`s, `Tile`s, form atoms, `Chip`.
- Responsive: weight grids `@container`; sub-step tabs `overflow-x-auto`.
- Data: config actions + round config (`config/RoundConfigRef`) unchanged.

### 6.5 Step 5 — Tender Review  (`step-5-results-overview.tsx` 122 ln + `review/[bidderId]/review-tenderer-client.tsx` 100 ln)
- Overview sections: ranking summary, per-bidder cards.
- Per-bidder review sections: FOT/CL extraction (`DataTable`+`ConfidenceBar`), `DeviationRow`s (review buckets), arithmetical errors, addenda/COC standings.
- Components: `HeadlineCards`, `DataTable`, `ConfidenceBar`, `DeviationRow`, `Chip`, `AINote`.
- Responsive: per-bidder cards `@container`; extraction tables scroll.
- Data: `review/bidder-review-data` (BidderHeader, BidderDeviation*, ArithmeticalErrorRow, BidderCocStanding, BidderAddendaStanding) — all exist.

### 6.6 Step 6 — Report & PTC  (`step-6-reports.tsx` 703 ln + the whole `report/` tree, ~40 comps) — **highest payoff**
- Shell: `ProcurexReportShell` (MetaBand + AINote + SectionNav).
- Sections (map 1:1 to existing files):
  - `RecBox` (award) — *new wrapper around report-client award*
  - `01 Executive Summary` → `report/components/executive-summary.tsx` = `SectionTitle`+`HeadlineCards`+`Prose`.
  - `02 Tender Comparison` → `tender-comparison.tsx` = `DataTable` (rank, `tr.low`, `tr.total` PTE row, issues key).
  - `03 Detailed Analysis` → `detailed-tender-analysis.tsx` + `section-comparison-table.tsx` = `DataTable` (section totals, lowest highlighted).
  - `04 Compliance` → `compliance-requirements.tsx` = `DataTable` of `Chip` gate cells.
  - `05 QS Comments` → `qs-comments.tsx` = `QsCommentRow`s.
  - `App A` → `appendix-a.tsx` = `DataTable` (sum reconciliation).
  - `App B` → `appendix-b.tsx` = clarification schedules `DataTable`.
  - `App C` (per-bidder, 12 sub-sections) → `appendix-c/*` (itt-compliance, tender-sum-breakdown, description-changes, quantity-changes, arithmetical-errors, boq-high-rates, boq-low-rates, gen-req-high-low, additional-items, commercial/contractual-deviations, signature-authority, rate-analysis-table, cross-bidder-table, bidder-stack-block) = `SubTitle`+`DataTable`/`DeviationRow` each.
  - `PTC Rounds` → `PtcTimeline` + `ClarRow`s.
  - `Conclusions` → `ConclusionsGate`.
- Responsive: every section self-reflows; all appendix tables scroll `<@lg`; comparison/section tables get the `CompareCards` collapse.
- Data: `report/report-data` (ProjectSnapshot, AppendixCData, CrossBidderRateComparison, BoqChangeRow…), `ptc/*` (TenderReport, PtcPack, ComplianceRecord, Deviation, Qualification) — all exist.

### 6.7 Detail routes (project-level)
- `[projectId]` overview (167) → dashboard: `HeadlineCards` + roster summary + step-progress.
- `analysis/analysis-tabs` (316) → `SegControl` tabs + analysis `DataTable`s.
- `ptc/ptc-client` (103) → PTC schedule (`PtcTimeline`+`ClarRow`).
- `report/report-client` (265) → uses §6.6 shell (same tree).
- `boq/boq-viewer` (2,639) → **dedicated pass**; reskin its chrome to suite tokens + `.suite-tbl`; keep the grid/editor engine intact.

---

## 7. Tables — responsiveness detail

1. Default: horizontal scroll wrapper; numeric cols right-aligned; `min-w` sized to content.
2. Comparison (`02`) & Section (`03`) & Appendix C cross-bidder: parent sets `@container`; `@lg` shows the table, `<@lg` shows `CompareCards` (one card per bidder, same cells) so nothing is lost on phones.
3. `tr.low` = green winning row; `tr.total` = bold totals row with top border; added once to `globals.css`.

---

## 8. Out-of-reference pieces (need design decision)
The refs don't cover **form controls** (Step 1/2/4 have inputs/selects/sliders/dropzones). Plan: a small `suite` form atom set — `SuiteInput`, `SuiteSelect`, `SuiteTextarea`, `SuiteField`, `SuiteSlider`, `SuiteDropzone` — styled with suite tokens (border-suite-line, focus ring suite-navy). These are **additive primitives**, container-query-agnostic (they fill their field cell).

---

## 9. Build phasing
- **P0** Foundation ✅ **DONE** (tsc 0 + `next build` exit 0). Built: `procurex-report.tsx` (atoms `CodeInline`/`InternalBadge`/`Delta`/`Rank`; molecules `Sum`/`Adj`/`HCard`/`GBox`/`PtcRoundCard`/`SegControl`/`SelPill`/`HeroGhostBtn`/`SourceTag`/`PtcCheckbox`; organisms `SectionTitle`/`SubTitle`/`HeadlineCards`/`MetaBand`/`SectionNav`/`RecBox`/`Prose`/`QsCommentRow`/`PtcTimeline`/`ClarRow`/`ReportDeviationRow`/`ConclusionsGate`/`Legend`), `procurex-tables.tsx` (`DataTable`/`Ref`), `ProcurexReportShell.tsx`, `SuiteForm.tsx` (`SuiteInput`/`SuiteSelect`/`SuiteTextarea`/`SuiteField`), `ProcurexWizardShell` `heroControls` slot, and `globals.css` tokens (`--color-suite-green-soft`) + table variants (`tr.low`/`tr.total`/`td.up`/`td.dn`). All exported from `@/components/suite`. *(Nothing user-facing changed yet — library only.)*
- **P1** Step 3 — re-point to final atoms *(already redesigned)*.
- **P2** Step 6 report tree *(40 comps — fan out 1 agent per appendix; highest payoff)*.
- **P3** Step 5 review.
- **P4** Step 4 config (+ form atoms).
- **P5** Step 2 docs + Step 1 project.
- **P6** Detail routes: overview, analysis-tabs, ptc-client; then `boq-viewer` solo.

## 10. Per-phase gate (every component & page)
1. `tsc --noEmit` clean.
2. Adversarial verify: data bindings, props, handlers, hrefs, counts, copy preserved.
3. Forbidden-path: only page/component files; never `lib/modules/actions/api`.
4. **Responsive acceptance** (new): each parent section verified to reflow at `@container` breakpoints (1-col on narrow, full grid on wide) and every table scrolls/collapses — checked by rendering each section at 360 / 768 / 1280 container widths.
5. Build (`next build`) before any deploy.

## 10b. ARCHITECTURAL RULE — one shell per page (learned from the 2-header bug)

`tender-setup.tsx` wraps **all six steps** in a single `ProcurexWizardShell` (one navy topnav + hero + step rail). Therefore:

- **Wizard steps** (`step1-toc` … `step-6-reports`) render **content only** — NEVER their own `ProcurexWizardShell`/`SuiteTopNav`. Step-specific hero controls (e.g. Step-6 report type/round/export) go in a **light in-panel toolbar** at the top of the step content (white-context buttons), or are lifted to `tender-setup`'s `heroControls` when truly hero-level. *(Step-6 fixed this way: 2nd shell removed, type+round toolbar in-panel, both still directly settable.)*
- **Standalone project routes** (`/[projectId]`, `/report`, `/analysis`, `/ptc`, `/boq`) own their **own** shell — `/report` uses `report-client` (its own `ProcurexWizardShell`); `/[projectId]` + `/analysis` keep `OmniShell`'s single header (do NOT add a suite topnav on top).
- **Verify rule:** any step file that imports `ProcurexWizardShell` is a red flag — fail it.

## 10c. P2 REMEDIATION (carry-over before P3)
The pixel-faithful redesign over-reached on the two orchestration files. Fix to restore behaviour while keeping the visuals:
- `report-client.tsx`: revert round selector from the **cyclic `SelPill` stepper** back to **direct round buttons** (4 discrete `setParam('round', r)`); keep the new `RecBox`/`MetaBand`/`SectionNav`. Restore `Export to Excel` `disabled` + `title`. (Award `RecBox` binds real `rankings`/`lowestBidderId` — keep, it's a genuine improvement bound to existing data.)
- `step-6-reports.tsx`: ✅ fixed (toolbar restores type+round; no 2nd shell). Re-confirm the dropped affordances (search/comment/share/export-history/contents-nav) — only restore the ones that were load-bearing (export-history if it linked real data); the rest were chrome the reference intentionally omits.

## Part B — Detailed per-step build plans (remaining steps)

> Every step below is a **content-only wizard step** (rule §10b). Read the file first, then compose; preserve every existing handler/action/field/href/number/copy; bind to the listed real data.

### B.1 — Step 1 · Project & Contract  (`step1-toc.tsx`, 73 ln)
- **Sections:** (1) Project identity (name, code, client, sector), (2) Contract basis (type, currency, lump-sum vs remeasure), (3) Team/owners.
- **Components:** `SecBar` per group · `SuiteField`+`SuiteInput`/`SuiteSelect` (form atoms) · `Chip`/`InternalBadge` for status.
- **Layout:** form grid `@container grid-cols-1 @lg:grid-cols-2` per section.
- **Data:** `updateProject` action + the existing project fields/state in `step1-toc` (and any Step-1 sub-section components it imports). **Preserve every field binding + the save flow.**
- **Responsive:** fields stack < `@lg`; the whole form is one column on phones.

### B.2 — Step 2 · Tender Documents  (`step-2-tender-documents.tsx`, 748 ln)
- **Sections (from `SidebarGroupBlock`/`DocGridView`/h3s):** (1) Issued document set (the doc sidebar/groups), (2) Priced-spine BOQ upload + parse status, (3) Per-document-type bands (FOT/COC/SOPR/CL templates), (4) Doc grid view.
- **Components:** `Band` (per doc type: code+title+file+status `Chip`) · `DocStrip`/`DocChip` (BOQ/FOT/CL/COC/SOPR states) · upload dropzones reskinned with suite tokens (suite `SuiteDropzone` once built, or token-reskinned existing) · `DataTable` for any doc list · `SecBar`.
- **Layout:** sidebar+grid → `@container`: stack < `@lg`, `@lg:grid-cols-[260px_1fr]`.
- **Data:** existing document upload/parse/template actions in step-2 — **preserve every upload handler, parse trigger, and template href**.
- **Responsive:** doc grid `@container grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3`; sidebar collapses above the grid on narrow.

### B.3 — Step 4 · Analysis Config  (`step-4-configure.tsx`, 1358 ln)
- **Sub-step machine:** `SubStepper` (keep the existing sub-step state/nav exactly) → render as a light segmented/`PillTabs` row (NOT a hero rail).
- **Sections (from markers):** (1) Baseline selection (`BaselineRadioCard` → suite radio cards), (2) Scoring/weights (`PillTabs` tabs + tables/sliders), (3) Unpriced/normalization treatment (`CheckboxControl` → suite checkboxes), (4) `SavedPill` status.
- **Components:** light `PillTabs` (token-reskin) · `BaselineRadioCard` → `SuiteField`+radio styled card · `CheckboxControl` → `PtcCheckbox`-style toggle · `Tile`/`TilesRow` for config summaries · `DataTable` for weight/rule tables · `Chip`/`SavedPill`(→`Chip good`).
- **Data:** config + `RoundConfigRef` actions — **preserve sub-step state, every weight/rule control, and the save (`SavedPill`) flow**.
- **Responsive:** sub-step tabs `overflow-x-auto`; weight grids `@container`; radio cards `@container grid-cols-1 @md:grid-cols-2`.

### B.4 — Step 5 · Tender Review  (`step-5-results-overview.tsx` 122 ln + `review/[bidderId]/review-tenderer-client.tsx` 100 ln)
- **Overview (step-5):** ranking summary `HeadlineCards` + per-bidder roster (`WhoCell`/`Chip`/`MiniStat`) linking to per-bidder review.
- **Per-bidder review (`review/[bidderId]`, standalone route → own shell):** FOT extraction `DataTable`+`ConfidenceBar`; CL cross-check `DataTable`; deviations `DeviationRow` (review buckets); arithmetical errors `DataTable`; addenda/COC standings `Chip`; `AINote` provenance.
- **Data:** `review/bidder-review-data` (`BidderHeader`, `BidderDeviation*`, `ArithmeticalErrorRow`, `BidderCocStanding`, `BidderAddendaStanding`) — all exist; **bind real, no fabricated figures.**
- **Responsive:** per-bidder cards `@container`; extraction tables scroll.

### B.5 — Detail routes (project-level, standalone — own shell)
- `[projectId]/page.tsx` (overview, OmniShell): dashboard — `HeadlineCards` + roster summary + step-progress. **Keep OmniShell's single header; do not add a suite topnav.**
- `analysis/analysis-tabs.tsx` (316): `SegControl` tabs (token-reskin) + analysis `DataTable`s.
- `ptc/ptc-client.tsx` (103): `PtcTimeline` + `ClarRow`s + PTC schedule, bound to `ptc/*` (`PtcPack`, `Deviation`, `Qualification`, `ComplianceRecord`).
- `report/report-client.tsx` (standalone /report): the §6.6 report shell — **apply §10c remediation**.
- `boq/boq-viewer.tsx` (2,639): **dedicated solo pass** — reskin chrome + `.suite-tbl` only; keep the grid/editor engine intact; do NOT decompose the engine.

### B.6 — Phase order (revised)
P2 (Step 6 report tree) ✅ landed + remediation pending (§10c) → **P3** Step 5 review → **P4** Step 4 config (build `SuiteDropzone`/radio/checkbox form atoms first) → **P5** Step 2 docs + Step 1 project → **P6** detail routes (overview, analysis-tabs, ptc-client) then `boq-viewer` solo. Each: read → compose against P0 → adversarial verify (**incl. the §10b shell rule**) → tsc + forbidden gate → build.

## 11. Acceptance — "responsive by itself" checklist (per component)
- [ ] Parent sets `@container`; children use `@`-variants only (no viewport `sm:`/`md:` inside reusable sections).
- [ ] No fixed multi-column `grid-cols-N` without a narrow fallback.
- [ ] Every `<table>` wrapped in `overflow-x-auto` with a sane `min-w`.
- [ ] Text truncates (`min-w-0` + `truncate`) rather than overflowing.
- [ ] Flex rows `flex-wrap`.
- [ ] Drop-in test: component renders correctly in a 320px column **and** a 1200px panel.
