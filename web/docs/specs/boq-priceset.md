# `boq-priceset` — Priced BOQ (bidder submission)

The bidder's filled-in BOQ workbook. Same template as `boq-template` but
with `Rate AED` and `Amount AED` columns populated. Returned with the
FOT.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `boq-priceset` |
| `label` | Priced BOQ |
| `shortLabel` | BOQ-P |
| `scope` | bidder_submission |
| `category` | "Priced BOQ" |
| `required` | per-bidder (one per round per tenderer) |
| `manualFeasible` | **headers only** — Main Summary total + stamp confirmations are manual; line-item rates require upload |
| Sample | _pending_ — same workbook as `boq-template` with rates filled |

---

## 2. Field inventory (AI extraction target)

### 2.1 Identity

| Field | Class | Notes |
| --- | --- | --- |
| `tendererStamp.companyName` | EXTRACT | from cover sheet stamp or footer |
| `tendererStamp.tradeLicense` | EXTRACT | if present |
| `templateMatchId` | VERIFY | hash of section/item codes → must match `boq_template` for the project |
| `pageStampCount` | EXTRACT | (per ITT Clause 8.1(c)(ii)) — every page must be stamped |
| `pageStampCoverage` | EXTRACT | true if every page stamped |
| `grandSummarySigned` | EXTRACT | true if MS sheet signed by FoT signatory |

### 2.2 Rates (per priceable row)

| Field | Class | Notes |
| --- | --- | --- |
| `priceset.items[].itemKey` | VERIFY | maps to `boq_item` via (bill, section, itemLetter) |
| `priceset.items[].unitRateCents` | EXTRACT | bigint cents (null if unpriced) |
| `priceset.items[].amountCents` | EXTRACT | bigint cents (or computed `qty × rate`) |
| `priceset.items[].isUnpriced` | EXTRACT | true if rate is blank, zero, or contains "Excluded" / "Included" / "By Others" |
| `priceset.items[].normalisedRateCents` | DISPLAY | filled by analysis pipeline only |
| `priceset.items[].arithmeticalError` | VERIFY | true if `abs(amount - qty * rate) > tolerance` |
| `priceset.items[].excludedTag` | EXTRACT | tag if marked Excluded / By Client / By Others |

### 2.3 Bill 1 General Requirements (different shape)

| Field | Class | Notes |
| --- | --- | --- |
| `priceset.bill1.items[].fixedCostCents` | EXTRACT | |
| `priceset.bill1.items[].timeRelatedCostCents` | EXTRACT | |
| `priceset.bill1.items[].totalAmountCents` | VERIFY | = fixed + timeRelated |

### 2.4 Subtotals and summaries

| Field | Class | Notes |
| --- | --- | --- |
| `priceset.sectionSubtotals[].sectionCode` | EXTRACT | |
| `priceset.sectionSubtotals[].subtotalCents` | EXTRACT | |
| `priceset.subtotals[].pageRef` | EXTRACT | (carried by "To Collection" rows) |
| `priceset.billSubtotals[].billNo` | EXTRACT | |
| `priceset.billSubtotals[].subtotalCents` | EXTRACT | |
| `mainSummary.entries[].label` | EXTRACT | |
| `mainSummary.entries[].amountCents` | EXTRACT | |
| `mainSummary.grandTotal` | EXTRACT | matches `fot.tenderSumFigures` (cross-check) |

### 2.5 Derived flags (server-computed)

| Field | Class | Notes |
| --- | --- | --- |
| `aggregates.pricedItemCount` | DERIVED | non-unpriced items count |
| `aggregates.unpricedItemCount` | DERIVED | unpriced items count |
| `aggregates.arithmeticalErrorCount` | DERIVED | error rows count |
| `aggregates.highRateCount` | DERIVED | from analysis engine (post-extract) |
| `aggregates.lowRateCount` | DERIVED | from analysis engine (post-extract) |

---

## 3. Zod schema

```ts
export const boqPricesetSchema = z.object({
  tendererName: z.string(),
  templateMatchId: z.string(),

  pageStampCoverage: z.boolean(),
  grandSummarySigned: z.boolean(),

  items: z.array(z.object({
    itemKey: z.string(),                     // "2-B-A-row3"
    unitRateCents: z.bigint().nullable(),
    amountCents: z.bigint().nullable(),
    isUnpriced: z.boolean(),
    excludedTag: z.enum(["excluded", "by_client", "by_others", "included_above"]).nullable(),
  })),

  bill1Items: z.array(z.object({
    itemKey: z.string(),
    fixedCostCents: z.bigint().nullable(),
    timeRelatedCostCents: z.bigint().nullable(),
    totalAmountCents: z.bigint().nullable(),
  })).optional(),

  sectionSubtotals: z.array(z.object({ sectionCode: z.string(), subtotalCents: z.bigint() })),
  billSubtotals: z.array(z.object({ billNo: z.number().int(), subtotalCents: z.bigint() })),

  mainSummary: z.object({
    entries: z.array(z.object({ label: z.string(), amountCents: z.bigint() })),
    grandTotal: z.bigint(),
  }),
})

export type BoqPriceset = z.infer<typeof boqPricesetSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Priced BOQ]
└── [Tabs: Manual | Upload]
    ├── Manual tab — headers only
    │   ├── Tenderer (company picker)
    │   ├── Headline figures
    │   │   • Main Summary grand total (currency)
    │   │   • Each page stamped         (checkbox)
    │   │   • Grand Summary signed      (checkbox)
    │   └── Section: Line items
    │       Read-only note:
    │       "Item rates must come from the uploaded Excel workbook.
    │        Use the Upload tab."
    └── Upload tab
        Drop zone (XLSX only) → AI extraction:
            ✓ Template match: 100%
            ✓ X priceable items priced / Y unpriced
            ⚠ Z arithmetical errors detected
            Main Summary total: AED ...
            Cross-check vs FOT tender sum: ✓ matches
        [Save priced BOQ]
```

---

## 5. Persistor mapping

```ts
// Create one priceset linked to the tenderer_submission
const pricesetId = await db.insert(boqPricesets).values({
  templateId: project.boqTemplateId,
  ownerKind: "submission",
  ownerId: tendererSubmissionId,
  label: `${tendererName} priced BOQ`,
  currency: data.currency,
})

// One boq_item_rate per priceable item (keyed by template match)
for (const item of data.items) {
  await db.insert(boqItemRates).values({
    pricesetId,
    itemId: lookupBoqItem(item.itemKey),
    unitRateCents: item.unitRateCents,
    amountCents: item.amountCents,
    isUnpriced: item.isUnpriced,
    isArithmeticalError: item.arithmeticalError ?? false,
  })

  // Arithmetical-error flag per error
  if (item.arithmeticalError) {
    await db.insert(flags).values({
      pricesetId,
      itemRateId,
      kind: "arithmetical_error",
      varianceCents: item.amountCents - item.unitRateCents * item.quantity,
    })
  }
}

// Update tenderer_submission with the totals
await db.update(tendererSubmissions).set({
  tenderSumCents: data.mainSummary.grandTotal,
  pricedItems: aggregates.pricedItemCount,
  unpricedItems: aggregates.unpricedItemCount,
  arithmeticalErrors: aggregates.arithmeticalErrorCount,
  sourceDocumentId: uploadedDoc.id,
}).where(eq(tendererSubmissions.id, tendererSubmissionId))
```

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `templateMatchId` must equal `project.boq_template.fingerprint` | save | hard — if mismatch, reject ("wrong template version") |
| `mainSummary.grandTotal` must equal `fot.clause1.tenderSumFigures` (within rounding) | save | hard |
| `mainSummary.grandTotal` should round-trip with `fot.clause1.tenderSumWords.parsed()` | save | hard |
| `billSubtotals[].subtotalCents` must equal sum of section subtotals within the bill | save | soft |
| `mainSummary.grandTotal` must equal `sum(billSubtotals[].subtotalCents)` | save | hard |
| `pageStampCoverage` must be true (ITT Clause 8.1(c)(ii)) | save | soft (warn) |
| `grandSummarySigned` must be true | save | soft (warn) |
| If `fot.tenderSumFigures` ≠ `boq.mainSummary.grandTotal` → apply ITT Clause 18.2 arithmetic-error policy | save | hard |

---

## 7. Agent extraction notes

- **Template match first.** Compute the SHA-256 hash of the workbook's sheet structure (sheet names + per-sheet column-header rows). Compare with `project.boq_template.fingerprint`. If mismatch, return `MISMATCHED_TEMPLATE` with the closest matching template.
- **Per-row extraction.**
  - Item rows (column A = letter): read Rate AED + Amount AED.
  - Continuation rows: skip.
  - "To Collection" rows: extract as subtotal.
  - Empty rate but item priced → flag as `isUnpriced=true`.
  - Rate field containing text ("Excluded", "Included", "By Others") → set `excludedTag` to the matching enum.
- **Arithmetical-error detection.**
  - For each item, compute `expected = quantity × rate`.
  - If `abs(amount - expected) > tolerance` (default 0.01 AED or 0.1% of expected), flag as arithmetical error.
  - Store both `actual` and `expected` for the side panel.
- **Bill 1 different shape.** Detect by 7-column header; extract fixed + time-related separately.
- **Stamp detection.** Look for stamp/seal images on each page footer; mark `pageStampCoverage` true if ≥95% of pages have a stamp (allow for blank cover/contents/summary pages).
- **Cross-check FOT.** When the priced BOQ extracts, fetch the same bidder's FOT (if uploaded) and compare `mainSummary.grandTotal` with `fot.tenderSumFigures`. Surface mismatch as a finding.

---

## 8. Sample evidence

_Sample pending._ Will follow the same structure as `boq-template.md`'s sample (Dubai Creek Harbour BOQ.xlsx) with the Rate and Amount columns filled in.

Expected behaviour on test data:

- ~2000-4000 priceable items per workbook
- Typical bidder unpriced count: 0-50 (items they exclude or won't price)
- Typical arithmetical error count: 0-20 (rounding errors, formula breaks)
- Main Summary grand total must match FOT figures
