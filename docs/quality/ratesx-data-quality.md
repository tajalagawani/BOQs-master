# RatesX Data Quality Audit

A full sweep of the RatesX v2 warehouse (15,580 rate items, 1,516 project
benchmark rows, 201 projects, 247 design ratios) for the kinds of problems that
break queries — duplicate dimensions, missing currencies, polluted taxonomies,
outliers, and coverage gaps. Each finding lists what it is, how many rows, how
it affects queries, and its status: **✅ fixed**, **🟡 handled by the query
layer**, or **🔴 open data gap**.

The guiding requirement: the [AI Assistant](../modules/ratesx-ai.md) and the
analytics surfaces must answer (or honestly decline) **any** query — never
return a silently-wrong number. The tools achieve that with medians (robust to
outliers), per-unit grouping, single-currency axes, duplicate collapse, and
explicit "no data / data lives elsewhere" results.

## Summary

| # | Finding | Table | Count | Status |
|---|---|---|---|---|
| 1 | Duplicate country labels (UAE / United Arab Emirates; KSA / Kingdom of Saudi Arabia) | `rates_dim_project` | 28 + 6 | ✅ fixed |
| 2 | Missing currency on UAE infrastructure projects | `rates_dim_project` | 11 | ✅ fixed |
| 3 | Shredded NRM L1 element names + merged taxonomies | `rates_dim_nrm_l1` | 19 | ✅ fixed |
| 4 | Duplicate city rows (same name) | `rates_dim_city` | 4 groups | ✅ fixed |
| 5 | Per-m² cost outliers (tiny-area pavilions) | `rates_fact_project_benchmark` | p99 12k, max 87k | 🟡 handled |
| 6 | Lump-sum / count units mixed with per-area | `rates_fact_rate_item` | 6,948 (45%) | 🟡 handled |
| 7 | Duplicate `(project, element)` benchmark rows | `rates_fact_project_benchmark` | 137 groups | 🟡 handled |
| 8 | Zero-cost placeholder benchmark rows | `rates_fact_project_benchmark` | 242 | 🟡 handled |
| 9 | Unbridged rate items (no NRM/POMI) | `rates_fact_rate_item` | 192 (1.2%) | 🔴 open |
| 10 | `asset_type` is place-names; `asset_form` entirely null | `rates_dim_project` | 167 null / 201 null | 🔴 open |
| 11 | `classification_stage` never populated | `rates_fact_rate_item` | 15,580 (100%) | 🔴 open |
| 12 | `rates_fact_material_price` empty | fact | 0 rows | 🔴 open |
| 13 | Junk "0" currency + 6 no-country projects | `rates_dim_currency` / project | 6 | 🔴 open (unidentifiable) |
| 14 | Residual CSI codes in the NRM L1 dimension | `rates_dim_nrm_l1` | 22 | 🟢 inert |

## Fixed (✅)

**1–2. Country / currency canonicalisation.** "United Arab Emirates" (28) merged
into "UAE", "Kingdom of Saudi Arabia" (6) into "KSA", and AED backfilled on the
11 UAE projects that had no currency — the ones carrying the full infrastructure
element set (Roads, Earthworks, Sewerage, Potable Water, Stormwater, Telecom,
Irrigation, Gas, Streetlighting). Before this, "benchmarked rate per m² for
infrastructure in UAE" returned **nothing** despite the data existing. Fix:
`prisma/migrations/manual/rates_v2/03_fix_uae_currency_and_merge.sql`. Landscape
is now UAE/AED (188) · KSA/SAR (7) · 6 unidentifiable.

**3. NRM L1 element names.** The benchmark loader's `splitCodeLabel` shredded
multi-word names ("Internal Walls and Doors" → code "Internal"). Repaired
non-destructively (rate items were untouched — they use clean numeric codes).
Fix: `02_fix_nrm_l1_labels.sql` + a hardened regex in `load-benchmarks.ts`.

**4. Duplicate cities.** Abu Dhabi, Dubai, Jeddah, and Riyadh each existed as
2–3 separate dimension rows; projects were repointed onto one canonical row per
name. Fix: `04_dedupe_cities.sql`.

## Handled by the query layer (🟡)

These are real characteristics of the data the tools cope with, so queries stay
correct without a data change:

**5. Per-m² outliers.** A few tiny-area pavilions reach ~87k AED/m² (median is
350). Every tool reports the **median + q1–q3**, never the mean, so a handful of
extremes can't distort an answer; the elemental chart additionally uses a log
axis / 100% mode.

**6. Lump-sum vs per-area units.** 45% of rate items are priced per `item / nr /
ls / lot / set`, not per m²/m³. `market_rate` groups results **per unit** and
returns each unit's median separately, so "rate per m² for X" surfaces the `m2`
figure rather than blending in a lump sum. (Verified: no description appears in
both AED and SAR, so the single-currency default is safe.)

**7. Duplicate `(project, element)` benchmark rows.** 137 groups (different
blocks/phases, or a 0 placeholder + a real value). `projectElementValues`
collapses them to the **mean of the non-zero rows** so a per-m² rate is never
double-counted across the assistant, the elemental chart, and the drawer.

**8. Zero-cost placeholder rows.** 242 benchmark rows are `cost = 0` (element not
present on that project). Every aggregate filters `cost > 0`, so they neither
inflate medians nor counts.

## Open data gaps (🔴)

These can't be answered until the underlying data is supplied — the assistant
**says so** rather than guessing:

**9. Unbridged rate items (192, 1.2%).** Specialised lines the bridge classifier
didn't match above threshold (e.g. "Stop Valve; 25Mm", "Geogrid", "LV Metering
Panel"). They carry no NRM/POMI, so NRM-filtered queries exclude them.
*Recommended:* lower `--threshold`, or add manual bridge entries, then re-run
`classify-rate-items-from-bridge.ts`.

**10. Asset type / form.** `asset_type` is null on 167/201 projects and the 34
non-null values are **place names** ("Jebel Ali", "Yas Island", "Nareel
Island", "Airside Works") — not types. `asset_form` is null on all 201. The Type
filter is therefore not meaningful; the assistant is steered to use `asset_class`
+ NRM elements instead. *Recommended:* populate real asset types/forms at
ingest.

**11. `classification_stage` unpopulated.** Every rate item is NRM-classified
(~99%) but the `rule | fuzzy | ai | manual` stage is never written, so
provenance of *how* an item was classified is unavailable. Cosmetic for queries;
matters for audit. *Recommended:* have the classifier stamp the stage.

**12. Material price series empty.** `rates_fact_material_price` has 0 rows, so
"price of cement over the last 12 months" can't be answered as a series. Material
*unit rates* still work via `rates_fact_rate_item` (`market_rate`).
*Recommended:* backfill the Materials/Commodities workbooks into the fact.

**13. Junk currency / orphan projects.** 6 projects have no country and a "0"
currency; they're not identifiable, so they're left out of currency axes. 7 ISO
currency dim rows (INR/EUR/USD/GBP/KWD/OMR/QAR) are unused.

## Inert (🟢)

**14. CSI codes in the NRM L1 dimension.** 22 CSI MasterFormat rows ("03 00 00 –
CONCRETE") live in `rates_dim_nrm_l1` but are **not referenced by any benchmark
or rate item**, so they don't surface in queries. Left in place; a future
migration could move them to `rates_dim_csi_code`.

## Query-handling guarantees

How the system stays correct for *any* question despite the above:

- **Grounded-only** — every figure comes from a tool; the model never estimates (see [AI Assistant](../modules/ratesx-ai.md)).
- **Robust statistics** — medians + quartiles, never means; outliers can't skew.
- **One currency at a time** — never mixes AED/SAR on an axis; `benchmark_rate` reports `currencyAvailability` when the requested currency is empty.
- **Per-unit rates** — `market_rate` never blends units.
- **Duplicate-safe** — `(project, element)` dupes collapse to a single mean.
- **Honest gaps** — empty results return "no data" (not a fabricated number), and the assistant names the missing dimension when a split isn't captured.

## Backlog (recommended, in priority order)

1. Populate real `asset_type` / `asset_form` at ingest (unlocks the Type facet).
2. Backfill `rates_fact_material_price` (unlocks material price trends).
3. Re-classify the 192 unbridged items (lower threshold / manual bridge entries).
4. Stamp `classification_stage` in the classifier.
5. Move the 22 CSI rows out of `rates_dim_nrm_l1` into `rates_dim_csi_code`.
