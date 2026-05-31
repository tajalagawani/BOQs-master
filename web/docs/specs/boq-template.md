# `boq-template` — Blank BOQ / Pricing Schedule

The blank Bill of Quantities issued by the Employer. Defines every
priceable item with quantity and unit. Bidders fill in unit rates and
amounts → priced BOQ (see `boq-priceset.md`).

---

## 0. Verdict shape

The XLSX surface inlined in the user message contains every populated
cell, sheet-by-sheet. Read it once, build the verdict, emit. A correct
verdict shape:

```json
{
  "workbookCurrency": "AED",
  "workbookProjectName": "<copied from cover sheet>",
  "sheetsTotal": <int>,
  "bills": [
    {
      "sheet": "2B",
      "items": [
        { "itemLetter": "A", "description": "General site clearance",
          "quantity": 42268, "unit": "m²", "cell": "A14" },
        ...
      ]
    },
    ...
  ],
  "instances_examined": [
    { "instance_id": "item_0", "per_instance_verdict": "EXAMINED" },
    ...
  ]
}
```

`instances_examined` may be empty.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `boq-template` |
| `label` | Blank BOQ / Pricing Schedule |
| `shortLabel` | BOQ-T |
| `scope` | required |
| `category` | "Blank BOQ / Pricing Schedule" |
| `required` | ✓ |
| `manualFeasible` | **no** — hundreds of items, upload only |
| Sample | `EMR DCH PUBLIC REALM MW 0214 BQ (DEC 2025).xlsx` · 37 sheets · Dubai Creek Harbour |

---

## 2. Field inventory (AI extraction target)

### 2.1 Workbook level

| Field | Class | Notes |
| --- | --- | --- |
| `workbookCurrency` | EXTRACT | from per-sheet header "AED" column |
| `workbookProjectName` | VERIFY | matches `project.name` |
| `sheetsTotal` | EXTRACT | 37 |
| `coverSheet.text` | EXTRACT | "DUBAI CREEK HARBOUR LLC / TENDER DOCUMENTS / BILLS OF QUANTITIES" |
| `contentsSheet.bills[]` | EXTRACT | (Bill 1 General Requirements / Bill 2 Streetscape / Bill 3 Public Realm / Main Summary) |
| `contentsSheet.pageRanges[]` | EXTRACT | e.g. "1/A/1 ~ 1/A/9" |

### 2.2 Cover and frontmatter sheets

| Sheet | Class | Notes |
| --- | --- | --- |
| `Cover` | DISPLAY | static text |
| `Contents` | EXTRACT | bills index + page ranges |
| `Fly-RM` | DISPLAY | "PREAMBLES" cover |
| `Fly-MS` | DISPLAY | "MAIN SUMMARY" cover |

### 2.3 Bill 1 — General Requirements (sheet ` 1 Gen Req `)

7-column structure (different from measured bills):

| Column | Class | Notes |
| --- | --- | --- |
| `bill1.columnHeaders` | EXTRACT | "Item / Description / Unit / Fixed Cost AED / Time Related Cost AED / Amount AED" |
| `bill1.subSections[].code` | EXTRACT | A1, A1.1, B2, etc. |
| `bill1.subSections[].title` | EXTRACT | "Conditions of Contract", "Advance Payment Guarantee", … |
| `bill1.items[].itemLetter` | EXTRACT | A, B, C |
| `bill1.items[].number` | EXTRACT | 1, 2, 3 |
| `bill1.items[].description` | EXTRACT | may span multiple rows |
| `bill1.items[].unit` | EXTRACT | "Item" (most), "Sum", etc. |
| `bill1.items[].fixedCostAED` | DISPLAY | blank on template |
| `bill1.items[].timeRelatedCostAED` | DISPLAY | blank on template |
| `bill1.items[].amountAED` | DISPLAY | blank on template (formula) |

### 2.4 Bills 2 & 3 — Measured Works (sheets `2B`, `2C`, …, `3R`)

6-column structure:

| Column | Class | Notes |
| --- | --- | --- |
| `bills[i].billNo` | EXTRACT | 2 or 3 |
| `bills[i].billTitle` | EXTRACT | "Streetscape" / "Public Realm" |
| `bills[i].element` | EXTRACT | B, C, D, E, F, G, H, J, K, L, M, N, Q, R |
| `bills[i].sectionHeaders[]` | EXTRACT | "SITE WORK", "SITE PREPARATION", "EARTHWORKS", "FILLING", etc. |
| `bills[i].columnHeaders` | EXTRACT | "Item / Description / Quantity / Unit / Rate AED / Amount AED" |
| `bills[i].items[].itemLetter` | EXTRACT | A, B, C (or blank for note/header rows) |
| `bills[i].items[].description` | EXTRACT | may span multiple rows; concatenate continuation rows that have empty Item column |
| `bills[i].items[].quantity` | EXTRACT | number with thousands separators |
| `bills[i].items[].unit` | EXTRACT | "m²", "m³", "nr", "item", "kg", "to", "L.M." |
| `bills[i].items[].rateAED` | DISPLAY | blank on template |
| `bills[i].items[].amountAED` | DISPLAY | blank on template (formula = qty × rate) |
| `bills[i].subTotalMarkers[]` | EXTRACT | "To Collection" rows — section subtotal carry-forward points |
| `bills[i].notes[]` | EXTRACT | header note rows like "Note: Refer to the following" / "1. Landscape specification" |
| `bills[i].rowCount` | DISPLAY | sheet's row range |

### 2.5 Summary sheets (`2 SUM`, `3 SUM`, `MS`)

| Field | Class | Notes |
| --- | --- | --- |
| `summary.billRef` | EXTRACT | which bill |
| `summary.entries[].label` | EXTRACT | section names |
| `summary.entries[].pageRef` | EXTRACT | reference to detail page |
| `summary.entries[].amount` | DISPLAY | blank on template |
| `summary.billTotal` | DISPLAY | blank on template |
| `mainSummary.entries[]` | EXTRACT | Bill 1, Bill 2 total, Bill 3 total |
| `mainSummary.grandTotal` | DISPLAY | blank on template |
| `mainSummary.tenderSumStatement` | EXTRACT | "amount inserted in the Form of Tender" reference |

**Total fields per workbook:** thousands of priceable items, hundreds of metadata fields.

---

## 3. Zod schema

```ts
export const boqTemplateSchema = z.object({
  workbookCurrency: z.string(),
  workbookProjectName: z.string(),
  sheetsTotal: z.number().int(),

  bills: z.array(z.object({
    billNo: z.number().int(),
    billTitle: z.string(),
    pricingMode: z.enum(["measured", "general_req"]),
    sections: z.array(z.object({
      code: z.string(),                     // "B", "C", or "A1.1" for general-req
      title: z.string(),
      items: z.array(z.object({
        itemLetter: z.string().nullable(),  // null on non-priceable rows
        number: z.number().int().optional(),
        description: z.string(),
        unit: z.string().nullable(),
        quantity: z.number().nullable(),    // null on general-req items
      })),
      subTotalRows: z.array(z.object({ label: z.string(), refersToCollection: z.boolean() })),
    })),
  })),

  mainSummary: z.object({
    entries: z.array(z.object({
      label: z.string(),
      pageRef: z.string().optional(),
    })),
  }),
})

export type BoqTemplate = z.infer<typeof boqTemplateSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Blank BOQ / Pricing Schedule]
└── [Tabs: Manual | Upload]
    ├── Manual tab — read-only note
    │   "BOQ templates have thousands of items. Manual entry is not supported.
    │    Please use Upload."
    │   • Currency override                 (optional select)
    │   • Project name verification        (text, auto-filled)
    └── Upload tab
        Drop zone / Browse → AI extraction → Parsed sheets summary:
            • Bills detected: 1, 2, 3
            • Sections per bill: …
            • Total priceable items: N
            • Validation: section subtotals ≈ main summary ✓
        [Save BOQ template]
```

---

## 5. Persistor mapping

```ts
// Creates one boq_template + many boq_section + many boq_item rows
await db.insert(boqTemplates).values({
  workspaceId, projectId,
  name: "Main BOQ Template",
  ownerKind: "project",
  ownerId: projectId,
  currency: data.workbookCurrency,
  sourceDocumentId: uploadedDoc.id,
})

for (const bill of data.bills) {
  for (const section of bill.sections) {
    const sectionId = await db.insert(boqSections).values({
      templateId,
      code: `${bill.billNo}-${section.code}`,
      label: section.title,
      pricingMode: bill.pricingMode,
      position: ...,
    })

    for (const item of section.items) {
      if (item.itemLetter === null) continue  // skip note/header rows
      await db.insert(boqItems).values({
        sectionId,
        no: item.itemLetter,
        label: item.description,
        unit: item.unit,
        quantityPlanned: item.quantity,
      })
    }
  }
}
```

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `workbookCurrency` must equal `project.currency` | save | hard |
| Section subtotals ≈ main summary grand-total area (within 0.01% tolerance) | save | soft |
| Bill 1 General Req sheet must have 7 columns; Bills 2-3 must have 6 columns | save | hard |
| Item codes must be unique within a section | save | hard |
| Sheet name pattern must match `(1|2|3)([A-Z]+|FS|SUM)` | save | hard |

---

## 7. Agent extraction notes

- Workbook has 37 sheets; pre-extractor enumerates each with `pricing_mode` (measured / general_req / summary / frontmatter).
- **Item-letter test:** rows with a single letter (A/B/C/...) in column A are priceable; rows with blank column A are description-continuation OR note/header rows.
- **Description-continuation rule:** when a row has blank Item but text in Description, append it to the previous priceable item's description.
- **"To Collection" detection:** rows where column D (Unit) reads "To Collection" mark subtotals — capture as section_subtotal markers, not items.
- **Bill 1 split:** Bill 1 has a 7-column shape (Fixed Cost + Time Related Cost). Other bills are 6-column. Detect by header row count.
- **Element letter range:** 2-bills use B/C/E/F/G/J/K/L/M/N/Q/R (skip D/H/I/O/P); 3-bills use B/C/D/E/F/G/H/J/K/L/M/N/Q/R (skip A/I/O/P). Don't error on missing letters — they're intentional gaps in the CESMM/SMM7 element coding.
- **Sheet name trimming:** sheet names may have leading/trailing spaces (" 1 Gen Req " has 2 spaces). Trim and normalise to uppercase before matching.
- **Quantity parsing:** numbers have thousands separators (`42,268`). Parse as float (or Decimal if precision matters).
- **Unit normalisation:** map "m²", "m2", "sqm" → "m2"; "m³", "m3" → "m3"; "nr", "No", "No." → "nr"; etc.

---

## 8. Sample evidence

Dubai Creek Harbour BOQ structure:

- 37 sheets total
- Bill 1 — General Requirements (sheets `1FS`, ` 1 Gen Req `) — 7-column
- Bill 2 — Streetscape (`2 FS`, `2B`, `2C`, `2E`, `2F`, `2G`, `2J`, `2K`, `2L`, `2M`, `2N`, `2Q`, `2R`, `2 SUM`) — 6-column
- Bill 3 — Public Realm (`3 FS`, `3B`, `3C`, `3D`, `3E`, `3F`, `3G`, `3H`, `3J`, `3K`, `3L`, `3M`, `3N`, `3Q`, `3R`, `3 SUM`) — 6-column
- Main Summary (`Fly-MS`, `MS`)
- Currency: AED
- Total measurable items (estimated): ~2000-4000 across all sheets

Example rows from `2B`:

| Item | Description | Quantity | Unit | Rate AED | Amount AED |
| --- | --- | --- | --- | --- | --- |
| A | General site clearance | 42,268 | m² | _(blank)_ | _(blank)_ |
| A | Excavation to reduce levels | 8,950 | m³ | _(blank)_ | _(blank)_ |
| B | Excavation to lawn, shrubs and groundcovers | 4,983 | m³ | _(blank)_ | _(blank)_ |
| (blank) | _(continuation)_ | _(blank)_ | "To Collection" | _(blank)_ | "-" |
