# Document Forms — Comprehensive Spec

The single contract that ties together, per document category:

1. **The UI accordion** (Step 2) — every field the QS sees and can fill manually.
2. **The AI agent's extraction target** — same fields, filled by upload.
3. **The DB rows** the persistor writes when either path saves.

Every field is enumerated **exhaustively** — not just the ones we extract, but
every field that appears in the doc. Each gets a usage class:

| Class | Meaning |
| --- | --- |
| **EXTRACT** | Pulled into the form / saved to DB |
| **VERIFY** | Cross-checked against another doc or DB row |
| **DISPLAY** | Shown to the user in the read-only side-panel but not saved |
| **IGNORE** | Boilerplate identical across tenders (page numbers, stamps, etc.) |

---

## 1. Design principles

### 1.1 One shape, two entry paths

```text
                     ┌─────────────────────────┐
                     │   DocCategoryAccordion  │
                     │  ───────────────────    │
                     │  Tab: Enter manually    │
                     │  Tab: Upload & extract  │
                     └─────────┬───────────────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
            (manual)                  (upload → AI)
                  │                         │
                  └────────────┬────────────┘
                               ▼
                  ┌─────────────────────────┐
                  │   Same TypeScript shape │
                  │   (zod-validated)       │
                  └─────────┬───────────────┘
                            ▼
                  ┌─────────────────────────┐
                  │   Persistor writes      │
                  │   to ProcureX tables    │
                  └─────────────────────────┘
```

### 1.2 Field key = zod path = AI extraction target

Every field has a stable key. The manual form's input binds to that key.
The agent's verdict JSON keys match exactly. The persistor reads the same
keys. One name, three consumers.

### 1.3 Accordion per category, two tabs inside

Each Required / Applicable / Addenda / PTC document category in Step 2 is
an accordion card. Header = title + required badge + status badge. Body =
two-tab switcher (`Manual` / `Upload`). The Manual tab auto-renders from
the `manualFields` config; the Upload tab is the existing drag-drop flow
with the AI agent wired behind it.

### 1.4 Manual feasibility per category

| Category | Manual feasible |
| --- | --- |
| FOT | **Full** — every field |
| ITT | **Full** — every field |
| COC | **Particular Conditions only** — full COC text is upload-only |
| BOQ template | **No** — hundreds of items, upload only |
| BOQ priced | **Headers + Main Summary total only** — rates from upload |
| PTE | **Section totals only** — itemised values from upload |
| Tender Addendum | **Full** |
| Drawings register | **Full** (table) |
| Cover Letter | **Full** |
| Specifications | **No** — too many sections, upload only |

When manual is not feasible for a sub-section, the form renders a
`readonly-note` row saying so, with the **Upload** tab as the only option.

---

## 2. Doc category catalogue

| # | id | label | shortLabel | scope | required |
| --- | --- | --- | --- | --- | --- |
| 1 | `fot` | Form of Tender | FOT | required | ✓ |
| 2 | `itt` | Instructions to Tenderer | ITT | required | ✓ |
| 3 | `coc` | Conditions of Contract | COC | required | ✓ |
| 4 | `boq-template` | Blank BOQ / Pricing Schedule | BOQ-T | required | ✓ |
| 5 | `boq-priceset` | Priced BOQ (bidder) | BOQ-P | bidder_submission | per-bidder |
| 6 | `pte` | Pre-Tender Estimate | PTE | pte | – |
| 7 | `addenda` | Tender Addendum | TA | ta | – |
| 8 | `drawings-register` | Drawings register | DR | required | ✓ |
| 9 | `cover-letter` | Cover Letter (bidder) | CL | bidder_submission | per-bidder |
| 10 | `specification` | Technical Specification | SPEC | required | ✓ |
| 11 | `sopr` | Schedule of Project Requirements | SOPR | required | ✓ |
| 12 | `ptc-pack` | PTC Pack (generated) | PTC | ptc | generated |
| 13 | `ptc-response` | PTC Response (bidder) | PTCR | ptc_response | per-bidder |

---

## 3. `fot` — Form of Tender

**Sample:** EMR DCH Public Realm MW 0214 FOT (DEC 2025).pdf.

### 3.1 Every field present

**Header block (page 1):**

| Field | Class | Notes |
| --- | --- | --- |
| `employerLegalName` | EXTRACT | "DUBAI CREEK HABOUR LLC" |
| `developmentName` | EXTRACT | "DUBAI CREEK HARBOUR DEVELOPMENT" |
| `siteName` | EXTRACT | "DUBAI CREEK HARBOUR" |
| `tenderPackageName` | EXTRACT | "TENDER DOCUMENTS FOR PUBLIC REALM – MAIN WORKS" |
| `documentTypeLabel` | VERIFY | "FORM OF TENDER" (mismatch detector) |
| `documentReference` | EXTRACT | "EMR DCH PUBLIC REALM MW 0214 FOT (DEC 2025)" |
| `pageStamp` | IGNORE | Authority seal at bottom |
| `pageFooterRef` | DISPLAY | Footer reference (matches `documentReference`) |

**Salutation block (page 2):**

| Field | Class | Notes |
| --- | --- | --- |
| `tenderDateDay` | EXTRACT | Blank in template → fill on submission |
| `tenderDateMonth` | EXTRACT | (composed → `tenderDate` ISO) |
| `tenderDateYear` | EXTRACT | "2025" |
| `tenderDate` | EXTRACT | Composed ISO date |
| `addresseeLegalName` | VERIFY | matches `employerLegalName` |
| `addresseePoBox` | EXTRACT | "PO Box 9440" |
| `addresseeCity` | EXTRACT | "Dubai" |
| `addresseeCountry` | EXTRACT | "United Arab Emirates" |
| `salutationText` | IGNORE | "Dear Sirs," |
| `projectHeadingLine1` | VERIFY | matches `developmentName` |
| `projectHeadingLine2` | VERIFY | matches `tenderPackageName` |

**Clause 1 — Acknowledgment and Tender Sum:**

| Field | Class | Notes |
| --- | --- | --- |
| `clause1.acknowledgedDocuments` | EXTRACT | ITT / Conditions of Contract / Drawings / Specification / BOQ / addenda |
| `clause1.workDescription` | DISPLAY | "Dubai Creek Harbour Public Realm Main Works …" |
| `clause1.geographicLocation` | VERIFY | "Emirate of Dubai" |
| `clause1.tenderSumFigures` | EXTRACT | bigint cents (blank in template) |
| `clause1.tenderSumWords` | EXTRACT | string (blank in template) |
| `clause1.fallbackPhrase` | IGNORE | "or such other sums as may be determined …" |

**Clause 2 — Commencement & Time for Completion:**

| Field | Class | Notes |
| --- | --- | --- |
| `clause2.commencementWindowDays` | EXTRACT | 7 |
| `clause2.commencementReference` | DISPLAY | "Commencement Date" |
| `clause2.timesForCompletion[].label` | EXTRACT | e.g. "Whole of the Works" / "Stage 1" / "Stage 2" |
| `clause2.timesForCompletion[].days` | EXTRACT | integer |
| `clause2.timesForCompletion[].fromText` | EXTRACT | "from and including the Commencement Date" |
| `clause2.timesForCompletion[].parallelText` | EXTRACT | "Only Engineering and Authority Approvals can be carried out in parallel with Stage 1." |

**Clause 3 — OHP Markup:**

| Field | Class | Notes |
| --- | --- | --- |
| `clause3.variationProvisionalPercent` | EXTRACT | 4 (Clause 3(a)) |
| `clause3.nominatedSubcontractorPercent` | EXTRACT | 4 (Clause 3(b)) |
| `clause3.buildersWorkLumpSumNote` | DISPLAY | "fixed price lump sum as set out in the Provisional Sum Bill" |

**Clause 4 — Validity:**

| Field | Class | Notes |
| --- | --- | --- |
| `clause4.validityDays` | EXTRACT | 90 |
| `clause4.validityStartReference` | DISPLAY | "from the latest date fixed for receiving the same" |

**Clause 5–8 — Boilerplate:**

| Field | Class | Notes |
| --- | --- | --- |
| `clause5.bindingContractStatement` | IGNORE | Standard FOT clause |
| `clause6.wordsPrevailRule` | VERIFY | We enforce this rule on tenderSumWords ↔ tenderSumFigures cross-check |
| `clause7.notBoundToAcceptLowest` | IGNORE | Standard |
| `clause8.definitionsReference` | IGNORE | Refers to COC definitions |

**Clause 9 — Addenda Acknowledgment Table:**

| Field | Class | Notes |
| --- | --- | --- |
| `clause9.acknowledgedAddenda[].reference` | EXTRACT | string |
| `clause9.acknowledgedAddenda[].dateOfIssue` | EXTRACT | ISO date |
| (Cross-check) | VERIFY | every entry must match a `document` row with `scope='ta'` |

**Execution block (page 3):**

| Field | Class | Notes |
| --- | --- | --- |
| `executionDateDay` | EXTRACT | |
| `executionDateMonth` | EXTRACT | |
| `executionDateYear` | EXTRACT | |
| `signatures[].signature` | EXTRACT | image / signature mark |
| `signatures[].inTheCapacityOf` | EXTRACT | role (e.g. "General Manager") |
| `signatures[].name` | EXTRACT | full name |
| `signatures[].dulyAuthorisedFor` | EXTRACT | company name |
| `signatures[].witnessSignature` | EXTRACT | |
| `signatures[].witnessName` | EXTRACT | |
| `signatures[].witnessAddress` | EXTRACT | |
| `signatures[].witnessOccupation` | EXTRACT | |
| (Cross-check) | VERIFY | when bidder is a JV, must have one block per JV member |

**Total fields: ~45.**

### 3.2 Zod schema

```ts
export const fotSchema = z.object({
  // Header
  employerLegalName: z.string(),
  developmentName: z.string(),
  siteName: z.string(),
  tenderPackageName: z.string(),
  documentReference: z.string(),

  // Salutation
  tenderDate: z.string().date(),
  addressee: z.object({
    legalName: z.string(),
    poBox: z.string().optional(),
    city: z.string(),
    country: z.string(),
  }),

  // Clause 1
  acknowledgedDocuments: z.array(z.string()),
  workDescription: z.string(),
  geographicLocation: z.string(),
  tenderSumFigures: z.bigint().nullable(),     // null on blank template
  tenderSumWords: z.string().nullable(),
  currency: z.enum(["AED", "USD", "EUR", "GBP", "SAR"]),

  // Clause 2
  commencementWindowDays: z.number().int(),
  timesForCompletion: z.array(z.object({
    label: z.string(),                          // "Whole of the Works" | "Stage 1" | ...
    days: z.number().int(),
    fromText: z.string().optional(),
    parallelText: z.string().optional(),
  })).min(1),

  // Clause 3
  ohpMarkups: z.object({
    variationProvisionalPercent: z.number(),
    nominatedSubcontractorPercent: z.number(),
    buildersWorkNote: z.string().optional(),
  }),

  // Clause 4
  validityDays: z.number().int().positive(),

  // Clause 9
  acknowledgedAddenda: z.array(z.object({
    reference: z.string(),
    dateOfIssue: z.string().date(),
  })),

  // Execution
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

### 3.3 Manual UI

Five sections in the accordion body. Layout:

```text
[Accordion: Form of Tender (FOT)]   badge: Required · Empty
└── [Tabs: Manual | Upload]
    ├── Manual tab
    │   ┌── Section: Tenderer identity ─────────────────────
    │   │  Tender date                  (date picker)
    │   │  Tenderer (legal name)        (text — pulled from companies)
    │   │  Tenderer address              (auto from company)
    │   ├── Section: Tender Sum ─────────────────────────────
    │   │  Tender sum (figures)          (currency input)
    │   │  Tender sum (words)            (textarea, must round-trip)
    │   │  Currency                      (dropdown)
    │   ├── Section: Time for Completion ───────────────────
    │   │  [+ Add row]
    │   │  Label                Days     From text
    │   │  Whole of the Works · 480 · Commencement Date
    │   │  Stage 1            · 240 · Commencement Date
    │   │  Stage 2            · 240 · After Stage 1
    │   ├── Section: OHP Markup ─────────────────────────────
    │   │  Variation / Provisional Sums (%)        4
    │   │  Nominated Subcontractor (%)             4
    │   │  Builders work note                     (textarea, optional)
    │   ├── Section: Validity & Acknowledgments ─────────────
    │   │  Validity (days)               90
    │   │  Acknowledged addenda
    │   │  [+ Add row]   Reference | Date of issue
    │   ├── Section: Signatures ─────────────────────────────
    │   │  [+ Add signature block]
    │   │  Capacity | Name | Duly authorised for | Witness name | Witness address | Witness occupation
    │   └── [Save FOT]   (disabled until required fields filled)
    └── Upload tab
        Drop zone / Browse → AI extraction → "Apply to manual form"
```

### 3.4 Persistor

```ts
async function persistFot(data: Fot, ctx: {
  workspaceId: string
  projectId: string
  roundId: string
  tendererId?: string         // null on blank template upload by QS
  uploadedDocumentId: string
}): Promise<void> {

  // 1. If this is a bidder's submitted FOT, create/update tenderer_submission
  let submissionId: string | null = null
  if (ctx.tendererId) {
    submissionId = await upsertSubmission({
      roundId: ctx.roundId,
      tendererId: ctx.tendererId,
      tenderSumCents: data.tenderSumFigures,
      sourceDocumentId: ctx.uploadedDocumentId,
    })
  }

  // 2. Time for Completion → compliance_record rows
  if (submissionId) {
    for (const tfc of data.timesForCompletion) {
      await upsertCompliance(submissionId, {
        sectionCode: "B",                       // "Time for Completion"
        criterionCode: slug(tfc.label),
        criterionLabel: tfc.label,
        actualValue: { days: tfc.days },
        expectedValue: getProjectExpected("timeForCompletion", tfc.label),
        status: tfc.days <= expected ? "compliant" : "non_compliant",
      })
    }

    // 3. OHP Markups → 2 compliance_record rows
    await upsertCompliance(submissionId, {
      sectionCode: "D",
      criterionCode: "variation_provisional",
      actualValue: { percent: data.ohpMarkups.variationProvisionalPercent },
    })
    await upsertCompliance(submissionId, {
      sectionCode: "D",
      criterionCode: "nominated_subcontractor",
      actualValue: { percent: data.ohpMarkups.nominatedSubcontractorPercent },
    })

    // 4. Validity → compliance_record row
    await upsertCompliance(submissionId, {
      sectionCode: "I",
      criterionCode: "tender_validity",
      actualValue: { days: data.validityDays },
      status: data.validityDays >= project.requiredValidityDays
        ? "compliant" : "non_compliant",
    })

    // 5. Signatures → compliance_record
    await upsertCompliance(submissionId, {
      sectionCode: "J",
      criterionCode: "signatures",
      actualValue: { count: data.signatures.length, blocks: data.signatures },
    })
  }

  // 6. Acknowledged addenda → cross-check against `document` rows with scope='ta'
  await crossCheckAddenda(ctx.projectId, data.acknowledgedAddenda)

  // 7. Save the full extracted JSON onto document.extracted_data
  await updateDocument(ctx.uploadedDocumentId, {
    extracted_data: data,
    extraction_status: "extracted",
  })
}
```

### 3.5 Cross-doc validation

| Rule | Trigger |
| --- | --- |
| `tenderSumFigures` must equal `tenderSumWords.parsed()` (within rounding) | save |
| `tenderSumFigures` must equal `boq-priceset.mainSummaryTotal` for same bidder | both docs saved |
| Each `acknowledgedAddenda[].reference` must match a `document.scope='ta'` row | save |
| Sum of stage `days` must equal whole-works `days` (within tolerance) | save |
| `validityDays` ≥ `project.requiredValidityDays` (from ITT) | save |
| `executionDate` cannot be before `project.tenderIssuedAt` | save |

---

## 4. `itt` — Instructions to Tenderer

**Sample:** EMR DCH ITT (DEC 2025).pdf — 20 clauses + 4 appendices.

### 4.1 Every field present

**Header / Cover (page 1):**

| Field | Class | Notes |
| --- | --- | --- |
| `header.employerLegalName` | VERIFY | matches FOT |
| `header.developmentName` | VERIFY | |
| `header.siteName` | VERIFY | |
| `header.tenderPackageName` | VERIFY | |
| `header.documentTypeLabel` | VERIFY | "INSTRUCTIONS TO TENDERERS" |
| `header.version` | EXTRACT | "May 2024 Version" |
| `header.documentReference` | EXTRACT | |

**Clause 1 — Definitions (10 defs):**

| Field | Class |
| --- | --- |
| `definitions[].term` + `.meaning` | EXTRACT (jsonb) |
| Includes: Tenderer, Invitation to Tender, Tender, Tender Sum, Tender Documents, Tender Period, Headings, Dates (Gregorian), E-Tendering | EXTRACT |

**Clause 2 — Scope of Works:**

| Field | Class |
| --- | --- |
| `scopeOfWorks` | EXTRACT (text) |
| `scopeProject` | VERIFY (matches `project.name`) |
| `scopeEmirate` | EXTRACT |

**Clause 3 — Tender Documents list:**

| Field | Class |
| --- | --- |
| `tenderDocumentList[]` | EXTRACT (ordered list with format flag) |
| `tenderDocumentList[i].id` | EXTRACT (a, b, c, …) |
| `tenderDocumentList[i].title` | EXTRACT |
| `tenderDocumentList[i].formats` | EXTRACT (`["PDF"]` or `["PDF", "Excel"]`) |
| `excelDrawingsBindingClause` | DISPLAY (Clause 3.4 — soft copies "shall not form part of the Tender Documents") |

**Clause 4 — Notification of Intent:**

| Field | Class |
| --- | --- |
| `notificationOfIntentDays` | EXTRACT (3) |

**Clause 5 — Addenda:**

| Field | Class |
| --- | --- |
| `addendaCutoffDays` | EXTRACT (≥ 3) |
| `addendaIssuanceChannel` | EXTRACT ("E-Tendering portal") |
| `addendaAcknowledgmentRule` | DISPLAY ("must list in FOT") |

**Clause 6 — Clarifications:**

| Field | Class |
| --- | --- |
| `clarificationCutoffDays` | EXTRACT (≥ 7) |
| `clarificationResponseChannel` | EXTRACT |
| `unrespondedClarificationsRule` | DISPLAY ("no legal validity unless responded") |

**Clause 7 — Submission of Tender:**

| Field | Class |
| --- | --- |
| `submissionMethod` | EXTRACT ("E-Tendering portal") |
| `submissionDeadlineRef` | DISPLAY ("as stated in the Invitation to Tender") |

**Clause 8 — Tender Documentation (the big checklist):**

| Field | Class | Notes |
| --- | --- | --- |
| `submissionItems.formOfTender.stampRequired` | EXTRACT (bottom-right of each page) |
| `submissionItems.boq.priced` | EXTRACT |
| `submissionItems.boq.grandSummarySignatureRequired` | EXTRACT |
| `submissionItems.boq.tenderSumEqualsGrandTotal` | EXTRACT |
| `submissionItems.stampedDocs[]` | EXTRACT (ITT / COC / TA / SOPR / Drawings / Specification) |
| `submissionSchedules[]` | EXTRACT (full A1-A17 + 13-17 list) |
| `submissionSchedules[i].id` | EXTRACT (e.g. "A1") |
| `submissionSchedules[i].name` | EXTRACT ("Preliminary Programme") |
| `submissionSchedules[i].format` | EXTRACT ("Primavera / MS Project" etc.) |
| `failureToProvidePenalty` | DISPLAY ("rejection") |

**Clause 9 — No Alterations:**

| Field | Class |
| --- | --- |
| `noAlterationsClause` | DISPLAY (rule statement) |

**Clause 10 — Fixed Rates and Prices:**

| Field | Class |
| --- | --- |
| `pricesFixed` | EXTRACT (true) |
| `tenderSumVatTreatment` | EXTRACT (`exclusive`) |
| `riskAcceptanceText` | DISPLAY (boilerplate) |

**Clause 11 — Currency:**

| Field | Class |
| --- | --- |
| `currency` | EXTRACT ("AED") |
| (Cross-check) | VERIFY against FOT.currency |

**Clause 12 — Validity:**

| Field | Class |
| --- | --- |
| `requiredValidityDays` | EXTRACT (90) |

**Clause 13 — Language:**

| Field | Class |
| --- | --- |
| `language` | EXTRACT ("English") |

**Clause 14 — Visiting the Site:**

| Field | Class |
| --- | --- |
| `siteVisitDeemed` | EXTRACT (true) |
| `siteVisitNoticeDays` | EXTRACT (2) |

**Clause 14A — RERA:**

| Field | Class |
| --- | --- |
| `reraTrustAccountRequired` | EXTRACT (true / false) |

**Clause 15 — Bonds:**

| Field | Class |
| --- | --- |
| `bonds.performanceBondRequired` | EXTRACT |
| `bonds.advancePaymentBondRequired` | EXTRACT |
| `bonds.approvedBanks[]` | EXTRACT (the 32-bank list) |
| `bonds.foreignBranchesAllowed` | EXTRACT (false) |
| `bonds.deviationPolicy` | DISPLAY ("raise at Tender stage; not at Contract stage") |

**Clause 16 — Alternative Tender:**

| Field | Class |
| --- | --- |
| `alternativeTenderAllowed` | EXTRACT (true) |
| `scheduleOfAlternativesRequirements` | EXTRACT (list of conditions) |
| `alternativeTenderOptional` | EXTRACT (true) |

**Clause 17 — Opening of Tenders:**

| Field | Class |
| --- | --- |
| `openingChannel` | EXTRACT ("E-Tendering portal") |
| `noFurtherUploadsAfterOpening` | EXTRACT (true) |

**Clause 18 — Evaluation:**

| Field | Class |
| --- | --- |
| `evaluationMayRequireMeetings` | EXTRACT (true) |
| `arithmeticErrorRules` | EXTRACT (full text — used by analysis engine) |
| `arithmeticErrorRule.tenderSumLockedDownward` | EXTRACT (Clause 18.2(b)) |
| `arithmeticErrorRule.tenderSumLockedUpward` | EXTRACT (Clause 18.2(c)) |

**Clause 19 — Acceptance:**

| Field | Class |
| --- | --- |
| `acceptance.notBoundToAcceptLowest` | DISPLAY |
| `acceptance.discretionaryRejection` | DISPLAY |
| `acceptance.contractDocumentExecutionWindow` | EXTRACT |

**Clause 20 — Supersession:**

| Field | Class |
| --- | --- |
| `supersessionClause` | DISPLAY |

**Appendix A — Form of Agreement (post-acceptance):**

| Field | Class |
| --- | --- |
| `formOfAgreement.employerLegalName` | VERIFY |
| `formOfAgreement.engineerName` | EXTRACT ("Parsons Overseas Limited") |
| `formOfAgreement.documentPriorityOrder` | EXTRACT (ordered list) |
| `formOfAgreement.contractorsPrincipalObligations` | DISPLAY |
| `formOfAgreement.employersPrincipalObligations` | DISPLAY |
| `formOfAgreement.timeForCompletionRule` | DISPLAY |

**Appendix B — Confirmation of Site Visit:** (template form, mostly IGNORE)

**Appendix C — Tender Submission Checklist:**

| Field | Class |
| --- | --- |
| `submissionChecklist[]` | EXTRACT (mirrors submissionSchedules but with check states) |

**Appendix D — Format for Current Commitment:** (template schema, EXTRACT as column list)

**Total fields: ~80.**

### 4.2 Persistor

| Form field | DB row |
| --- | --- |
| `currency` | `project.currency` (set as default if Step 1 not yet filled) |
| `requiredValidityDays` | `project.required_validity_days` |
| `addendaCutoffDays`, `clarificationCutoffDays` | `project.itt_addenda_cutoff_days`, `project.itt_clarification_cutoff_days` |
| `tenderSumVatTreatment` | `project.vat_treatment` |
| `submissionSchedules[]` | seeds the compliance matrix criteria — one `compliance_record_template` per schedule per project |
| `bonds.approvedBanks[]` | `project.approved_bond_banks` jsonb |
| `bonds.performanceBondRequired` | `project.performance_bond_required` |
| `alternativeTenderAllowed` | `project.alternative_tender_allowed` |
| `arithmeticErrorRules.*` | `analysis_config.arithmetic_error_lock_direction` |
| `formOfAgreement.engineerName` | `project.engineer_name` |
| `formOfAgreement.documentPriorityOrder` | `project.document_priority_order` |

---

## 5. `coc` — Conditions of Contract

**Sample:** EMR DCH COC (DEC 2025).pdf — bespoke `BO-LF-NONRERA-DC`, 37 clauses + 7 appendices.

### 5.1 Every field present

**Header:**

| Field | Class |
| --- | --- |
| `header.contractFormCode` | EXTRACT ("BO-LF-NONRERA-DC") |
| `header.version` | EXTRACT ("February 2025 Version Rev-Sep25") |
| `header.tenderPackageName` | VERIFY |

**Clause 1 — Definitions (60+ defs from sample TOC):** all EXTRACT as `definitions[].{term, meaning}` jsonb.

Notable definitions (each is its own EXTRACT key if it carries a value):

- `Contract Sum`, `Time for Completion`, `Defects Liability Period`, `Liquidated Damages`, `Performance Bond`, `Advance Payment`, `Retention`, `Provisional Sum`, `Nominated Subcontractor`, `Substantial Completion` (8 sub-conditions).

**Clauses 2-37 — every clause is a row in `cocClauses[]`:**

```ts
cocClauses[].{
  ref: string,                  // "8.1"
  title: string,                // "Provision of Bonds"
  page: number,
  bodyText: string,
  hasParticularConditionsValue: boolean,
}
```

The body of each clause is EXTRACT'd. Most clauses are DISPLAY only (text we
show in a side panel). Particular Conditions values (Appendix A) get
elevated to project-level fields.

**Appendix A — Particular Conditions (THE critical block):**

| Field | Class | Source clause |
| --- | --- | --- |
| `particular.contractSumCents` | EXTRACT | 1.1(j) |
| `particular.timesForCompletionDays[]` | VERIFY (against FOT clause 2) | 19.1 |
| `particular.advancePaymentPercent` | EXTRACT | 9.1 |
| `particular.advancePaymentRepaymentPlan` | EXTRACT | 9.3 |
| `particular.performanceBondPercent` | EXTRACT | 8.1(a) |
| `particular.advancePaymentBondPercent` | EXTRACT | 8.1(b) |
| `particular.retentionPercent` | EXTRACT | 29.1 |
| `particular.retentionCapCents` or `retentionCapPercent` | EXTRACT | 29.x |
| `particular.liquidatedDamagesPerDayCents` | EXTRACT | 19.3 |
| `particular.liquidatedDamagesCapCents` or `Percent` | EXTRACT | 19.3 |
| `particular.dlpMonths` | EXTRACT | 22.2 |
| `particular.decennialLiabilityYears` | EXTRACT | 22.11 (10 typical) |
| `particular.standardConditionsOfSubcontract` | EXTRACT | 1.1(yy) |
| `particular.engineerName` | VERIFY | matches ITT |
| `particular.employerName` | VERIFY | |
| `particular.contractorName` | EXTRACT | filled on award |
| `particular.commencementDate` | EXTRACT | filled on award |
| `particular.governingLaw` | EXTRACT | 4.2 |
| `particular.disputeForum` | EXTRACT | 36.1 |
| `particular.languageOfCommunication` | EXTRACT | 4.1 |

**Appendix B — Performance Bond Form:**

| Field | Class |
| --- | --- |
| `bondForms.performanceBondTemplate` | EXTRACT (template text — used to validate bidder-submitted bonds) |
| `bondForms.performanceBondAmount` | EXTRACT (link to `performanceBondPercent`) |

**Appendix C — Advance Payment Bond Form:** same shape as B.

**Appendix D — Competitive Tendering:** EXTRACT as `competitiveTendering.{rules}`.

**Appendix E — Machinery All Risks Insurance Policy:** EXTRACT minimum coverage / deductibles.

**Appendix F — Workmen's Comp & Employer's Liability Insurance:** same.

**Appendix G — Contractor's All Risk Insurance:** same.

**Total fields: ~150 (most clauses contribute one DISPLAY row, ~25 EXTRACT-able values in Particular Conditions and Appendices).**

### 5.2 Manual UI

The Manual tab focuses on the **Particular Conditions** block — that's the
only part with project-specific numeric values. Everything else is upload-only.

```text
Manual tab (COC)
├── Section: Contract Identity
│   • Contract form code    (read-only, from upload if any)
│   • Version
├── Section: Particular Conditions ── the actual form
│   • Contract Sum (cents)             (currency)
│   • Times for Completion              (table — cross-checked vs FOT)
│   • Advance Payment %                 (percent)
│   • Performance Bond %                (percent)
│   • Advance Payment Bond %            (percent)
│   • Retention %                       (percent)
│   • Retention cap                     (currency or percent of contract sum)
│   • LDs per day                       (currency)
│   • LDs cap                           (currency or % of contract sum)
│   • DLP                               (months)
│   • Decennial liability                (years, usually 10)
│   • Governing law                     (text — usually UAE)
│   • Dispute forum                     (text — Dubai Courts)
│   • Language                          (text — English)
│   • Engineer name                     (text — auto from ITT)
├── Section: Insurance Minimums (from Appendices E/F/G)
│   • Machinery All Risks minimum      (currency)
│   • Workmen's Comp minimum            (currency)
│   • Contractor's All Risks minimum   (currency)
└── [Save COC]
```

### 5.3 Persistor

All Particular Conditions values land on the `project` row (new columns —
see §16). Insurance minimums go into `project.insurance_minimums` jsonb.
The full clause list goes into `document.extracted_data.cocClauses[]` for
display in the side panel.

---

## 6. `boq-template` — Blank BOQ

**Sample:** EMR DCH BQ (DEC 2025).xlsx — 37 sheets.

Manual entry **not supported**.

### 6.1 Every field present (AI target only)

**Workbook level:**

| Field | Class |
| --- | --- |
| `workbookCurrency` | EXTRACT |
| `workbookProjectName` | VERIFY |
| `sheetsTotal` | EXTRACT |
| `coverSheet.text` | EXTRACT |
| `contentsSheet.bills[]` | EXTRACT (Bill no, title, page range) |

**Per measured-work sheet (`2B`, `2C`, … `3R`):**

| Field | Class | Source |
| --- | --- | --- |
| `bills[i].billNo` | EXTRACT | sheet name pattern |
| `bills[i].element` | EXTRACT | sheet name letter |
| `bills[i].sectionHeaderText` | EXTRACT | row 1-3 |
| `bills[i].columnHeaders[]` | EXTRACT | "Item / Description / Quantity / Unit / Rate AED / Amount AED" |
| `bills[i].items[].itemLetter` | EXTRACT | "A", "B", "C" (or blank for note rows) |
| `bills[i].items[].description` | EXTRACT | may span multiple rows |
| `bills[i].items[].quantity` | EXTRACT | number |
| `bills[i].items[].unit` | EXTRACT | "m²", "m³", "nr", "item", "kg", "to" |
| `bills[i].items[].rateAED` | DISPLAY | blank on template |
| `bills[i].items[].amountAED` | DISPLAY | blank on template |
| `bills[i].subTotalMarkers[]` | EXTRACT | "To Collection" rows |
| `bills[i].pageCount` | DISPLAY | sheet row count |

**Per general-requirements sheet (Bill 1):**

| Field | Class | Source |
| --- | --- | --- |
| `bill1.columnHeaders` | EXTRACT | "Item / Description / Unit / Fixed Cost / Time Related Cost / Amount" |
| `bill1.items[].fixedCost` | DISPLAY | blank |
| `bill1.items[].timeRelatedCost` | DISPLAY | blank |
| `bill1.items[].totalAmount` | DISPLAY | blank |
| `bill1.subSection` | EXTRACT | "A1 – Conditions of Contract" etc. |

**Per summary sheet (`2 SUM`, `3 SUM`, `MS`):**

| Field | Class | Source |
| --- | --- | --- |
| `summary.entries[].label` | EXTRACT | section names |
| `summary.entries[].billRef` | EXTRACT | |
| `summary.grandTotal` | EXTRACT | bottom |

### 6.2 Persistor

```ts
// Creates one boq_template + many boq_section + many boq_item rows
boq_template (
  project_id = ctx.projectId,
  name = "Main BOQ Template",
  owner_kind = 'project',
  owner_id = projectId,
  currency = data.workbookCurrency,
  source_document_id = uploadedDoc.id
)

for each bill, element in data.bills[]:
  boq_section (
    template_id, code = `${billNo}-${element}`,
    label = sheet.title,
    position = i,
    pricing_mode = "measured" | "general_req"
  )

  for each item with itemLetter:
    boq_item (
      section_id, no = letter, label, unit, quantity_planned
    )
```

### 6.3 Cross-doc checks

| Rule | Trigger |
| --- | --- |
| Sum of section subtotals ≈ MS grand total (tolerance 0.01%) | on save |
| Item codes match across priced BOQs (template hash) | on priced BOQ upload |

---

## 7. `boq-priceset` — Priced BOQ (bidder)

**Sample pending.** Same workbook as `boq-template` with rates and amounts filled.

### 7.1 Every field present (AI target)

| Field | Class |
| --- | --- |
| `tendererStamp.companyName` | EXTRACT (from cover/footer) |
| `tendererStamp.tradeLicense` | EXTRACT (if present) |
| `priceset.items[].itemKey` | VERIFY (template match) |
| `priceset.items[].unitRateCents` | EXTRACT |
| `priceset.items[].amountCents` | EXTRACT (or computed) |
| `priceset.items[].isUnpriced` | EXTRACT (true if blank or zero) |
| `priceset.items[].arithmeticalError` | VERIFY (rate × qty ≠ amount within tolerance) |
| `priceset.subtotals[]` | EXTRACT (per section) |
| `priceset.bill1FixedCosts[]` | EXTRACT |
| `priceset.bill1TimeRelatedCosts[]` | EXTRACT |
| `mainSummary.entries[]` | EXTRACT |
| `mainSummary.grandTotal` | EXTRACT |
| `grandSummarySigned` | EXTRACT (stamp/signature detected) |
| `eachPageStamped` | VERIFY (per ITT Clause 8.1(c)(ii)) |

### 7.2 Manual UI (headers only)

```text
Manual tab (Priced BOQ)
├── Section: Tenderer
│   • Tenderer (auto from companies)
│   • Stamp confirmed                   (checkbox per ITT)
├── Section: Headline figures (read-only from upload OR manual)
│   • Grand summary total               (currency)
│   • Each page stamped                  (checkbox)
│   • Grand summary signed              (checkbox)
└── [Section: Item rates — upload required]
    Note: Line-item rates must come from the uploaded Excel.
    Manual line-by-line entry is not supported.
```

### 7.3 Persistor

| Field | DB row |
| --- | --- |
| Whole record | `boq_priceset` with `owner_kind='submission'`, `owner_id=tenderer_submission.id` |
| Per item | `boq_item_rate` row, keyed by template match |
| Arithmetical errors | `flag` rows, `kind='arithmetical_error'` |
| `mainSummary.grandTotal` | `tenderer_submission.tender_sum_cents` |

---

## 8. `pte` — Pre-Tender Estimate (internal)

**Sample pending.**

### 8.1 Every field present

| Field | Class |
| --- | --- |
| `pte.currency` | EXTRACT |
| `pte.version` | EXTRACT |
| `pte.preparedBy` | EXTRACT |
| `pte.preparedAt` | EXTRACT |
| `pte.assumptions[]` | EXTRACT |
| `pte.sections[].billRef` | EXTRACT |
| `pte.sections[].label` | EXTRACT |
| `pte.sections[].estimateCents` | EXTRACT |
| `pte.sections[].breakdown[].label` | EXTRACT (optional) |
| `pte.sections[].breakdown[].amountCents` | EXTRACT (optional) |
| `pte.total` | EXTRACT (must = sum of sections) |
| `pte.contingencyPercent` | EXTRACT |
| `pte.escalationPercent` | EXTRACT |
| `pte.fxAssumptions[]` | EXTRACT (if currency ≠ project currency) |

### 8.2 Persistor

Creates a `boq_priceset` with `owner_kind='estimate'`, `owner_id=project.id`, and one `boq_item_rate` per section subtotal. Linked to `analysis_config.reference_priceset_id` when the QS chooses "PTE" as the baseline in Step 4.

---

## 9. `addenda` — Tender Addendum

**Sample pending.**

### 9.1 Every field present

| Field | Class |
| --- | --- |
| `addendum.reference` | EXTRACT (e.g. "ADD-01") |
| `addendum.number` | EXTRACT |
| `addendum.dateOfIssue` | EXTRACT |
| `addendum.subject` | EXTRACT |
| `addendum.issuedBy` | EXTRACT (Employer / Engineer) |
| `addendum.referencedDocuments[]` | EXTRACT (which Tender Documents are affected) |
| `addendum.changes[].clauseRef` | EXTRACT |
| `addendum.changes[].kind` | EXTRACT (variation / addition / deletion / clarification / rectification) |
| `addendum.changes[].beforeText` | EXTRACT |
| `addendum.changes[].afterText` | EXTRACT |
| `addendum.changes[].affectsTenderSum` | EXTRACT (boolean inferred) |
| `addendum.extendsDeadline` | EXTRACT |
| `addendum.newDeadline` | EXTRACT (if extended) |
| `addendum.boqChanges[].itemRef` | EXTRACT (for BOQ amendments) |
| `addendum.boqChanges[].deltaQuantity` | EXTRACT |
| `addendum.boqChanges[].newDescription` | EXTRACT |
| `addendum.signature` | EXTRACT (Employer's signature) |
| `addendum.attachments[]` | EXTRACT (list of attached drawings / docs) |

### 9.2 Persistor

| Field | DB row |
| --- | --- |
| Whole | `document` with `scope='ta'`, `category='Tender Addendum'`, metadata in jsonb |
| `extendsDeadline + newDeadline` | updates `project.adjusted_return_at` (with audit) |
| `boqChanges[]` | optional `boq_item` updates (versioned) |
| `reference` | cross-checked on every FOT save against `acknowledgedAddenda[]` |

---

## 10. `drawings-register`

**Sample pending.**

### 10.1 Every field present

| Field | Class |
| --- | --- |
| `register.projectCode` | EXTRACT (e.g. "ADS-226") |
| `register.discipline` | EXTRACT (architectural / landscape / structural / mep / civil) |
| `register.seriesRange` | EXTRACT ("ADS-226-ST-L000 to L1950") |
| `register.totalCount` | EXTRACT |
| `register.issuedDate` | EXTRACT |
| `register.drawings[].drawingNumber` | EXTRACT |
| `register.drawings[].title` | EXTRACT |
| `register.drawings[].revision` | EXTRACT (e.g. "C") |
| `register.drawings[].dateIssued` | EXTRACT |
| `register.drawings[].scale` | EXTRACT (e.g. "1:100") |
| `register.drawings[].sheetSize` | EXTRACT (A0 / A1) |
| `register.drawings[].discipline` | EXTRACT |
| `register.drawings[].status` | EXTRACT (Issued for Tender / Information / Construction) |

### 10.2 Persistor

Each drawing becomes a logical `document` row with metadata jsonb. The actual DWG/PDF files are uploaded separately and matched to the register.

---

## 11. `cover-letter` (bidder)

**Sample pending.**

### 11.1 Every field present

| Field | Class |
| --- | --- |
| `letter.tendererName` | EXTRACT |
| `letter.contactPerson` | EXTRACT |
| `letter.contactEmail` | EXTRACT |
| `letter.contactPhone` | EXTRACT |
| `letter.dated` | EXTRACT |
| `letter.referenceLine` | EXTRACT |
| `letter.confirmations[].label` | EXTRACT (e.g. "Validity 90 days confirmed") |
| `letter.confirmations[].confirmed` | EXTRACT |
| `letter.qualifications[].label` | EXTRACT (e.g. "ISO 9001:2015 Certified") |
| `letter.qualifications[].evidenceRef` | EXTRACT (Schedule A5 link) |
| `letter.commercialExceptions[].summary` | EXTRACT |
| `letter.commercialExceptions[].detail` | EXTRACT |
| `letter.commercialExceptions[].impactCents` | EXTRACT (if quantified) |
| `letter.commercialExceptions[].clauseRef` | EXTRACT (which ITT/COC clause) |
| `letter.technicalExceptions[].summary` | EXTRACT |
| `letter.technicalExceptions[].detail` | EXTRACT |
| `letter.technicalExceptions[].specSectionRef` | EXTRACT |
| `letter.bondsCommitted` | EXTRACT |
| `letter.signatureBlock.name` | EXTRACT |
| `letter.signatureBlock.capacity` | EXTRACT |

### 11.2 Persistor

| Form field | DB row |
| --- | --- |
| `qualifications[i]` | `qualification` row, status='claimed' |
| `commercialExceptions[i]` | `deviation` row, kind='commercial' |
| `technicalExceptions[i]` | `deviation` row, kind='technical' |
| `confirmations[]` | feeds compliance matrix (FOT acknowledgments cross-check) |

---

## 12. `specification` — Technical Specifications

**Samples seen:** ADS-226 Architectural + Landscape (Nov 2025), CSI MasterFormat 2012.

Manual entry **not supported**.

### 12.1 Every field present (AI target)

**Doc-level:**

| Field | Class |
| --- | --- |
| `discipline` | EXTRACT (architectural / landscape / structural / mep / civil) |
| `author` | EXTRACT ("Aperture Design Studio") |
| `issuedAt` | EXTRACT (date) |
| `format` | EXTRACT (`csi-masterformat` / `nbs` / `bespoke`) |
| `projectCode` | EXTRACT ("ADS-226") |
| `sectionsTotal` | EXTRACT |
| `divisionsUsed[]` | EXTRACT (`["03", "04", ...]`) |

**Per section (full 3-part CSI structure — every Part 1 sub-clause):**

| Field | Class |
| --- | --- |
| `sections[].csiCode` | EXTRACT |
| `sections[].csiDivision` | EXTRACT |
| `sections[].title` | EXTRACT |
| `sections[].pageCount` | EXTRACT |
| `sections[].part1.relatedDocuments` | EXTRACT |
| `sections[].part1.sectionIncludes` | EXTRACT |
| `sections[].part1.references.bsi[]` | EXTRACT |
| `sections[].part1.references.aci[]` | EXTRACT |
| `sections[].part1.references.astm[]` | EXTRACT |
| `sections[].part1.references.en[]` | EXTRACT |
| `sections[].part1.references.other[]` | EXTRACT |
| `sections[].part1.relatedSections[]` | EXTRACT (code + title) |
| `sections[].part1.submittals[]` | EXTRACT |
| `sections[].part1.qualityAssurance` | EXTRACT |
| `sections[].part1.qualityControl` | EXTRACT |
| `sections[].part1.preconstructionTesting` | EXTRACT |
| `sections[].part1.deliveryStorageHandling` | EXTRACT |
| `sections[].part1.fieldConditions` | EXTRACT |
| `sections[].part1.warranty.years` | EXTRACT (e.g. 15) |
| `sections[].part1.warranty.scope` | EXTRACT |
| `sections[].part2.products[]` | EXTRACT (each sub-clause: Formwork / Steel / Concrete / Admixtures / …) |
| `sections[].part2.materials[]` | EXTRACT |
| `sections[].part2.manufacturers[]` | EXTRACT |
| `sections[].part3.execution[]` | EXTRACT |
| `sections[].part3.installation[]` | EXTRACT |
| `sections[].part3.fieldQualityControl[]` | EXTRACT |
| `sections[].part3.cleaning[]` | EXTRACT |
| `sections[].part3.protection[]` | EXTRACT |

**Appendix A — Approved Manufacturers:**

| Field | Class |
| --- | --- |
| `approvedManufacturers[].sectionCode` | EXTRACT |
| `approvedManufacturers[].product` | EXTRACT |
| `approvedManufacturers[].manufacturer` | EXTRACT |
| `approvedManufacturers[].model` | EXTRACT |
| `approvedManufacturers[].countryOfOrigin` | EXTRACT |
| `approvedManufacturers[].alternatives[]` | EXTRACT (multiple manufacturers per product) |

### 12.2 New DB tables

```sql
specification_doc (
  id, project_id, document_id, discipline, author, issued_at,
  format, project_code, sections_total, divisions_used jsonb,
  created_at
)

specification_section (
  id, spec_doc_id, csi_code, csi_division, title, page_count,
  references jsonb,                 -- {bsi:[], aci:[], astm:[], en:[], other:[]}
  related_sections jsonb,
  submittals jsonb,
  warranty jsonb,                   -- {years, scope}
  part1_text text, part2_text text, part3_text text
)

specification_approved_manufacturer (
  id, spec_doc_id, section_code, product, manufacturer,
  model, country_of_origin, alternatives jsonb
)
```

### 12.3 Used by

Step 5 Technical Deviations detector. When a bidder mentions a substitution in their Cover Letter or priced BOQ description, the deviation extractor checks the spec's `approvedManufacturers` and `references` to determine compliance.

---

## 13. `sopr` — Schedule of Project Requirements (Volume 3)

**Sample pending.**

Referenced by both ITT (Schedule A1: Preliminary Programme, A2: Org Charts, A3: Key Personnel, A4: Relevant Experience, A5: QA/QC, A6: Insurance, A7: Method Statement, A8: Subcontractors, A9: H&S, A10: Trade Licence, A11: Site Visit, A12: JV Details, 13: Current Commitment, 14: Innovative Approaches, 15: Sustainability, 16: Value Engineering, 17: Bank Details) and the COC.

### 13.1 Every field present (AI target — once sample arrives)

| Field | Class |
| --- | --- |
| `sopr.projectName` | VERIFY |
| `sopr.keyDates[]` | EXTRACT (tender issue / return / award / start / completion) |
| `sopr.scopeDescription` | EXTRACT |
| `sopr.programmeRequirements` | EXTRACT |
| `sopr.staffingRequirements` | EXTRACT |
| `sopr.qaQcRequirements` | EXTRACT |
| `sopr.insuranceMinimums[]` | EXTRACT (cross-check vs COC Appendices E/F/G) |
| `sopr.healthSafetyRequirements` | EXTRACT |
| `sopr.scheduleA1.programmeFormat` | EXTRACT ("Primavera P6 / MS Project") |
| `sopr.scheduleA1.granularity` | EXTRACT ("weekly time scale") |
| `sopr.scheduleA*..A17[]` | EXTRACT (per schedule, format + content requirements) |

(Each schedule's requirements seed compliance criteria.)

---

## 14. `ptc-pack` (generated) and `ptc-response` (bidder)

These are downstream artefacts, not user-uploaded. Their schemas are defined by:

- **`ptc-pack`** — generated by `reports.generate('procurex.ptc-pack', {...})`. Schema = whatever the round config + flag list produces. PDF rendered server-side.
- **`ptc-response`** — bidder uploads via the portal. Schema = same as the PTC pack's questions, each answered. Persistor updates `flag.response` + opens next round.

No accordion form in Step 2 for these. They live in Step 6 (Reports) and the bidder portal respectively.

---

## 15. Status badges on the accordion header

| Badge | Meaning | Color |
| --- | --- | --- |
| `Empty` | No data saved | gray |
| `Manually filled · X fields` | User typed, no upload | blue |
| `Uploaded · extracting…` (with spinner) | Agent running | amber |
| `Uploaded · extracted ✓ · X/Y fields` | Verdict applied | emerald |
| `Uploaded · review required ⚠ · X/Y fields` | Some fields missing | amber |
| `Manually edited from upload` | User edited AI-prefilled values | indigo |
| `Mismatch ⚠ · detected as <other>` | Wrong category | red |
| `Cross-doc mismatch ⚠` | Saved but cross-check failed | amber |

---

## 16. DB schema additions

### 16.1 `project` new columns

```sql
ALTER TABLE project ADD COLUMN required_validity_days int;
ALTER TABLE project ADD COLUMN itt_addenda_cutoff_days int;
ALTER TABLE project ADD COLUMN itt_clarification_cutoff_days int;
ALTER TABLE project ADD COLUMN vat_treatment text;       -- 'exclusive' | 'inclusive'
ALTER TABLE project ADD COLUMN engineer_name text;
ALTER TABLE project ADD COLUMN document_priority_order jsonb;
ALTER TABLE project ADD COLUMN approved_bond_banks jsonb;
ALTER TABLE project ADD COLUMN alternative_tender_allowed boolean default false;
ALTER TABLE project ADD COLUMN reraTrustAccountRequired boolean default false;

-- COC Particular Conditions
ALTER TABLE project ADD COLUMN contract_form text;       -- 'fidic-red'|'fidic-yellow'|'nec'|'bespoke'
ALTER TABLE project ADD COLUMN contract_form_version text;
ALTER TABLE project ADD COLUMN advance_payment_percent numeric;
ALTER TABLE project ADD COLUMN performance_bond_percent numeric;
ALTER TABLE project ADD COLUMN advance_payment_bond_percent numeric;
ALTER TABLE project ADD COLUMN retention_percent numeric;
ALTER TABLE project ADD COLUMN retention_cap_cents bigint;
ALTER TABLE project ADD COLUMN ld_per_day_cents bigint;
ALTER TABLE project ADD COLUMN ld_cap_cents bigint;
ALTER TABLE project ADD COLUMN dlp_months int;
ALTER TABLE project ADD COLUMN decennial_liability_years int;
ALTER TABLE project ADD COLUMN governing_law text;
ALTER TABLE project ADD COLUMN dispute_forum text;
ALTER TABLE project ADD COLUMN language text default 'English';
ALTER TABLE project ADD COLUMN insurance_minimums jsonb;
```

### 16.2 `boq_section` new column

```sql
ALTER TABLE boq_section ADD COLUMN pricing_mode text default 'measured';
   -- 'measured' | 'general_req'
```

### 16.3 `compliance_record` new columns

```sql
ALTER TABLE compliance_record ADD COLUMN criterion_label text;
ALTER TABLE compliance_record ADD COLUMN expected_value jsonb;
ALTER TABLE compliance_record ADD COLUMN actual_value jsonb;
```

### 16.4 New tables — specifications

```sql
CREATE TABLE specification_doc (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  document_id text NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  discipline text NOT NULL,
  author text,
  issued_at date,
  format text,
  project_code text,
  sections_total int,
  divisions_used jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE specification_section (
  id text PRIMARY KEY,
  spec_doc_id text NOT NULL REFERENCES specification_doc(id) ON DELETE CASCADE,
  csi_code text NOT NULL,
  csi_division text NOT NULL,
  title text NOT NULL,
  page_count int,
  references jsonb,
  related_sections jsonb,
  submittals jsonb,
  warranty jsonb,
  part1_text text,
  part2_text text,
  part3_text text
);

CREATE TABLE specification_approved_manufacturer (
  id text PRIMARY KEY,
  spec_doc_id text NOT NULL REFERENCES specification_doc(id) ON DELETE CASCADE,
  section_code text,
  product text NOT NULL,
  manufacturer text NOT NULL,
  model text,
  country_of_origin text,
  alternatives jsonb
);
```

### 16.5 Tender Addendum extension

```sql
-- Already covered: document.scope='ta' with metadata jsonb.
-- No new table needed — addendum-specific fields live in document.extracted_data.
```

---

## 17. Component plan — `<DocAccordion>` + field renderer

### 17.1 The single accordion component

```ts
interface DocAccordionProps<T> {
  spec: DocSpec<T>
  projectId: string
  roundId: string
  initialValue?: T
  documentId?: string                    // if a doc is already uploaded
  onSaved?: (value: T) => void
}
```

Renders:
- Heroui `<Disclosure>` with header (label, status badge, scope chip).
- Inside `<Disclosure.Body>`: a 2-tab pill switcher (`Manual` / `Upload`).
- Manual tab: `<DynamicForm fields={spec.manualFields} schema={spec.schema} ... />`.
- Upload tab: `<DocUploadPanel category={spec.category} onExtracted={...} />`.
- The bottom: `[Save]` (manual) or `[Apply extracted to manual]` then `[Save]` (upload).

A top-level `<DocAccordion.Group>` stacks them inside Step 2:

```ts
<DocAccordion.Group allowsMultipleExpanded>
  {DOC_SPECS_FOR_STEP2.map((spec) => (
    <DocAccordion key={spec.id} spec={spec} ... />
  ))}
</DocAccordion.Group>
```

### 17.2 The dynamic form renderer

```ts
type ManualFieldConfig =
  | { kind: "text" | "textarea" | "email"; key: string; label: string; required?: boolean; placeholder?: string; hint?: string }
  | { kind: "number" | "money" | "percent"; key: string; label: string; required?: boolean; min?: number; max?: number; currency?: string }
  | { kind: "date"; key: string; label: string; required?: boolean }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[]; required?: boolean }
  | { kind: "boolean"; key: string; label: string; default?: boolean }
  | { kind: "repeating-rows"; key: string; label: string; rowFields: ManualFieldConfig[]; minRows?: number; maxRows?: number; addLabel?: string }
  | { kind: "group"; label: string; description?: string; fields: ManualFieldConfig[] }
  | { kind: "readonly-note"; text: string; severity?: "info" | "warning" }
  | { kind: "company-picker"; key: string; label: string }          // pulls from companies module
  | { kind: "address"; key: string; label: string }                  // composite block
  | { kind: "signature-block"; key: string; label: string }          // capacity/name/witness…
```

`<DynamicForm>` walks `fields[]` recursively, binding each input to the
correct `key` in form state. `key` strings are dot-paths matching the zod
schema (e.g. `ohpMarkups.variationProvisionalPercent`).

### 17.3 Upload panel

`<DocUploadPanel>` retains the existing drag-and-drop + browse buttons,
calls `documents.requestUploadUrl` per the configured `category` + `scope`,
and on `commitDocumentUpload` completion polls `workflow_run` for the agent
verdict. When the verdict lands, it:

1. Renders an "Extraction complete" summary with field count and warnings.
2. Offers `[Apply to manual form]` → merges verdict into the form state +
   switches the tab to Manual + shows green ticks per filled field.
3. The user reviews/edits and clicks `[Save]`.

---

## 18. Registry — `DOC_SPECS`

Single source of truth for every category. Drives the UI, the agent, the
persistor.

```ts
// modules/ai-extraction/specs/registry.ts

import { fotSchema, fotManualFields, persistFot, FOT_AGENT_SPEC } from "./fot"
import { ittSchema, ittManualFields, persistItt, ITT_AGENT_SPEC } from "./itt"
// … one import per category

export const DOC_SPECS = {
  fot: {
    id: "fot",
    label: "Form of Tender",
    shortLabel: "FOT",
    scope: "required",
    category: "Form of Tender",
    required: true,
    manualFeasible: "full",
    schema: fotSchema,
    manualFields: fotManualFields,
    persistor: persistFot,
    agentSpec: FOT_AGENT_SPEC,
  },
  itt: { ... },
  coc: { ... },
  "boq-template": { ... },
  "boq-priceset": { ... },
  pte: { ... },
  addenda: { ... },
  "drawings-register": { ... },
  "cover-letter": { ... },
  specification: { ... },
  sopr: { ... },
} as const

export const STEP2_REQUIRED_DOCS = [
  DOC_SPECS.fot,
  DOC_SPECS.itt,
  DOC_SPECS.coc,
  DOC_SPECS["boq-template"],
  DOC_SPECS["drawings-register"],
  DOC_SPECS.sopr,
  DOC_SPECS.specification,
]

export const STEP2_OPTIONAL_DOCS = [
  DOC_SPECS.pte,
  DOC_SPECS.addenda,
]
```

Step 2 renders one accordion per entry in `STEP2_REQUIRED_DOCS`, then the
optional ones below.

---

## 19. Validation flow (manual + upload share this)

```text
form submit / agent verdict apply
    │
    ▼
1. Zod parse against spec.schema
    │   on fail → show inline errors per field
    ▼
2. Required-field check
    │
    ▼
3. Per-spec validators
    │   e.g. FOT.tenderSumWords ↔ tenderSumFigures round-trip
    │       BOQ.subtotals ≈ MS grand total
    ▼
4. Server Action: documents.saveDocForm({ category, formData, documentId? })
    │
    ▼
5. Persistor (per spec)
    │   writes derived rows
    │   audits
    ▼
6. Cross-doc validators (async)
    │   e.g. FOT.acknowledgedAddenda[] ↔ document.scope='ta' rows
    │       FOT.tenderSum ↔ boq-priceset.mainSummaryTotal
    ▼
7. Notification on success or warning
```

---

## 20. Build order

1. **Migration** — add the new `project.*` columns (§16.1), `boq_section.pricing_mode` (§16.2), `compliance_record.*` extensions (§16.3), and the three new specification tables (§16.4).
2. **`DOC_SPECS` registry skeleton** — file + 11 placeholder entries.
3. **Write `fot.ts`** (schema + manualFields + persistor + agentSpec) — most studied doc.
4. **`<DocAccordion>` + `<DynamicForm>` components** — universal, drives every category.
5. **Server Action `documents.saveDocForm`** — calls the right persistor.
6. **Replace `UploadedDocsTable` in Step 2** with `<DocAccordion.Group>` over `STEP2_REQUIRED_DOCS`.
7. **Wire `itt.ts`** + **`coc.ts`** (sample-backed). UI lights up.
8. **Wire `specification.ts` + `boq-template.ts`** (upload-only, `manualFeasible='no'`).
9. **AI agent integration** — when upload completes, agent verdict maps via `spec.schema` and pre-fills the manual form.
10. **Cross-doc validators** — implement §19 step 6 for every pair listed.
11. **Remaining categories** (`pte`, `addenda`, `drawings-register`, `cover-letter`, `sopr`, `boq-priceset`) as samples arrive.

---

## 21. One-line summary

**Every doc category has one zod schema. The form renders from the same field config the agent extracts into. The persistor reads the same shape from either path. Add a new category = add one entry to `DOC_SPECS`. Add a new field = add it once in the schema and the UI / agent / DB all see it.**
