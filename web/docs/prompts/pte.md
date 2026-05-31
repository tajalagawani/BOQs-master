# `pte` — Pre-Tender Estimate (extraction prompt)

Internal cost estimate prepared by the QS / Cost Manager before tenders are opened. Used as the reference baseline for variance analysis in Step 5. Format varies more than other docs — each QS firm has its own template — typically a multi-sheet XLSX with a sectional breakdown mirroring the BOQ structure plus contingency and escalation adjustments.

> **Validator note (advisory):** the runtime validator is currently `z.unknown()` — any JSON shape will pass zod. The schema below is the extraction contract this prompt enforces. The validator will be tightened in a later task.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Identity
  "currency":           "AED|USD|EUR|GBP|SAR|null",
  "version":            "string|null",                          // "v1.0" / "Rev 02"
  "preparedBy":         "string|null",                          // QS firm / internal team
  "preparedAt":         "ISO date string|null",
  "assumptions":        [ "string" ],                           // pricing assumptions; [] if none
  "contingencyPercent": "number 0..100|null",                   // overall contingency %
  "escalationPercent":  "number 0..100|null",                   // escalation provision %

  // Sectional breakdown (mirrors BOQ structure)
  "sections": [
    {
      "billRef":         "string",                              // REQUIRED if row emitted — "1" / "2" / "3"
      "sectionCode":     "string",                              // REQUIRED if row emitted — matches boq_section.code (e.g. "B", "C", "A1.1")
      "label":           "string|null",                         // "Earthworks" / "Substructure" etc.
      "estimateCents":   "integer minor units",                 // REQUIRED if row emitted — section estimate, minor units
      "breakdown": [                                            // optional per-row item-level breakdown
        {
          "label":       "string",                              // REQUIRED if breakdown row emitted
          "amountCents": "integer minor units"                  // REQUIRED if breakdown row emitted
        }
      ],
      "notes":           "string|null"                          // basis-of-estimate note (rate source, supplier quote)
    }
  ],

  // Totals
  "totalCents":          "integer minor units|null",            // sum of sections; must equal Σ sections[].estimateCents
  "subtotalsByBill": [
    {
      "billRef":      "string",                                 // REQUIRED if row emitted
      "subtotalCents": "integer minor units"                    // REQUIRED if row emitted
    }
  ],

  // Foreign-currency conversion (only when estimate currency ≠ project currency)
  "fx": {
    "estimateCurrency": "string|null",                          // ISO code of the estimate's currency
    "rate":             "number|null",                          // conversion rate to project currency
    "asOfDate":         "ISO date string|null",
    "source":           "string|null"                           // "central-bank" / "midmarket" / "fixed"
  }
}
```

## Field guidance

- `currency` — project currency the estimate is denominated in (uppercase ISO code).
- `version` / `preparedBy` / `preparedAt` — cover-sheet identity.
- `assumptions` — bullet list of pricing assumptions stated on the cover or assumptions sheet.
- `contingencyPercent` / `escalationPercent` — overall provisions, plain numbers in 0..100.
- `sections[].billRef` — the bill the section belongs to ("1", "2", "3"). Required.
- `sections[].sectionCode` — the section code as written; should match `boq_section.code` (downstream cross-check). Required.
- `sections[].label` — section name from the spreadsheet ("Earthworks", "Substructure", "External Works").
- `sections[].estimateCents` — the QS's estimate for the section, in minor units (major × 100). Required.
- `sections[].breakdown[].label` / `.amountCents` — optional item-level breakdown when present.
- `sections[].notes` — basis-of-estimate text ("Rates from project XYZ" / "Supplier quote dated …").
- `totalCents` — overall total in minor units; should equal sum of `sections[].estimateCents`.
- `subtotalsByBill[]` — per-bill subtotal rows where present.
- `fx.*` — only populated when the estimate is in a currency different from the project currency. Emit the conversion rate, the date the rate was captured, and the source.

## Extraction quirks (preserved from prior runs)

- PTE format varies more than any other doc. Look for **section-aligned totals**: column A typically holds section labels; the currency amount is in a column further right.
- Common column layouts: `Element | Description | Quantity | Unit | Rate | Amount | Cost`.
- **Separator rows** ("Sub-total", "Total", "Carry forward") are not items — skip them as `sections[].breakdown[]` entries.
- **Multi-sheet PTEs** typically split per discipline or per bill. Aggregate sections across sheets into one `sections[]` array.
- **Contingency and escalation** lines appear at the bottom — extract their percentages into the top-level fields; do NOT emit them as section rows.
- **Confidence threshold:** PTE structure varies enough that `extracted-with-warnings` is acceptable. Emit what you can identify; leave the rest null. The QS can adjust manually in the UI.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `estimate`, `summary`, or any other envelope.
- Money values are integer minor units (major × 100). Percentages are plain numbers in 0..100.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Omit the `fx` object entirely (or emit `{}` with all-null fields) when the estimate is already in the project currency.
- Never invent values. If a row's estimate amount is partly visible but uncertain, skip the row.
- The schema above is the complete output contract — do not introduce keys that are not listed.
