# `cover-letter` — Bidder Cover Letter

The bidder's transmittal letter accompanying their FOT. Contains
qualifications, confirmations, commercial exceptions, and technical
exceptions. Feeds the `qualification` and `deviation` tables.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `cover-letter` |
| `label` | Cover Letter |
| `shortLabel` | CL |
| `scope` | bidder_submission |
| `category` | "Cover Letter" |
| `required` | per-bidder |
| `manualFeasible` | **full** |
| Sample | _pending_ |

---

## 2. Field inventory

### 2.1 Identity

| Field | Class | Notes |
| --- | --- | --- |
| `letter.tendererName` | EXTRACT | matches company picker |
| `letter.tendererAddress` | EXTRACT | full address |
| `letter.contactPerson.name` | EXTRACT | |
| `letter.contactPerson.title` | EXTRACT | |
| `letter.contactPerson.email` | EXTRACT | |
| `letter.contactPerson.phone` | EXTRACT | |
| `letter.dated` | EXTRACT | letter date |
| `letter.referenceLine` | EXTRACT | "Re: ..." line referencing the tender package |
| `letter.addresseeBlock` | EXTRACT | usually the Employer |

### 2.2 Confirmations (compliance statements)

| Field | Class | Notes |
| --- | --- | --- |
| `letter.confirmations[].label` | EXTRACT | "Validity 90 days confirmed", "Visited site", "Reviewed all documents" |
| `letter.confirmations[].confirmed` | EXTRACT | boolean |
| `letter.confirmations[].clauseRef` | EXTRACT | optional — which ITT clause this confirms |
| `letter.bondsCommitted` | EXTRACT | boolean |
| `letter.bondsBankName` | EXTRACT | which approved bank |
| `letter.alternativeTenderSubmitted` | EXTRACT | boolean |

### 2.3 Qualifications

| Field | Class | Notes |
| --- | --- | --- |
| `letter.qualifications[].label` | EXTRACT | "ISO 9001:2015 Certified", "OHSAS 18001:2007", "RERA-approved Tier 1 Contractor" |
| `letter.qualifications[].certificateNumber` | EXTRACT | optional |
| `letter.qualifications[].validUntil` | EXTRACT | optional |
| `letter.qualifications[].evidenceRef` | EXTRACT | which Schedule (A4 / A5) carries proof |
| `letter.qualifications[].evidenceDocumentId` | LINK | attached evidence doc |

### 2.4 Commercial exceptions

| Field | Class | Notes |
| --- | --- | --- |
| `letter.commercialExceptions[].summary` | EXTRACT | short |
| `letter.commercialExceptions[].detail` | EXTRACT | full paragraph |
| `letter.commercialExceptions[].clauseRef` | EXTRACT | which ITT/COC clause |
| `letter.commercialExceptions[].kind` | EXTRACT | enum `payment_terms` / `escalation` / `currency` / `taxes` / `insurance` / `bonds` / `retention` / `other` |
| `letter.commercialExceptions[].impactCents` | EXTRACT | quantified impact, if stated |
| `letter.commercialExceptions[].impactNote` | EXTRACT | rationale |

### 2.5 Technical exceptions / qualifications

| Field | Class | Notes |
| --- | --- | --- |
| `letter.technicalExceptions[].summary` | EXTRACT | |
| `letter.technicalExceptions[].detail` | EXTRACT | |
| `letter.technicalExceptions[].specSectionRef` | EXTRACT | which spec section (CSI code) |
| `letter.technicalExceptions[].kind` | EXTRACT | enum `material_substitution` / `equipment_substitution` / `method_change` / `spec_deviation` / `dimension_change` / `other` |
| `letter.technicalExceptions[].proposedAlternative` | EXTRACT | |
| `letter.technicalExceptions[].rationaleNote` | EXTRACT | |
| `letter.technicalExceptions[].approvedManufacturerListMatch` | DERIVED | true if the alternative is on Appendix A of the Specification |

### 2.6 Schedule of Alternatives (Clause 16 of ITT, optional)

| Field | Class | Notes |
| --- | --- | --- |
| `letter.alternatives[].id` | EXTRACT | "Alt-1", "Alt-2" |
| `letter.alternatives[].description` | EXTRACT | what is being offered as an alternative |
| `letter.alternatives[].tenderSumDelta` | EXTRACT | + / − cents impact on tender sum |
| `letter.alternatives[].timeDelta` | EXTRACT | + / − days impact on time |
| `letter.alternatives[].performanceImpact` | EXTRACT | text |

### 2.7 Signature

| Field | Class | Notes |
| --- | --- | --- |
| `letter.signatureBlock.name` | EXTRACT | signatory name |
| `letter.signatureBlock.title` | EXTRACT | role |
| `letter.signatureBlock.signedAt` | EXTRACT | date |
| `letter.signatureBlock.signatureImageUrl` | EXTRACT | optional |
| `letter.signatureBlock.authorisationRef` | EXTRACT | Board Resolution / Trade Licence reference |

---

## 3. Zod schema

```ts
export const coverLetterSchema = z.object({
  tendererName: z.string(),
  tendererAddress: z.string().optional(),
  contactPerson: z.object({
    name: z.string(),
    title: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  dated: z.string().date(),
  referenceLine: z.string(),

  confirmations: z.array(z.object({
    label: z.string(),
    confirmed: z.boolean(),
    clauseRef: z.string().optional(),
  })),

  qualifications: z.array(z.object({
    label: z.string(),
    certificateNumber: z.string().optional(),
    validUntil: z.string().date().optional(),
    evidenceRef: z.string().optional(),
  })),

  commercialExceptions: z.array(z.object({
    summary: z.string(),
    detail: z.string(),
    clauseRef: z.string().optional(),
    kind: z.enum(["payment_terms", "escalation", "currency", "taxes", "insurance", "bonds", "retention", "other"]),
    impactCents: z.bigint().optional(),
  })),

  technicalExceptions: z.array(z.object({
    summary: z.string(),
    detail: z.string(),
    specSectionRef: z.string().optional(),
    kind: z.enum(["material_substitution", "equipment_substitution", "method_change", "spec_deviation", "dimension_change", "other"]),
    proposedAlternative: z.string().optional(),
  })),

  alternatives: z.array(z.object({
    id: z.string(),
    description: z.string(),
    tenderSumDelta: z.bigint(),
    timeDelta: z.number().int(),
    performanceImpact: z.string().optional(),
  })).optional(),

  signatureBlock: z.object({
    name: z.string(),
    title: z.string(),
    signedAt: z.string().date(),
    authorisationRef: z.string().optional(),
  }),
})

export type CoverLetter = z.infer<typeof coverLetterSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Cover Letter]
└── [Tabs: Manual | Upload]
    └── Manual tab
        ├── Tenderer & contact
        │   • Tenderer (company picker)
        │   • Contact name / title / email / phone
        │   • Dated
        ├── Confirmations (repeating-rows)
        │   • Label | Confirmed | Clause ref
        ├── Bonds & Alternatives
        │   • Bonds committed (boolean), Bank
        │   • Alternative tender submitted (boolean)
        ├── Qualifications (repeating-rows)
        │   • Label | Certificate # | Valid until | Evidence ref
        ├── Commercial exceptions (repeating-rows)
        │   • Summary | Detail | Clause ref | Kind | Impact (currency)
        ├── Technical exceptions (repeating-rows)
        │   • Summary | Detail | Spec section ref | Kind | Proposed alternative
        ├── Schedule of Alternatives (repeating-rows, optional)
        │   • ID | Description | Sum delta | Time delta | Performance impact
        └── Signature block
            • Name | Title | Signed at | Authorisation ref
```

---

## 5. Persistor mapping

| Form field | DB row |
| --- | --- |
| `qualifications[i]` | `qualification` row (submissionId, label, evidenceDocumentId, status='claimed') |
| `commercialExceptions[i]` | `deviation` row (submissionId, kind='commercial', summary, detail, impactCents, status='open') |
| `technicalExceptions[i]` | `deviation` row (submissionId, kind='technical', specSectionRef, …) |
| `alternatives[i]` | not yet schema'd — proposal: `tender_alternative` table (deferred to v2) |
| `confirmations[]` | feeds compliance matrix: each compliance_record row sets `bidderConfirmed=true` if matching label |
| Signature block | feeds FOT cross-check (signatory consistency) |

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `tendererName` must equal `fot.tenderer` for the same submission | save | hard |
| `signatureBlock.name` should match a `fot.signatures[].name` | save | soft |
| `commercialExceptions[]` referencing payment terms / retention / advance % should be flagged against COC Particular Conditions | save | soft (highlight in side panel) |
| `technicalExceptions[].specSectionRef` must reference a real `specification_section` | save | soft |
| `technicalExceptions[].proposedAlternative` lookup against `specification_approved_manufacturer` → if match, downgrade severity | save | soft |
| If letter claims `bondsCommitted=true`, `bondsBankName` must be in `itt.bonds.approvedBanks[]` | save | hard |

---

## 7. Agent extraction notes

- Cover letters are short (2-5 pages) but variable in structure.
- **Confirmations:** look for boilerplate phrases — "We confirm that ..." / "We agree to ..." / "We have ...". Map to a checklist.
- **Exceptions:** look for "Subject to the following exceptions:", "Notwithstanding ...", "Except that ...". Anything that limits or modifies the bidder's offer is an exception.
- **Distinguishing commercial vs technical:**
  - Commercial: about payment, validity, escalation, currency, bonds, retention — anything affecting the financial terms.
  - Technical: about materials, methods, specifications, dimensions, equipment — anything affecting the deliverable.
- **Qualifications:** look for certification names (ISO XXXX, OHSAS YYYY) and accompanying numbers. Verify against Schedule A5 (QA/QC) and Schedule A4 (Relevant Experience).
- **Alternatives (Clause 16 ITT):** sometimes embedded in the cover letter, sometimes a separate "Schedule of Alternatives" attached. Both forms map to the same extraction structure.
- **Authorisation reference:** look for "Board Resolution dated ..." or "Power of Attorney dated ..." in the signature block. This satisfies ITT Clause 8.1(b).

---

## 8. Sample evidence

_Sample pending._

Typical structure of a real cover letter:

1. Header (tenderer letterhead)
2. Date + reference line
3. Addressee block
4. Salutation
5. Body — 3-7 paragraphs:
   - "We refer to your tender invitation ..."
   - "We have examined ..."
   - "We confirm our validity period of 90 days ..."
   - "We confirm our bonds will be provided by [Bank Name] ..."
   - "We submit the following qualifications: ..."
   - "Our tender is subject to the following exceptions: ..."
6. Closing
7. Signature block (signatory + title + signature image)
8. Annex / Schedule of Alternatives (optional)
