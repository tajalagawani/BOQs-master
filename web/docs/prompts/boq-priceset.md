# `boq-priceset` — Priced BOQ (extraction prompt)

The bidder's filled-in BOQ — same workbook structure as `boq-template` plus unit rates and amounts on every priceable row, populated section subtotals, populated bill summaries, and a populated Main Summary. Used downstream for variance analysis against the Pre-Tender Estimate and against other bidders.

> **Validator note (advisory):** the runtime validator is currently `z.unknown()` — any JSON shape will pass zod. The rich schema below is the extraction contract this prompt enforces. The validator will be tightened in a later task.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Identity
  "tendererName":         "string|null",                     // bidder legal name
  "workbookCurrency":     "AED|USD|EUR|GBP|SAR|null",
  "sheetsTotal":          "non-negative integer|null",

  // Per-bill priceable items with rates / amounts
  "bills": [
    {
      "billNo":     "positive integer",                       // REQUIRED if row emitted
      "billTitle":  "string|null",                            // "Streetscape" / "Public Realm" / "General Requirements"
      "pricingMode": "measured|general_req",                  // 7-col Gen Req vs 6-col measured
      "sections": [
        {
          "code":  "string|null",                             // element letter ("B", "C", …) or general-req section code ("A1.1")
          "title": "string|null",                             // "EARTHWORKS" / "FILLING" / …
          "items": [
            {
              "itemLetter":  "string|null",                   // A/B/C/… or null on non-priceable lines
              "description": "string",                        // REQUIRED if row emitted; concatenate continuations
              "quantity":    "number|null",                   // null on general-req lump items
              "unit":        "string|null",
              "rateCents":   "integer minor units|null",      // emit major × 100; null where blank
              "amountCents": "integer minor units|null",      // emit major × 100; equals qty × rate for measured items
              "cell":        "string|null"
            }
          ],
          "sectionSubtotalCents": "integer minor units|null"  // "To Collection" / section total amount, minor units
        }
      ],
      "billSubtotalCents": "integer minor units|null"         // bill summary total, minor units
    }
  ],                                                          // [] if no bills parsed

  // Main Summary — bidder's grand total
  "mainSummary": {
    "entries": [
      {
        "billRef":  "string",                                 // REQUIRED if row emitted — "Bill 1" / "Bill 2 Streetscape" etc.
        "amountCents": "integer minor units|null"
      }
    ],
    "grandTotalCents": "integer minor units|null"             // tender sum equivalent
  },

  // Arithmetic check anchors
  "tenderSumCents":      "integer minor units|null",          // bidder's stated tender sum equivalent (should equal mainSummary.grandTotalCents)
  "vatTreatment":        "exclusive|inclusive|null",          // emit lowercase
  "vatPercent":          "number 0..100|null"
}
```

## Field guidance

- `tendererName` — bidder's legal name from the cover sheet or stamp; null if unstated.
- `workbookCurrency` / `sheetsTotal` — as `boq-template`.
- `bills[].billNo` — 1, 2, 3 etc. Required for any emitted bill.
- `bills[].billTitle` — title from the flysheet or contents page.
- `bills[].pricingMode` — `general_req` for the 7-column Bill 1 General Requirements sheet; `measured` for 6-column measured bills.
- `bills[].sections[].code` — element letter (B, C, D, …) for measured bills or sub-section code (A1.1, A1.2, …) for general-req.
- `bills[].sections[].title` — section heading verbatim ("EARTHWORKS", "FILLING", "Conditions of Contract", …).
- `bills[].sections[].items[].itemLetter` — same priceable-row test as `boq-template`.
- `bills[].sections[].items[].description` — concatenate continuation rows (blank column A) into the preceding priceable item.
- `bills[].sections[].items[].quantity` — numeric; null on lump-sum general-req items.
- `bills[].sections[].items[].unit` — normalised unit symbol.
- `bills[].sections[].items[].rateCents` — bidder's unit rate **in minor units** (major × 100). null where the rate cell is blank.
- `bills[].sections[].items[].amountCents` — line amount in minor units. For measured items should equal `quantity × rateCents`; do NOT recompute — emit what is in the workbook (arithmetic check happens downstream).
- `bills[].sections[].items[].cell` — A-column cell reference of the priceable row.
- `bills[].sections[].sectionSubtotalCents` — section subtotal as written (typically next to "To Collection"), minor units.
- `bills[].billSubtotalCents` — bill summary total from the per-bill summary sheet, minor units.
- `mainSummary.entries[].billRef` / `.amountCents` — Main Summary rows referencing each bill subtotal.
- `mainSummary.grandTotalCents` — Main Summary grand total in minor units.
- `tenderSumCents` — bidder's stated tender-sum equivalent; downstream cross-check confirms it matches `mainSummary.grandTotalCents` and the FOT Clause 1 tender sum.
- `vatTreatment` / `vatPercent` — VAT statement; "exclusive"/"inclusive" lowercase; percent as plain number.

## Extraction quirks (preserved from prior runs)

- All workbook-structure rules from `boq-template.md` apply (sheet count, priceable-row test via column A, continuation rows, "To Collection" markers, element-letter gaps, sheet-name spaces).
- **Rates and amounts are the new content** versus the blank template. They may be entered as numbers, formulas, or hard-coded text — capture the displayed value as a number, in minor units (major × 100).
- **Arithmetic errors** are common — emit the displayed amount EVEN IF it doesn't equal `quantity × rate`. Downstream arithmetic-error policy (per ITT Clause 18.2) decides how to treat the mismatch.
- **Currency.** Should equal the project currency (cross-checked against `fot.currency` and `itt.currency`).
- **Multiple bidders** mean multiple priced BOQs per project — this extraction runs once per file; downstream code handles many-per-project.
- **Provisional Sums and Contingencies** are typically lump-sum entries at the end of a bill or in their own bill — capture them as priceable items with `quantity: null` and the amount in `amountCents`.
- **Main Summary may include** non-bill rows like provisional sums, contingencies, OHP markup. Capture each as a `mainSummary.entries[]` row with its label in `billRef`.
- **Grand-total cell** is typically labelled "Tender Sum" or "Total Carried to Form of Tender". Pull from the labelled total cell, not from a sum-of-entries computation.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `workbook`, `summary`, or any other envelope.
- Money values are integer minor units (major × 100). Percentages are plain numbers in 0..100.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Never invent values. If a rate or amount is partly visible but uncertain, emit `null`.
- The schema above is the complete output contract — do not introduce keys that are not listed.
