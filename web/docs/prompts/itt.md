# `itt` — Instructions to Tenderer (extraction prompt)

The rules of the tender — how to bid, what to submit, in what format, when, in what currency, with what validity, against which bonds. Volume 1 of the tender package. Typical length: 15–20 pages, dense with clauses and an appendix set (A: Form of Agreement, B: Site Visit Confirmation, C: Submission Checklist, D: Current Commitment format).

The schema is **flat** — extract every value to its top-level key listed below. Do NOT nest under `bonds`, `evaluation`, `formOfAgreement`, `header`, or any other envelope; those nestings appear in older spec docs but the validator only accepts the flat shape.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Document identity
  "version":                              "string|null",         // "May 2024 Version" etc.

  // Submission rules (Clauses 4, 5, 6, 7, 11, 12, 13)
  "notificationOfIntentDays":             "non-negative integer|null",  // Clause 4
  "addendaCutoffDays":                    "non-negative integer|null",  // Clause 5 — days before deadline
  "clarificationCutoffDays":              "non-negative integer|null",  // Clause 6 — days before deadline
  "currency":                             "AED|USD|EUR|GBP|SAR|null",   // Clause 11
  "language":                             "string|null",                // Clause 13
  "vatTreatment":                         "exclusive|inclusive|null",   // Clause 10 — emit lowercase
  "requiredValidityDays":                 "positive integer|null",      // Clause 12

  // Bonds (Clause 15) — FLAT keys, NOT nested under "bonds"
  "bondsPerformanceRequired":             "boolean|null",
  "bondsAdvancePaymentRequired":          "boolean|null",
  "approvedBondBanks":                    [ "string", "string" ],       // bank names; [] if absent

  // Risk & RERA (Clauses 14A, 16)
  "alternativeTenderAllowed":             "boolean|null",
  "reraTrustAccountRequired":             "boolean|null",

  // Submission Schedules (Clause 8.1) — used to seed the compliance matrix
  "submissionSchedules": [
    {
      "id":     "string",                                                // REQUIRED if row emitted — "A1", "13", etc.
      "name":   "string",                                                // REQUIRED if row emitted — "Preliminary Programme" etc.
      "format": "string|null"                                            // "Primavera P6 / MS Project" etc.
    }
  ],                                                                     // [] if absent

  // Form of Agreement (Appendix A) — FLAT keys, NOT nested under "formOfAgreement"
  "engineerName":                         "string|null",                 // "Parsons Overseas Limited" etc.
  "documentPriorityOrder": [ "string" ],                                 // highest priority first; [] if absent

  // Evaluation — Arithmetic Error policy (Clause 18.2) — FLAT booleans, NOT nested under "evaluation.arithmeticErrorPolicy"
  "arithmeticErrorAdjustToBoqTotal":      "boolean|null",                // Clause 18.2(a)
  "arithmeticErrorLockIfBqHigher":        "boolean|null",                // Clause 18.2(b)
  "arithmeticErrorAdjustIfBqLower":       "boolean|null",                // Clause 18.2(c)

  // Optional verbatim clause archive
  "clauses": [
    { "ref": "string", "text": "string" }                                // both REQUIRED if row emitted
  ]
}
```

## Field guidance

- `version` — the date/version line on the cover ("May 2024 Version").
- `notificationOfIntentDays` — Clause 4 day count required before submission.
- `addendaCutoffDays` — Clause 5 cutoff in days before the tender submission deadline.
- `clarificationCutoffDays` — Clause 6 cutoff in days before the deadline.
- `currency` — Clause 11; uppercase ISO code.
- `language` — Clause 13 language of communication.
- `vatTreatment` — Clause 10 tender-sum VAT treatment; lowercase `"exclusive"` or `"inclusive"`.
- `requiredValidityDays` — Clause 12 minimum tender validity.
- `bondsPerformanceRequired` — Clause 15 — performance bond required of the awarded bidder.
- `bondsAdvancePaymentRequired` — Clause 15 — advance-payment bond required.
- `approvedBondBanks` — Clause 15 list of approved-bank names; emit as a flat string array of bank names (no `{value:…}` wrappers). `[]` if not stated.
- `alternativeTenderAllowed` — Clause 16.
- `reraTrustAccountRequired` — Clause 14A.
- `submissionSchedules[].id` / `.name` — Clause 8.1 schedule identifier ("A1", "A2", …, "13", …) and name. Both required for any emitted row.
- `submissionSchedules[].format` — per-schedule format requirement when stated (e.g. "Primavera P6 / MS Project"); null otherwise.
- `engineerName` — Appendix A engineer name (e.g. "Parsons Overseas Limited").
- `documentPriorityOrder` — Appendix A document priority list (Agreement > LoA > COC > Tender Addenda > Specification > Drawings > SOPR > BOQ etc.); preserve ORDER (priority rank = array position); emit a flat string array (no `{value:…}` wrappers).
- `arithmeticErrorAdjustToBoqTotal` / `…LockIfBqHigher` / `…AdjustIfBqLower` — Clause 18.2 sub-clauses (a)/(b)/(c) as three independent booleans.
- `clauses[].ref` / `.text` — when emitting the optional archive, capture each numbered clause with its verbatim body. Skip the archive entirely if uncertain; do not partial-fill it.

## Extraction quirks (preserved from prior runs)

- Cover page repeats the employer / development / site / package header — those identifiers are NOT extracted into this schema (they belong on the project record). Use them to VERIFY against the FOT, not to populate ITT fields.
- Clause 3 tender-document list is lettered (a)–(g). Formats are usually implicit in the line text ("in PDF and Excel") — capture them on `submissionSchedules[].format` where applicable.
- Clause 8.1 schedules appear as both (i)–(xvii) sub-list AND (A1)–(A17) schedule numbers. The schedule id we want is the A-prefixed form when present (and the bare numeric form 13–17 for the trailing entries); pair each with its full name.
- Clause 15 bond bank list is a 2-column table with SR + Bank Name (≈32 rows in the DCH sample). Watch for line-wrapped bank names ("Bank of Tokyo Mitsubishi-UAE").
- Clause 18.2 arithmetic-error rules: sub-clauses (a)/(b)/(c) are three INDEPENDENT booleans — read each separately even if all three are checked.
- Appendix A document priority is a vertical bullet list in Clause 2 of the Appendix — the order is the priority rank; preserve it.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `bonds`, `evaluation`, `formOfAgreement`, `header`, or any other envelope.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Never invent values. If a field is partly visible but uncertain, emit `null`.
- The schema above is the complete output contract — do not introduce keys that are not listed.
