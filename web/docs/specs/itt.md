# `itt` — Instructions to Tenderer

The rules of the tender — how to bid, what to submit, in what format,
when, in what currency, with what validity period, against which bonds.
Volume 1 of the tender package.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `itt` |
| `label` | Instructions to Tenderer |
| `shortLabel` | ITT |
| `scope` | required |
| `category` | "Instructions to Tenderer" |
| `required` | ✓ |
| `manualFeasible` | **full** — every field can be entered manually |
| Sample | `EMR DCH PUBLIC REALM MW 0214 ITT (DEC 2025).pdf` · ~15 pages · May 2024 Version |

---

## 2. Field inventory

### 2.1 Header

| Field | Class | Notes |
| --- | --- | --- |
| `header.employerLegalName` | VERIFY | matches FOT |
| `header.developmentName` | VERIFY | |
| `header.siteName` | VERIFY | |
| `header.tenderPackageName` | VERIFY | |
| `header.documentTypeLabel` | VERIFY | "INSTRUCTIONS TO TENDERERS" |
| `header.version` | EXTRACT | "May 2024 Version" |
| `header.documentReference` | EXTRACT | |

### 2.2 Clause 1 — Definitions (10 entries)

| Field | Class | Notes |
| --- | --- | --- |
| `definitions[].term` | EXTRACT | Tenderer, Invitation to Tender, Tender, Tender Sum, Tender Documents, Tender Period, Headings, Dates (Gregorian), E-Tendering |
| `definitions[].meaning` | EXTRACT | per-term text |
| `definitions.usesCocMeanings` | EXTRACT | true (1.1) |

### 2.3 Clause 2 — Scope of Works

| Field | Class | Notes |
| --- | --- | --- |
| `scopeOfWorks.text` | EXTRACT | full scope statement |
| `scopeOfWorks.projectName` | VERIFY | matches `project.name` |
| `scopeOfWorks.emirate` | EXTRACT | "Dubai" |

### 2.4 Clause 3 — Tender Documents list

| Field | Class | Notes |
| --- | --- | --- |
| `tenderDocumentList[].id` | EXTRACT | a, b, c, …, g |
| `tenderDocumentList[].title` | EXTRACT | ITT / FOT / COC / SOPR / Drawings / Specification / BOQ |
| `tenderDocumentList[].formats` | EXTRACT | `["PDF"]` or `["PDF", "Excel"]` |
| `excelDrawingsBindingClause` | DISPLAY | Clause 3.4 — soft copies not part of Tender Documents |
| `keepConfidentialClause` | DISPLAY | Clause 3.2 — confidentiality obligation |

### 2.5 Clause 4 — Notification of Intent

| Field | Class | Notes |
| --- | --- | --- |
| `notificationOfIntentDays` | EXTRACT | 3 |
| `notificationChannel` | EXTRACT | "E-Tendering portal" |

### 2.6 Clause 5 — Addenda

| Field | Class | Notes |
| --- | --- | --- |
| `addendaCutoffDays` | EXTRACT | 3 (minimum days before submission) |
| `addendaIssuanceChannel` | EXTRACT | "E-Tendering portal" |
| `addendaAcknowledgmentRule` | DISPLAY | must list in FOT Clause 9 |

### 2.7 Clause 6 — Clarifications

| Field | Class | Notes |
| --- | --- | --- |
| `clarificationCutoffDays` | EXTRACT | 7 (minimum days before submission) |
| `clarificationResponseChannel` | EXTRACT | "E-Tendering portal" |
| `unrespondedClarificationsRule` | DISPLAY | no legal validity unless responded |

### 2.8 Clause 7 — Submission of Tender

| Field | Class | Notes |
| --- | --- | --- |
| `submissionMethod` | EXTRACT | "E-Tendering portal" |
| `submissionDeadlineRef` | DISPLAY | "as stated in the Invitation to Tender" |
| `lateSubmissionPolicy` | EXTRACT | "will not be considered" |

### 2.9 Clause 8 — Tender Documentation (mandatory submissions)

| Field | Class | Notes |
| --- | --- | --- |
| `submissionRequirements.stampRequired` | EXTRACT | bottom-right of each page |
| `submissionRequirements.formOfTender.signed` | EXTRACT | required |
| `submissionRequirements.formOfTender.tenderSumWordsAndFigures` | EXTRACT | required |
| `submissionRequirements.formOfTender.eachPageInitialled` | EXTRACT | required |
| `submissionRequirements.formOfTender.jvSignature` | EXTRACT | required per JV member |
| `submissionRequirements.signingAuthorisation` | EXTRACT | Board Resolution / Power of Attorney / Trade Licence |
| `submissionRequirements.boq.pricedInExcel` | EXTRACT | required |
| `submissionRequirements.boq.eachPageStamped` | EXTRACT | required |
| `submissionRequirements.boq.grandSummarySigned` | EXTRACT | required |
| `submissionRequirements.boq.tenderSumEqualsGrandTotal` | EXTRACT | required |
| `submissionRequirements.stampedDocs[]` | EXTRACT | ITT / COC / Addenda / SOPR / Drawings / Specification |
| `submissionSchedules[].id` | EXTRACT | A1, A2, …, A12, 13, 14, 15, 16, 17 |
| `submissionSchedules[].name` | EXTRACT | "Preliminary Programme", "Organisation Charts", "Key Personnel", "Relevant Experience", "QA/QC Manuals", "Insurance Company", "Method Statement", "Proposed Subcontractors", "Health and Safety", "Trade Licence", "Confirmation of Site Visit", "Joint Venture Details", "Current Commitment", "Innovative Approaches", "Sustainability Initiatives", "Value Engineering Suggestions", "Tenderers Bank Details" |
| `submissionSchedules[].format` | EXTRACT | per-schedule format requirement |
| `failureToProvidePenalty` | DISPLAY | tender may be rejected |

### 2.10 Clause 9 — No Alterations

| Field | Class | Notes |
| --- | --- | --- |
| `noAlterationsClause` | DISPLAY | rule statement |

### 2.11 Clause 10 — Fixed Rates and Prices

| Field | Class | Notes |
| --- | --- | --- |
| `pricesFixed` | EXTRACT | true |
| `tenderSumVatTreatment` | EXTRACT | "exclusive" |
| `riskAcceptanceText` | DISPLAY | boilerplate |

### 2.12 Clause 11 — Currency

| Field | Class | Notes |
| --- | --- | --- |
| `currency` | EXTRACT | "AED" |

### 2.13 Clause 12 — Validity

| Field | Class | Notes |
| --- | --- | --- |
| `requiredValidityDays` | EXTRACT | 90 |

### 2.14 Clause 13 — Language

| Field | Class | Notes |
| --- | --- | --- |
| `language` | EXTRACT | "English" |

### 2.15 Clause 14 — Visiting the Site

| Field | Class | Notes |
| --- | --- | --- |
| `siteVisitDeemed` | EXTRACT | true |
| `siteVisitNoticeDays` | EXTRACT | 2 |
| `siteVisitIndemnity` | DISPLAY | full text |

### 2.16 Clause 14A — RERA

| Field | Class | Notes |
| --- | --- | --- |
| `reraTrustAccountRequired` | EXTRACT | true/false |
| `reraNotes` | DISPLAY | "payments from Trust Account regulated by RERA" |

### 2.17 Clause 15 — Performance and Advance Payment Bonds

| Field | Class | Notes |
| --- | --- | --- |
| `bonds.performanceBondRequired` | EXTRACT | true |
| `bonds.advancePaymentBondRequired` | EXTRACT | true |
| `bonds.approvedBanks[]` | EXTRACT | 32-bank list (ADCB, ADIB, …, Al Masraf) |
| `bonds.foreignBranchesAllowed` | EXTRACT | false |
| `bonds.deviationPolicy` | DISPLAY | raise at Tender stage |
| `bonds.escrowAccountOption` | EXTRACT | optional, must use approved-bank list |

### 2.18 Clause 16 — Alternative Tender

| Field | Class | Notes |
| --- | --- | --- |
| `alternativeTenderAllowed` | EXTRACT | true |
| `alternativeTenderOptional` | EXTRACT | true |
| `scheduleOfAlternativesRequirements[]` | EXTRACT | list of conditions |

### 2.19 Clause 17 — Opening of Tenders

| Field | Class | Notes |
| --- | --- | --- |
| `openingChannel` | EXTRACT | "E-Tendering portal" |
| `noFurtherUploadsAfterOpening` | EXTRACT | true |

### 2.20 Clause 18 — Evaluation

| Field | Class | Notes |
| --- | --- | --- |
| `evaluation.mayRequireMeetings` | EXTRACT | true |
| `evaluation.arithmeticErrorPolicy.adjustToBoqTotal` | EXTRACT | true (18.2(a)) |
| `evaluation.arithmeticErrorPolicy.lockTenderSumIfBqHigher` | EXTRACT | true (18.2(b)) |
| `evaluation.arithmeticErrorPolicy.adjustTenderSumIfBqLower` | EXTRACT | true (18.2(c)) |
| `evaluation.tenderClarificationOnExcelErrors` | EXTRACT | per Clause 6 |

### 2.21 Clause 19 — Acceptance or Rejection

| Field | Class | Notes |
| --- | --- | --- |
| `acceptance.notBoundToAcceptLowest` | DISPLAY | |
| `acceptance.discretionaryRejection` | DISPLAY | |
| `acceptance.letterOfAcceptance` | EXTRACT | "issued in writing" |
| `acceptance.contractExecutionWindow` | EXTRACT | per Letter of Acceptance |

### 2.22 Clause 20 — Supersession

| Field | Class | Notes |
| --- | --- | --- |
| `supersessionClause` | DISPLAY | |

### 2.23 Appendix A — Form of Agreement

| Field | Class | Notes |
| --- | --- | --- |
| `formOfAgreement.employerLegalName` | VERIFY | |
| `formOfAgreement.engineerName` | EXTRACT | "Parsons Overseas Limited" |
| `formOfAgreement.documentPriorityOrder[]` | EXTRACT | Agreement / Letter of Acceptance / COC / Tender Addenda / Specification / Drawings / SOPR / BOQ |
| `formOfAgreement.contractorObligations` | DISPLAY | Clause 3 text |
| `formOfAgreement.employerObligations` | DISPLAY | Clause 4 text |
| `formOfAgreement.timeForCompletionRule` | DISPLAY | Clause 5 text |
| `formOfAgreement.signatureBlocks` | EXTRACT | 2 (Employer + Contractor) |

### 2.24 Appendix B — Confirmation of Site Visit

| Field | Class | Notes |
| --- | --- | --- |
| `appB.template` | DISPLAY | form template (date / name / signature) |

### 2.25 Appendix C — Tender Submission Checklist

| Field | Class | Notes |
| --- | --- | --- |
| `appC.checklist[]` | EXTRACT | mirrors `submissionSchedules` with tick boxes |

### 2.26 Appendix D — Format for Current Commitment

| Field | Class | Notes |
| --- | --- | --- |
| `appD.columns[]` | EXTRACT | Contract Value / Certified Value / Estimated Final Account Value / per row |
| `appD.template` | DISPLAY | format example |

**Total fields:** ~80.

---

## 3. Zod schema

```ts
export const ittSchema = z.object({
  version: z.string(),
  documentReference: z.string(),
  definitions: z.array(z.object({ term: z.string(), meaning: z.string() })),

  tenderDocumentList: z.array(z.object({
    id: z.string(),
    title: z.string(),
    formats: z.array(z.string()),
  })),

  notificationOfIntentDays: z.number().int(),
  addendaCutoffDays: z.number().int(),
  clarificationCutoffDays: z.number().int(),
  submissionMethod: z.string(),
  requiredValidityDays: z.number().int().positive(),
  currency: z.string(),
  language: z.string(),
  tenderSumVatTreatment: z.enum(["exclusive", "inclusive"]),
  alternativeTenderAllowed: z.boolean(),
  reraTrustAccountRequired: z.boolean(),

  bonds: z.object({
    performanceBondRequired: z.boolean(),
    advancePaymentBondRequired: z.boolean(),
    approvedBanks: z.array(z.string()),
    foreignBranchesAllowed: z.boolean(),
  }),

  submissionSchedules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    format: z.string().optional(),
  })),

  evaluation: z.object({
    arithmeticErrorPolicy: z.object({
      adjustToBoqTotal: z.boolean(),
      lockTenderSumIfBqHigher: z.boolean(),
      adjustTenderSumIfBqLower: z.boolean(),
    }),
  }),

  formOfAgreement: z.object({
    engineerName: z.string(),
    documentPriorityOrder: z.array(z.string()),
  }),
})

export type Itt = z.infer<typeof ittSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Instructions to Tenderer (ITT)]
└── [Tabs: Manual | Upload]
    └── Manual tab
        ├── Document identity (version, reference)
        ├── Submission rules
        │   • Notification of Intent (days)
        │   • Addenda cutoff (days)
        │   • Clarification cutoff (days)
        │   • Submission method
        │   • Required validity (days)
        │   • Currency · Language · VAT treatment
        ├── Bonds
        │   • Performance bond required (boolean)
        │   • Advance payment bond required (boolean)
        │   • Foreign branches allowed (boolean)
        │   • Approved banks (repeating-rows)
        ├── Submission Schedules (A1-A17 + 13-17)
        │   • Repeating rows: id · name · format
        ├── Evaluation rules
        │   • Arithmetic error policy (3 checkboxes)
        ├── Form of Agreement
        │   • Engineer name
        │   • Document priority order (drag-rank list)
        └── [Save ITT]
```

---

## 5. Persistor mapping

| Form field | DB row |
| --- | --- |
| `currency` | `project.currency` (default if Step 1 unset) |
| `requiredValidityDays` | `project.required_validity_days` |
| `addendaCutoffDays` | `project.itt_addenda_cutoff_days` |
| `clarificationCutoffDays` | `project.itt_clarification_cutoff_days` |
| `tenderSumVatTreatment` | `project.vat_treatment` |
| `submissionSchedules[]` | `compliance_record_template` rows (one per schedule) |
| `bonds.approvedBanks[]` | `project.approved_bond_banks` jsonb |
| `bonds.performanceBondRequired` | `project.performance_bond_required` |
| `alternativeTenderAllowed` | `project.alternative_tender_allowed` |
| `evaluation.arithmeticErrorPolicy.*` | `analysis_config.arithmetic_error_policy` jsonb |
| `formOfAgreement.engineerName` | `project.engineer_name` |
| `formOfAgreement.documentPriorityOrder` | `project.document_priority_order` jsonb |
| `reraTrustAccountRequired` | `project.rera_trust_account_required` |

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `currency` must equal `fot.currency` | save | hard |
| `requiredValidityDays` ≤ `fot.clause4.validityDays` (offered) | save | hard |
| `submissionSchedules[].id` must be referenced by `sopr.appM.technicalDeliverables[]` | save | soft |
| `formOfAgreement.documentPriorityOrder` must equal `coc.clause4_3.documentPriorityOrder` | save | hard |
| `bonds.performanceBondRequired` ↔ `coc.particular.performanceBondPercent` (must be set if true) | save | hard |
| `formOfAgreement.engineerName` ↔ `coc.particular.engineerName` | save | hard |

---

## 7. Agent extraction notes

- Cover page repeats employer/development/site/package header — VERIFY against FOT.
- Clause 1 definitions: alphabetic-ordered numbered list 1.1–1.10. Extract each definition as `term + meaning`.
- Clause 3 tender document list: lettered (a)–(g). Format column is implicit ("in PDF and Excel" in line text).
- Clause 8.1 schedules: the agent must parse both the (i)–(xvii) sub-list and the (A1)–(A17) schedule numbers. Some schedules are referenced by both number forms.
- Clause 15 bond bank list: 2-column table with SR + Bank Name. ~32 rows. Watch for line-wrapped bank names ("Bank of Tokyo Mitsubishi-UAE").
- Clause 18.2 arithmetic-error rules: extract sub-clauses (a)/(b)/(c) as three separate boolean flags.
- Appendix A Form of Agreement: priority order is in Clause 2 of the Appendix — a vertical bullet list. The Order must be preserved (priority rank = position).

---

## 8. Sample evidence

- Page 1: Cover
- Page 2: INDEX (20 clauses + 4 appendices)
- Pages 3-11: Clauses 1-20 body
- Pages 12-15: Appendices A–D

Observed values:

- Notification of Intent: 3 days
- Addenda cutoff: 3 days
- Clarification cutoff: 7 days
- Validity required: 90 days
- Currency: AED
- VAT: exclusive
- Bond banks: 32 listed
- Alternative tender: allowed
- Engineer: Parsons Overseas Limited
- Document priority: Agreement > LoA > COC > Tender Addenda > Specification > Drawings > SOPR > BOQ
