# `coc` — Conditions of Contract (extraction prompt)

The legal terms of the construction contract. Long doc (~80 pages): 37 main clauses + Particular Conditions (Appendix A) + insurance/bond appendices. Extract the project-specific numbers and the contract-identity strings — most of the clause body is boilerplate.

The schema is **flat** — extract every value to its top-level key listed below. Do NOT nest under `header`, `particular`, `insurance`, or any other envelope; those nestings appear in older spec docs but the validator only accepts the flat shape.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Contract identity — FLAT, NOT under "header"
  "contractFormCode":                     "string|null",                          // "BO-LF-NONRERA-DC"
  "contractForm":                         "fidic-red|fidic-yellow|nec|bespoke|null",
  "contractFormVersion":                  "string|null",                          // "February 2025 Version Rev-Sep25"

  // Sum & parties — FLAT, NOT under "particular"
  "contractSumCents":                     "integer minor units|null",             // emit major × 100; null pre-award
  "engineerName":                         "string|null",
  "governingLaw":                         "string|null",                          // Clause 4.2
  "disputeForum":                         "string|null",                          // Clause 36.1 — "Dubai Courts" etc.
  "language":                             "string|null",                          // Clause 4.1

  // Times for Completion (one row per Section, mirrors FOT Clause 2)
  "timesForCompletion": [
    {
      "label": "string|null",                                                     // section name
      "days":  "non-negative integer|null"
    }
  ],                                                                              // [] if absent

  // Advance + bonds (Clauses 8, 9) — percents 0..100
  "advancePaymentPercent":                "number 0..100|null",                   // Clause 9.1
  "advancePaymentBondPercent":            "number 0..100|null",                   // Clause 8.1(b)
  "performanceBondPercent":               "number 0..100|null",                   // Clause 8.1(a)

  // Retention (Clauses 29.x)
  "retentionPercent":                     "number 0..100|null",
  "retentionCapCents":                    "integer minor units|null",             // cap as money OR percent (emit whichever is stated; null the other)
  "retentionCapPercent":                  "number 0..100|null",

  // Liquidated damages (Clause 19.3)
  "ldPerDayCents":                        "integer minor units|null",
  "ldCapCents":                           "integer minor units|null",             // cap as money OR percent
  "ldCapPercent":                         "number 0..100|null",

  // Warranties & price
  "dlpMonths":                            "positive integer|null",                // Clause 22.2 — Defects Liability Period
  "decennialLiabilityYears":              "positive integer|null",                // Clause 22.11 — typically 10
  "fixedPrice":                           "boolean|null",                         // Clause 31.1

  // Document priority (Clause 4.3) — flat string array, ORDER MATTERS
  "documentPriorityOrder": [ "string" ],                                          // [] if absent

  // Insurance minimums (Appendices E/F/G) — FLAT keys, NOT under "insurance"
  "insuranceMachineryAllRisksMinCents":   "integer minor units|null",
  "insuranceWorkmensCompMinCents":        "integer minor units|null",
  "insuranceContractorAllRiskMinCents":   "integer minor units|null",

  // Optional verbatim clause archive
  "clauses": [
    { "ref": "string", "text": "string" }                                         // both REQUIRED if row emitted
  ]
}
```

## Field guidance

- `contractFormCode` — header code such as `BO-LF-NONRERA-DC`.
- `contractForm` — classification of the contract form; pick the enum based on heading patterns and definitions (FIDIC-derived bespoke → `bespoke`).
- `contractFormVersion` — the cover version string (e.g. "February 2025 Version Rev-Sep25").
- `contractSumCents` — Particular Conditions / Clause 1.1(j) Contract Sum, in minor units (major × 100). Null on a tender-stage COC (filled at award).
- `engineerName` — Particular Conditions engineer name.
- `governingLaw` — Clause 4.2 (e.g. "UAE Federal Law / Dubai Law").
- `disputeForum` — Clause 36.1 dispute-resolution forum (e.g. "Dubai Courts").
- `language` — Clause 4.1 language of communication.
- `timesForCompletion[].label` / `.days` — Particular Conditions section table (mirrors FOT Clause 2 / SOPR §2.2).
- `advancePaymentPercent` — Clause 9.1.
- `advancePaymentBondPercent` — Clause 8.1(b).
- `performanceBondPercent` — Clause 8.1(a).
- `retentionPercent` — Clauses 29.x retention percentage.
- `retentionCapCents` / `retentionCapPercent` — retention cap is expressed as EITHER a fixed amount OR a percentage of the Contract Sum. Emit the form actually stated; leave the other null. Never emit both.
- `ldPerDayCents` — Clause 19.3 daily Liquidated Damages, minor units.
- `ldCapCents` / `ldCapPercent` — same exclusive-OR rule as retention cap.
- `dlpMonths` — Clause 22.2 Defects Liability Period in months.
- `decennialLiabilityYears` — Clause 22.11 (UAE Civil Code reference, typically 10).
- `fixedPrice` — Clause 31.1 (true if the contract is fixed-price; false if escalation/adjustment applies).
- `documentPriorityOrder` — Clause 4.3 priority of contract documents; emit a flat ordered string array (no `{value:…}` wrappers).
- `insuranceMachineryAllRisksMinCents` — Appendix E minimum coverage, minor units.
- `insuranceWorkmensCompMinCents` — Appendix F minimum coverage, minor units.
- `insuranceContractorAllRiskMinCents` — Appendix G minimum coverage, minor units.
- `clauses[].ref` / `.text` — when emitting the optional archive, capture each numbered clause with its verbatim body. Skip the archive entirely if uncertain; do not partial-fill it.

## Extraction quirks (preserved from prior runs)

- The COC is the longest of the project-config docs. Particular Conditions (Appendix A) is the **highest-value block** — usually a two-column table ("Clause Ref" / "Particular Condition") with the actual project numbers.
- LD cap and retention cap each have an **exclusive-OR** form — cents amount OR percentage of contract sum. Detect which is stated; populate that field; leave the other null. Never emit both.
- Clause 22.11 (Decennial Liability) is often a UAE Civil Code reference; if absent, leave the field null rather than defaulting.
- Insurance appendices E/F/G use tables with policy types and minimum coverages — extract as money values in minor units.
- Clause 4.3 priority order is the canonical reference for `documentPriorityOrder` — preserve the order exactly; both ITT Appendix A and COC must agree (cross-check is downstream).
- Clauses 1 Definitions (60+ lettered entries) and Clauses 2–37 main body are mostly DISPLAY boilerplate — they belong in the optional `clauses[]` archive, not as scalar fields.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `header`, `particular`, `insurance`, or any other envelope.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Money values are integer minor units (major × 100). Percentages are plain numbers in 0..100.
- For retention/LD caps, emit the form actually stated and leave the other null. Never emit both.
- Never invent values. If a field is partly visible but uncertain, emit `null`.
- The schema above is the complete output contract — do not introduce keys that are not listed.
