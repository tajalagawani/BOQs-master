# `sopr` — Schedule of Project Requirements (extraction prompt)

The project-specific brief — what the Employer wants delivered, in what format, by when, and to what standard. Sits between ITT (rules of submission) and COC (contract terms). Very long doc (the DCH Bridges District sample is ~553 pages, 12 sections + 18 appendices), but only a focused subset of fields is extracted to scalar columns; the rest is captured verbatim into the optional `clauses` archive.

The schema is **flat** — extract every value to its top-level key listed below. Do NOT nest under `scope`, `keyDates`, `siteConditions`, `appendices`, `appA`/`appG`/`appH`/`appM`/`appN`/`appR`, or any other envelope; those nestings appear in older spec docs but the validator only accepts the flat shape.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Identity
  "district":                              "string|null",        // "Bridges District" etc.

  // Section 2 — Key Dates (FLAT, NOT under "keyDates")
  "commencementSubmissions": [
    {
      "id":                       "string",                       // REQUIRED — "i", "ii", … or "1", "2", …
      "label":                    "string",                       // REQUIRED — full item description
      "daysAfterCommencement":    "non-negative integer"          // REQUIRED — day count
    }
  ],
  "sectionsOfTheWorks": [
    {
      "milestone":                "positive integer",             // REQUIRED — 1, 2, 3 …
      "sectionName":              "string",                       // REQUIRED
      "timeForCompletionDays":    "positive integer",             // REQUIRED — day count
      "startReference":           "string|null",                  // e.g. "Commencement Date"
      "finishReference":          "string|null"                   // e.g. "Time for Completion stated in Particular Conditions"
    }
  ],

  // Section 3.1 — Site Conditions (FLAT, NOT under "siteConditions")
  "ambientTempMaxC":                       "number|null",
  "ambientTempMinC":                       "number|null",
  "relativeHumidityMaxPct":                "number|null",          // 0..100
  "seawaterTempMaxC":                      "number|null",
  "seawaterTempMinC":                      "number|null",
  "windGust3sec50yrMs":                    "number|null",          // m/s
  "seismicIntensity":                      "string|null",          // "MMV II (Modified Mercalli)" etc.

  // Section 6.12 — Working Hours (FLAT, NOT under "workingHours")
  "workingHoursStart":                     "string|null",          // "07:00"
  "workingHoursEnd":                       "string|null",          // "18:00"
  "weekendWorkAllowed":                    "boolean|null",

  // Section 9 — Planning & QM
  "programmeSoftware":                     "string|null",          // "Primavera P6 / MS Project"
  "progressReportFrequency":               "string|null",          // "Weekly"
  "qmsStandard":                           "string|null",          // "ISO 9001"

  // Appendix A — Phases (FLAT, NOT under "appA")
  "phases": [
    {
      "phaseId":          "string",                                // REQUIRED
      "name":             "string",                                // REQUIRED
      "startMilestone":   "string|null",
      "finishMilestone":  "string|null"
    }
  ],

  // Appendix G — Responsibility Matrix (FLAT, NOT under "appG.rows")
  "responsibilityMatrixRows": [
    {
      "category":      "string",                                   // REQUIRED — "1. Safety & Site Environment"
      "ref":           "string",                                   // REQUIRED — "1.7"
      "itemLabel":     "string",                                   // REQUIRED — "Safety Register"
      "responsibility": "string",                                  // REQUIRED — "GC" / "PS" / "EM" / "EM/DC" / "N/A" — single value, not nested
      "pricingNote":   "string|null"                               // "Priced as Fixed Lump Sum under GC Preliminaries BOQ"
    }
  ],

  // Appendix H — BIM (FLAT, NOT under "appH.bim")
  "bimLodLevel":                           "string|null",          // "350" / "400"
  "bimPlatform":                           "string|null",          // "Revit 2024"
  "commonDataEnvironment":                 "string|null",          // "UNIFIER"

  // Appendix M — Tender Technical Deliverables (FLAT, NOT under "appM.technicalDeliverables")
  "technicalDeliverables": [
    {
      "scheduleId":         "string",                              // REQUIRED — "T1", "T2", …
      "scheduleLabel":      "string",                              // REQUIRED — deliverable name
      "formatRequired":     "string|null",                         // "PDF / Word / Excel / Primavera / Revit"
      "submissionWindow":   "string|null"                          // "With tender" / "28 days post-commencement" / "Per programme"
    }
  ],

  // Appendix N — Earned Value (FLAT, NOT under "appN")
  "cpiThresholdMin":                       "number|null",          // e.g. 0.95
  "spiThresholdMin":                       "number|null",          // e.g. 0.95

  // Appendix R — Sustainability (FLAT, NOT under "appR")
  "sustainabilityCertification":           "string|null",          // "LEED" / "Estidama" / "WELL"
  "sustainabilityCertificationLevel":      "string|null",          // "Gold" / "Pearl 3"

  // Optional verbatim clause archive — partial archive is acceptable on this doc (the surface is huge).
  "clauses": [
    { "ref": "string", "text": "string" }                          // both REQUIRED if row emitted
  ]
}
```

## Field guidance

- `district` — Section 1 location district / sub-project name.
- `commencementSubmissions[].id` / `.label` / `.daysAfterCommencement` — Section 2.1 (ix) — each commencement-window submittal (Programme / Method statement / Material submittals / Drawings schedule / Safety plan / QA-QC plan / Staffing schedule, etc.). All three fields required per row.
- `sectionsOfTheWorks[].milestone` / `.sectionName` / `.timeForCompletionDays` — Section 2.2 — one row per Section of the Works. `startReference`/`finishReference` optional but emit when stated.
- `ambientTempMaxC` / `…MinC` / `relativeHumidityMaxPct` / `seawaterTempMaxC` / `…MinC` / `windGust3sec50yrMs` / `seismicIntensity` — Section 3.1 climate / seismic data.
- `workingHoursStart` / `…End` — Section 6.12 normal working hours, "HH:MM" strings (24-hour).
- `weekendWorkAllowed` — Section 6.12.
- `programmeSoftware` — Section 9.1 required scheduling software.
- `progressReportFrequency` — Section 9.7.
- `qmsStandard` — Section 9.13 quality management standard.
- `phases[].phaseId` / `.name` — Appendix A phasing plan; `startMilestone`/`finishMilestone` optional but emit when stated.
- `responsibilityMatrixRows[].category` — top-level matrix category (e.g. "1. Safety & Site Environment"). Required.
- `responsibilityMatrixRows[].ref` — row reference within the category (e.g. "1.7"). Required.
- `responsibilityMatrixRows[].itemLabel` — row item label ("Safety Register"). Required.
- `responsibilityMatrixRows[].responsibility` — the assigned responsible party as a SINGLE STRING ("GC", "PS", "EM", "EM/DC", "N/A"). Do NOT emit a nested `responsibleBy:{gc:…}` object. If multiple columns assign different parties for the same row, pick the General Contractor (GC) column when present; otherwise the leftmost non-empty column.
- `responsibilityMatrixRows[].pricingNote` — pricing/lump-sum note where stated.
- `bimLodLevel` — Appendix H Level of Detail (e.g. "350").
- `bimPlatform` — Appendix H modelling platform (e.g. "Revit 2024").
- `commonDataEnvironment` — Appendix H CDE (e.g. "UNIFIER").
- `technicalDeliverables[].scheduleId` / `.scheduleLabel` — Appendix M Tender Technical Deliverable id and name.
- `technicalDeliverables[].formatRequired` / `.submissionWindow` — format and submission timing where stated.
- `cpiThresholdMin` / `spiThresholdMin` — Appendix N Earned Value thresholds (plain decimal numbers, e.g. 0.95).
- `sustainabilityCertification` / `sustainabilityCertificationLevel` — Appendix R targets.
- `clauses[].ref` / `.text` — verbatim archive of numbered clauses you can identify with confidence. **For this doc only, a partial archive is acceptable** — emit every clause you are confident about, skip the ones you cannot identify cleanly. Quality over completeness.

## Extraction quirks (preserved from prior runs)

- The surface is processed in chunks; treat each unit independently and let the merger combine. For SCALAR fields fill in whatever you see in this unit (even if it "might be in another unit"); for ARRAYS include only rows that appear in THIS unit.
- Section 2 (Key Dates) is short and structured — high confidence expected.
- Section 6 (Site Requirements) has many sub-clauses; emit only the fields named in the schema (working hours) — the other sub-clauses are clause-archive material.
- Section 9 (Planning) sub-clauses are the **compliance seeders**; the schema-named scalars (`programmeSoftware`, `progressReportFrequency`, `qmsStandard`) are the must-haves.
- Appendix G (Responsibility Matrix) is a wide grid table — column headers vary by sample. Each row is `category | ref | itemLabel | <one or more responsibility columns> | pricingNote`. Emit one `responsibilityMatrixRows[]` entry per row with the SINGLE-STRING `responsibility` per the field guidance.
- Appendix M (Tender Technical Deliverables) is the master submission checklist that seeds the project's compliance matrix downstream — capture every row you can read.
- Appendices labelled with letters (A, B, C, …, U, skipping P/Q) often ship as separate files — if a referenced appendix is absent from this surface, leave its fields null/[].
- Heading patterns vary widely across SOPRs — when in doubt about a field's source clause, prefer null over a guess.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `scope`, `keyDates`, `siteConditions`, `workingHours`, `appA`/`appG`/`appH`/`appM`/`appN`/`appR`, or any other envelope.
- `responsibilityMatrixRows[].responsibility` is a single string, NOT a `responsibleBy:{gc, ps, em}` object.
- `documentPriorityOrder`, `approvedBondBanks`, `phases`-startMilestone etc. — wherever a list is named, emit a flat array (no `{value:…}` wrappers).
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Never invent values. If a field is partly visible but uncertain, emit `null`.
- The schema above is the complete output contract — do not introduce keys that are not listed.
