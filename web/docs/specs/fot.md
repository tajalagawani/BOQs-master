# `fot` — Form of Tender

The bidder's binding offer to the Employer. Contains the tender sum,
time for completion, OHP markups, validity, addenda acknowledgments,
and signatures. Issued blank by the Employer; filled in and signed by
the bidder; returned via the e-Tendering portal.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `fot` |
| `label` | Form of Tender |
| `shortLabel` | FOT |
| `scope` | required |
| `category` | "Form of Tender" |
| `required` | ✓ |
| `manualFeasible` | **full** — every field can be entered manually |
| Sample | `EMR DCH PUBLIC REALM MW 0214 FOT (DEC 2025).pdf` · 3 pages · Dubai Creek Harbour |

---

## 2. Field inventory

### 2.1 Header (page 1)

| Field | Class | Notes |
| --- | --- | --- |
| `employerLegalName` | EXTRACT | "DUBAI CREEK HABOUR LLC" |
| `developmentName` | EXTRACT | "DUBAI CREEK HARBOUR DEVELOPMENT" |
| `siteName` | EXTRACT | "DUBAI CREEK HARBOUR" |
| `tenderPackageName` | EXTRACT | "TENDER DOCUMENTS FOR PUBLIC REALM – MAIN WORKS" |
| `documentTypeLabel` | VERIFY | must read "FORM OF TENDER" (mismatch detector) |
| `documentReference` | EXTRACT | "EMR DCH PUBLIC REALM MW 0214 FOT (DEC 2025)" |
| `authorityStamp` | IGNORE | RERA / Authority seal at bottom |
| `pageFooterRef` | DISPLAY | matches `documentReference` |

### 2.2 Salutation block (page 2)

| Field | Class | Notes |
| --- | --- | --- |
| `tenderDateDay` | EXTRACT | blank in template; filled at submission |
| `tenderDateMonth` | EXTRACT | composed → `tenderDate` ISO |
| `tenderDateYear` | EXTRACT | "2025" |
| `tenderDate` | EXTRACT | ISO composed |
| `addresseeLegalName` | VERIFY | must match `employerLegalName` |
| `addresseePoBox` | EXTRACT | "PO Box 9440" |
| `addresseeCity` | EXTRACT | "Dubai" |
| `addresseeCountry` | EXTRACT | "United Arab Emirates" |
| `salutationText` | IGNORE | "Dear Sirs," |
| `projectHeadingLine1` | VERIFY | matches `developmentName` |
| `projectHeadingLine2` | VERIFY | matches `tenderPackageName` |

### 2.3 Clause 1 — Acknowledgment and Tender Sum

| Field | Class | Notes |
| --- | --- | --- |
| `clause1.acknowledgedDocuments[]` | EXTRACT | ITT / Conditions of Contract / Drawings / Specification / BOQ / addenda |
| `clause1.workDescription` | DISPLAY | "Dubai Creek Harbour Public Realm Main Works …" |
| `clause1.geographicLocation` | VERIFY | "Emirate of Dubai" |
| `clause1.tenderSumFigures` | EXTRACT | bigint cents (null on blank template) |
| `clause1.tenderSumWords` | EXTRACT | string (null on blank template) |
| `currency` | EXTRACT | enum AED/USD/EUR/GBP/SAR |
| `clause1.fallbackPhrase` | IGNORE | "or such other sums as may be determined …" |

### 2.4 Clause 2 — Commencement and Time for Completion

| Field | Class | Notes |
| --- | --- | --- |
| `clause2.commencementWindowDays` | EXTRACT | 7 |
| `clause2.commencementReference` | DISPLAY | "Commencement Date" |
| `clause2.timesForCompletion[].label` | EXTRACT | "Whole of the Works" / "Stage 1" / "Stage 2" |
| `clause2.timesForCompletion[].days` | EXTRACT | integer |
| `clause2.timesForCompletion[].fromText` | EXTRACT | "from and including the Commencement Date" |
| `clause2.timesForCompletion[].parallelText` | EXTRACT | optional (Stage 2 in sample) |

### 2.5 Clause 3 — OHP Markup

| Field | Class | Notes |
| --- | --- | --- |
| `clause3.variationProvisionalPercent` | EXTRACT | 4 (Clause 3(a)) |
| `clause3.nominatedSubcontractorPercent` | EXTRACT | 4 (Clause 3(b)) |
| `clause3.buildersWorkLumpSumNote` | DISPLAY | "fixed price lump sum as set out in the Provisional Sum Bill" |

### 2.6 Clause 4 — Validity

| Field | Class | Notes |
| --- | --- | --- |
| `clause4.validityDays` | EXTRACT | 90 |
| `clause4.validityStartReference` | DISPLAY | "from the latest date fixed for receiving the same" |

### 2.7 Clauses 5-8 — Boilerplate

| Field | Class | Notes |
| --- | --- | --- |
| `clause5.bindingContractStatement` | IGNORE | standard |
| `clause6.wordsPrevailRule` | VERIFY | rule enforced on `tenderSumWords` ↔ `tenderSumFigures` |
| `clause7.notBoundToAcceptLowest` | IGNORE | standard |
| `clause8.definitionsReference` | IGNORE | refers to COC |

### 2.8 Clause 9 — Addenda Acknowledgment Table

| Field | Class | Notes |
| --- | --- | --- |
| `clause9.acknowledgedAddenda[].reference` | EXTRACT | string |
| `clause9.acknowledgedAddenda[].dateOfIssue` | EXTRACT | ISO date |
| (Cross-check) | VERIFY | every entry must match a `document.scope='ta'` row |

### 2.9 Execution block (page 3)

| Field | Class | Notes |
| --- | --- | --- |
| `executionDateDay` | EXTRACT | |
| `executionDateMonth` | EXTRACT | |
| `executionDateYear` | EXTRACT | |
| `signatures[].signature` | EXTRACT | signature image |
| `signatures[].inTheCapacityOf` | EXTRACT | role |
| `signatures[].name` | EXTRACT | full name |
| `signatures[].dulyAuthorisedFor` | EXTRACT | company name (matches Tenderer / JV member) |
| `signatures[].witnessSignature` | EXTRACT | |
| `signatures[].witnessName` | EXTRACT | |
| `signatures[].witnessAddress` | EXTRACT | |
| `signatures[].witnessOccupation` | EXTRACT | |
| (Cross-check) | VERIFY | JV → must have one block per JV member |

**Total fields:** ~45.

---

## 3. Zod schema

```ts
import { z } from "zod"

export const fotSchema = z.object({
  employerLegalName: z.string(),
  developmentName: z.string(),
  siteName: z.string(),
  tenderPackageName: z.string(),
  documentReference: z.string(),

  tenderDate: z.string().date(),

  addressee: z.object({
    legalName: z.string(),
    poBox: z.string().optional(),
    city: z.string(),
    country: z.string(),
  }),

  acknowledgedDocuments: z.array(z.string()),
  workDescription: z.string(),
  geographicLocation: z.string(),
  tenderSumFigures: z.bigint().nullable(),
  tenderSumWords: z.string().nullable(),
  currency: z.enum(["AED", "USD", "EUR", "GBP", "SAR"]),

  clause2: z.object({
    commencementWindowDays: z.number().int(),
    timesForCompletion: z.array(z.object({
      label: z.string(),
      days: z.number().int(),
      fromText: z.string().optional(),
      parallelText: z.string().optional(),
    })).min(1),
  }),

  clause3: z.object({
    variationProvisionalPercent: z.number(),
    nominatedSubcontractorPercent: z.number(),
    buildersWorkNote: z.string().optional(),
  }),

  clause4: z.object({
    validityDays: z.number().int().positive(),
  }),

  acknowledgedAddenda: z.array(z.object({
    reference: z.string(),
    dateOfIssue: z.string().date(),
  })),

  executionDate: z.string().date().nullable(),
  signatures: z.array(z.object({
    inTheCapacityOf: z.string(),
    name: z.string(),
    dulyAuthorisedFor: z.string(),
    witnessName: z.string().optional(),
    witnessAddress: z.string().optional(),
    witnessOccupation: z.string().optional(),
    signatureImageUrl: z.string().optional(),
    witnessSignatureImageUrl: z.string().optional(),
  })).min(1),
})

export type Fot = z.infer<typeof fotSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Form of Tender (FOT)]   badge: Required · Empty
└── [Tabs: Manual | Upload]
    ├── Manual tab
    │   ├── Tenderer identity
    │   │  • Tender date              (date)
    │   │  • Tenderer (legal name)   (company-picker — companies module)
    │   │  • Addressee block          (auto from project employer)
    │   ├── Tender Sum
    │   │  • Tender sum (figures)    (money input)
    │   │  • Tender sum (words)      (textarea, validated round-trip)
    │   │  • Currency                 (select)
    │   ├── Time for Completion
    │   │  • Repeating-rows: label · days · from-text · parallel-text
    │   ├── OHP Markup
    │   │  • Variation / Provisional Sums %    (percent)
    │   │  • Nominated Subcontractor %         (percent)
    │   │  • Builders work note                 (textarea, optional)
    │   ├── Validity & Acknowledgments
    │   │  • Validity (days)
    │   │  • Acknowledged addenda    (repeating-rows: reference · date)
    │   └── Signatures
    │      • Repeating signature blocks (capacity · name · for whom · witness fields)
    └── Upload tab
        Drop zone / Browse → AI extraction → [Apply to manual form]
```

---

## 5. Persistor mapping

| Form field | DB row |
| --- | --- |
| `tendererName` (via company picker) | `tenderer_submission.tenderer_id` |
| `tenderSumFigures` | `tenderer_submission.tender_sum_cents` |
| `currency` | `tenderer_submission.currency` |
| `clause2.timesForCompletion[i]` | `compliance_record` row, section_code='B', criterion=label, actual={days} |
| `clause3.variationProvisionalPercent` | `compliance_record` row, section_code='D', criterion='variation_provisional' |
| `clause3.nominatedSubcontractorPercent` | `compliance_record` row, section_code='D', criterion='nominated_subcontractor' |
| `clause4.validityDays` | `compliance_record` row, section_code='I', criterion='tender_validity' |
| `acknowledgedAddenda[i].reference` | cross-check against `document.scope='ta'` rows |
| `signatures[]` | `compliance_record` row, section_code='J', actual={count, blocks} |
| Whole record | `document.extracted_data` jsonb on the uploaded FOT |

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `tenderSumFigures` must equal `parse(tenderSumWords)` within rounding | save | hard |
| `tenderSumFigures` must equal `boq-priceset.mainSummaryTotal` for same bidder | both saved | hard |
| Each `acknowledgedAddenda[].reference` must match a `document.scope='ta'` row | save | hard |
| Sum of stage `days` must equal whole-works `days` | save | soft |
| `clause4.validityDays` ≥ `project.required_validity_days` (from ITT) | save | hard |
| `executionDate` ≥ `project.tenderIssuedAt` | save | soft |
| JV → `signatures.length` must equal number of JV members | save | hard |
| `currency` must equal `itt.currency` | save | hard |

---

## 7. Agent extraction notes

- Cover page text is highly stylised; primary signal is the bottom-right reference token (matches filename).
- Clause 1 lump sum: figures field and words field both have dotted underscores in the blank template — distinguish by the parenthetical `(…………)` wrapping the words field.
- Clause 2 table: structured 2-column. Watch for the row separator after "Section of the Works: Stage 1" / "Stage 2" — the model should treat them as table rows, not free-form lines.
- Clause 3: OHP percentages appear in both (a) and (b) — read them separately even if the percent value is the same.
- Clause 9: addenda table is rendered as 2 parallel dotted lines. If lines are blank, return `acknowledgedAddenda: []` not `null`.
- Signature blocks: detect via "Signature" / "In the capacity of" / "Name" / "duly authorised to sign tenders" pattern. JV submissions have two blocks side by side; single-bidder has one block.

---

## 8. Sample evidence

- Page 1: Cover (employer, development, document type)
- Page 2: Clauses 1-8 + Time-for-Completion table
- Page 3: Clause 9 addenda + Execution block (two signature columns)

Observed values in the Dubai Creek Harbour FOT:

- Times for Completion: Whole 480 / Stage 1 240 / Stage 2 240 days
- OHP Markup: 4% (variation), 4% (nominated subcontractor)
- Validity: 90 days
- Currency: AED
- Tender sum: blank (template)
- Acknowledged addenda: blank (template — bidder fills on return)
