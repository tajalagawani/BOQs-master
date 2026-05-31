# `pte` — Pre-Tender Estimate

Internal cost estimate prepared by the QS / Cost Manager before tenders
are opened. Used as the reference baseline for variance analysis in
Step 5. Never shown to tenderers (unless the project chooses to disclose
it in the PTC pack via Step 4 settings).

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `pte` |
| `label` | Pre-Tender Estimate |
| `shortLabel` | PTE |
| `scope` | pte |
| `category` | "Pre-Tender Estimate" |
| `required` | – (optional but strongly recommended) |
| `manualFeasible` | **section totals** — full line-item entry via upload |
| Sample | _pending_ — request your internal PTE template (XLSX) |

---

## 2. Field inventory

### 2.1 Identity

| Field | Class | Notes |
| --- | --- | --- |
| `currency` | EXTRACT | project currency (default AED) |
| `version` | EXTRACT | "v1.0" / "Rev 02" |
| `preparedBy` | EXTRACT | QS firm or internal team |
| `preparedAt` | EXTRACT | date |
| `assumptions[]` | EXTRACT | list of pricing assumptions |
| `contingencyPercent` | EXTRACT | overall contingency |
| `escalationPercent` | EXTRACT | escalation provision |

### 2.2 Sectional structure (matches BOQ structure)

| Field | Class | Notes |
| --- | --- | --- |
| `sections[].billRef` | EXTRACT | "1" / "2" / "3" |
| `sections[].sectionCode` | EXTRACT | matches `boq_section.code` |
| `sections[].label` | EXTRACT | "Site Work" / "Earthworks" / "Substructure" / … |
| `sections[].estimateCents` | EXTRACT | the QS's estimate for the section |
| `sections[].breakdown[].label` | EXTRACT (optional) | item-level breakdown if available |
| `sections[].breakdown[].amountCents` | EXTRACT (optional) | |
| `sections[].notes` | EXTRACT | basis of estimate (rates from previous project / supplier quote) |

### 2.3 Totals

| Field | Class | Notes |
| --- | --- | --- |
| `total` | EXTRACT | must equal sum of sections |
| `subtotalsByBill[]` | EXTRACT | per-bill subtotals |
| `withContingencyTotal` | DERIVED | total × (1 + contingencyPercent/100) |
| `withEscalationTotal` | DERIVED | + escalation |

### 2.4 FX (when project currency ≠ estimate currency)

| Field | Class | Notes |
| --- | --- | --- |
| `fx.estimateCurrency` | EXTRACT | if different from project currency |
| `fx.rate` | EXTRACT | conversion rate to project currency |
| `fx.asOfDate` | EXTRACT | when the rate was captured |
| `fx.source` | EXTRACT | central-bank / midmarket / fixed |

---

## 3. Zod schema

```ts
export const pteSchema = z.object({
  currency: z.string(),
  version: z.string().optional(),
  preparedBy: z.string().optional(),
  preparedAt: z.string().date().optional(),
  assumptions: z.array(z.string()).optional(),
  contingencyPercent: z.number().optional(),
  escalationPercent: z.number().optional(),

  sections: z.array(z.object({
    billRef: z.string(),
    sectionCode: z.string(),
    label: z.string(),
    estimateCents: z.bigint(),
    breakdown: z.array(z.object({
      label: z.string(),
      amountCents: z.bigint(),
    })).optional(),
    notes: z.string().optional(),
  })),

  total: z.bigint(),

  fx: z.object({
    estimateCurrency: z.string(),
    rate: z.number(),
    asOfDate: z.string().date(),
    source: z.string(),
  }).optional(),
})

export type Pte = z.infer<typeof pteSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Pre-Tender Estimate (PTE)]
└── [Tabs: Manual | Upload]
    ├── Manual tab
    │   ├── Identity
    │   │   • Currency, Version, Prepared by, Prepared at
    │   ├── Assumptions (repeating-rows)
    │   ├── Sections (repeating-rows)
    │   │   • Bill ref | Section code | Label | Estimate (currency) | Notes
    │   ├── Adjustments
    │   │   • Contingency % | Escalation %
    │   ├── Totals (auto-computed, read-only)
    │   └── FX (collapsed by default; only if different from project currency)
    └── Upload tab
        Drop zone (XLSX) → AI extraction → preview parsed sections
        [Save PTE]
```

---

## 5. Persistor mapping

```ts
// Create a boq_priceset for the PTE
const pricesetId = await db.insert(boqPricesets).values({
  templateId: project.boqTemplateId,        // links to project's BOQ template
  ownerKind: "estimate",
  ownerId: projectId,
  label: `PTE v${data.version ?? "1"}`,
  currency: data.currency,
})

// Each section becomes a boq_item_rate at section-level
for (const section of data.sections) {
  const sectionItemId = lookupSectionTotalItem(section.sectionCode)
  await db.insert(boqItemRates).values({
    pricesetId,
    itemId: sectionItemId,
    amountCents: section.estimateCents,
  })
}

// Available as analysis baseline when QS selects "PTE" in Step 4
```

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `sections[].sectionCode` must reference a real `boq_section` for the project | save | hard |
| `total` must equal sum of `sections[].estimateCents` | save | hard |
| `total` (in project currency, after FX) ≥ `project.budgetCents × 0.7` and ≤ `× 1.5` | save | soft (sanity warning) |
| If selected as analysis baseline in Step 4 but unpopulated → block analysis | analysis trigger | hard |

---

## 7. Agent extraction notes

- PTE format varies more than other docs (each QS firm has its own template).
- Look for **section-aligned totals**: a column with section labels in column A and currency amounts in column B (or further right).
- Common columns: Element / Description / Quantity / Unit / Rate / Amount / Cost.
- Watch for **separator rows** ("Sub-total", "Total", "Carry forward"). Skip these as items.
- Multi-sheet PTEs: typically one sheet per discipline or one per bill. Aggregate across sheets.
- **Contingency and escalation lines** appear at the bottom — extract their percentages.
- **Confidence threshold:** PTE structure varies enough that we accept `extracted-with-warnings` and let the QS adjust manually in the UI.

---

## 8. Sample evidence

_Sample pending._ Will be populated when a real PTE template is provided. Expected shape: a multi-sheet XLSX with sectional breakdown mirroring the BOQ structure plus contingency/escalation adjustments.
