# `coc` — Conditions of Contract

The legal terms of the construction contract. 37 clauses + 7 appendices.
The **Particular Conditions** in Appendix A carry the project-specific
numbers (Contract Sum, LDs, Retention %, DLP, etc.).

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `coc` |
| `label` | Conditions of Contract |
| `shortLabel` | COC |
| `scope` | required |
| `category` | "Conditions of Contract" |
| `required` | ✓ |
| `manualFeasible` | **partial** — Particular Conditions block is full manual; full clause text is upload-only |
| Sample | `EMR DCH PUBLIC REALM MW 0214 COC (DEC 2025).pdf` · 79 pages · February 2025 Version (Rev-Sep25) · Form code `BO-LF-NONRERA-DC` |

---

## 2. Field inventory

### 2.1 Header

| Field | Class | Notes |
| --- | --- | --- |
| `header.contractFormCode` | EXTRACT | "BO-LF-NONRERA-DC" |
| `header.contractForm` | EXTRACT | enum `fidic-red` / `fidic-yellow` / `nec` / `bespoke` — detected from code + clause pattern |
| `header.version` | EXTRACT | "February 2025 Version Rev-Sep25" |
| `header.tenderPackageName` | VERIFY | matches FOT/ITT |
| `header.documentReference` | EXTRACT | |

### 2.2 Clause 1 — Definitions (60+ entries)

| Field | Class | Notes |
| --- | --- | --- |
| `definitions[].letter` | EXTRACT | (a)–(fff) etc. |
| `definitions[].term` | EXTRACT | per-letter |
| `definitions[].meaning` | EXTRACT | per-term text |

Key definitions to capture as separate fields:
`Advance Payment`, `Advance Payment Bond`, `Agreement`, `Authority`,
`Bills of Quantities`, `Business Day`, `Commencement Date`,
`Conditions of Contract`, `Contract`, `Contract Sum`, `Contractor`,
`Contractor's Equipment`, `Contractor's Representative`, `Cost`,
`Defects Liability Certificate`, `Defects Liability Period`,
`Drawings`, `Employer`, `Employer's Representative`, `Engineer`,
`Engineer's Representative`, `Environment`, `Extended Warranty`,
`Final Certificate`, `Free Issue Items`, `Hazardous Substances`,
`Instructions to Tenderers`, `Interim Payment Certificate`,
`Law or Laws`, `Liquidated Damages`, `Nominated Subcontractor`,
`Nominated Subcontractor Works`, `Notice`, `Notice to Commence`,
`Particular Conditions`, `Party / Parties`, `Performance Bond`,
`Plant`, `Portion`, `Primary Legislation`, `Proceedings`,
`Programme`, `Prohibited Acts`, `Project`, `Provisional Sum`,
`Related Work`, `Schedule of Project Requirements`, `Section of the Works`,
`Site`, `Specification`, `Standard Conditions of Subcontract`,
`Subcontractor`, `Substantial Completion` (8 sub-conditions),
`Suspension Order`, `Taking-Over Certificate`, `Tender Addenda`,
`Tests on Completion`, `Time for Completion`.

### 2.3 Clauses 2-37 — every clause

Stored as `cocClauses[].{ref, title, page, bodyText}`. Most are DISPLAY
boilerplate. Notable extractable items per clause:

| Clause | Title | Extractable values (linked to Particular Conditions) |
| --- | --- | --- |
| 2 | Engineer and Engineer's Representative | `engineer.delegationLimits` |
| 3.1 | Assignment | `assignment.requiresConsent` |
| 3.2 | Subcontracting | `subcontracting.requiresConsent`, `subcontracting.thresholdPct` |
| 4.1 | Languages | `language` |
| 4.2 | Governing Law | `governingLaw` |
| 4.3 | Priority of Contract Documents | `documentPriorityOrder[]` |
| 5.x | Drawings & Specifications | submission workflow values |
| 6.x | Obligations of the Contractor | 18 sub-clauses, mostly DISPLAY |
| 7.x | Free Issue Items | category-only |
| 8.1(a) | Performance Bond | `performanceBondPercent` (→ Particular Conditions) |
| 8.1(b) | Advance Payment Bond | `advancePaymentBondPercent` |
| 8.3 | Reduction of APB | reduction schedule |
| 8.4 | Period of validity | validity-extension rules |
| 9.1 | Advance Payment | `advancePaymentPercent` |
| 9.2 | Employer's Cost | recovery mechanism |
| 9.3 | Advance Payment Plan | repayment schedule |
| 9.4 | Repayment | repayment trigger |
| 10.x | The Site | site-data, setting-out, fossils, urgent repairs |
| 11.x | Contractor's Employees | working hours rules |
| 12.x | Plant, Workmanship & Equipment | inspection / testing / rejection |
| 13.x | Title, Risk, Care, Indemnities, Insurance | insurance min coverages |
| 14.x | Applicable Laws | UAE law compliance |
| 15.x | Patent & Other Protected Rights | indemnity rules |
| 16.x | Secrecy | confidentiality rules |
| 17.1 | Commencement | trigger |
| 17.2 | Programme | submission window |
| 17.3 | Rate of Progress | progress reporting |
| 17.4 | Cash Flow Estimate | submission window |
| 18.x | Suspension of Works | 180-day max |
| 19.1 | Time for Completion | extension rules |
| 19.3 | **Liquidated Damages** | `ldPerDayCents` + `ldCapCentsOrPercent` (→ Particular Conditions) |
| 20.x | Tests on Completion | testing programme |
| 21.x | Taking Over | substantial completion criteria |
| 22.x | Defects | `dlpMonths` (→ Particular Conditions) |
| 22.11 | Decennial Liability | `decennialLiabilityYears` (10 typical) |
| 23.x | Variations | OHP markup rules (cross-link FOT Clause 3) |
| 24.x | Provisional Sums | valuation mechanism |
| 25.x | Claims | notice windows |
| 26.x | Nominated Subcontractors | OHP markup rules |
| 26A | Payment to Subcontractors | payment-flow rules |
| 26B | Contractor's Escrow Account | optional |
| 27.1 | Quantities | re-measurement rules |
| 28.1 | Extended Warranties | warranty enforcement |
| 29.x | Interim & Final Certificates | `retentionPercent`, `retentionCap` (→ Particular Conditions) |
| 30.x | Payment | payment terms in days |
| 31.1 | Fixed Price | true/false |
| 32.1 | Adjustments for Changes in Legislation | |
| 33.x | Force Majeure | definition + notice rules |
| 34.x | Default of Contractor | termination + valuation |
| 35.x | Termination for Convenience / Default of Employer | termination terms |
| 36.x | Jurisdiction | `jurisdiction`, `disputeForum`, `amicableSettlement` |
| 37.x | Compliance with Authority Requirements | |

### 2.4 Appendix A — Particular Conditions (THE critical block)

| Field | Class | Source clause |
| --- | --- | --- |
| `particular.contractSumCents` | EXTRACT | 1.1(j) |
| `particular.contractorName` | EXTRACT | filled on award |
| `particular.commencementDate` | EXTRACT | filled on award |
| `particular.engineerName` | VERIFY | matches ITT |
| `particular.employerName` | VERIFY | matches FOT/ITT |
| `particular.governingLaw` | EXTRACT | 4.2 |
| `particular.languageOfCommunication` | EXTRACT | 4.1 |
| `particular.documentPriorityOrder` | EXTRACT | 4.3 |
| `particular.performanceBondPercent` | EXTRACT | 8.1(a) |
| `particular.advancePaymentBondPercent` | EXTRACT | 8.1(b) |
| `particular.performanceBondReductionSchedule` | EXTRACT | 8.3 |
| `particular.advancePaymentPercent` | EXTRACT | 9.1 |
| `particular.advancePaymentRepaymentPlan` | EXTRACT | 9.3 |
| `particular.timesForCompletionDays[]` | VERIFY | matches FOT.timesForCompletion / SOPR.sectionsOfTheWorks |
| `particular.liquidatedDamagesPerDayCents` | EXTRACT | 19.3 |
| `particular.liquidatedDamagesCapCents` or `liquidatedDamagesCapPercent` | EXTRACT | 19.3 |
| `particular.retentionPercent` | EXTRACT | 29.1 |
| `particular.retentionCapCents` or `retentionCapPercent` | EXTRACT | 29.x |
| `particular.dlpMonths` | EXTRACT | 22.2 |
| `particular.decennialLiabilityYears` | EXTRACT | 22.11 (typical 10) |
| `particular.fixedPrice` | EXTRACT | 31.1 (true/false) |
| `particular.disputeForum` | EXTRACT | 36.1 (e.g. "Dubai Courts") |
| `particular.amicableSettlementPeriodDays` | EXTRACT | 36.5 |
| `particular.standardConditionsOfSubcontract` | EXTRACT | 1.1(yy) — referenced ConcessionRef |
| `particular.workingHoursStart` | EXTRACT | per Particular Conditions |
| `particular.workingHoursEnd` | EXTRACT | |
| `particular.weekendWorkAllowed` | EXTRACT | |

### 2.5 Appendix B — Performance Bond Form

| Field | Class | Notes |
| --- | --- | --- |
| `appB.template` | DISPLAY | bond template text |
| `appB.amountFormula` | EXTRACT | links to `performanceBondPercent` × Contract Sum |
| `appB.validityPeriod` | EXTRACT | typically Contract end + DLP |

### 2.6 Appendix C — Advance Payment Bond Form

Same shape as B for advance-payment bond.

### 2.7 Appendix D — Competitive Tendering

| Field | Class | Notes |
| --- | --- | --- |
| `appD.competitiveTenderingRules` | EXTRACT | rules for subcontracting |

### 2.8 Appendix E — Machinery All Risks Insurance Policy

| Field | Class | Notes |
| --- | --- | --- |
| `appE.machineryAllRisks.minimumCoverageCents` | EXTRACT | |
| `appE.machineryAllRisks.deductibleCents` | EXTRACT | |
| `appE.machineryAllRisks.exclusions[]` | EXTRACT | |

### 2.9 Appendix F — Workmen's Comp & Employer's Liability Insurance

| Field | Class | Notes |
| --- | --- | --- |
| `appF.workmensComp.minimumCoverageCents` | EXTRACT | |
| `appF.employersLiability.minimumCoverageCents` | EXTRACT | |

### 2.10 Appendix G — Contractor's All Risk Insurance Policy

| Field | Class | Notes |
| --- | --- | --- |
| `appG.car.minimumCoverageCents` | EXTRACT | |
| `appG.car.deductibleCents` | EXTRACT | |
| `appG.car.coveragePeriod` | EXTRACT | |

**Total fields:** ~150 (most are DISPLAY clause-text; ~32 EXTRACT in Particular Conditions and Appendices).

---

## 3. Zod schema

```ts
export const cocSchema = z.object({
  header: z.object({
    contractFormCode: z.string(),
    contractForm: z.enum(["fidic-red", "fidic-yellow", "nec", "bespoke"]),
    version: z.string(),
    documentReference: z.string(),
  }),

  definitions: z.array(z.object({ letter: z.string(), term: z.string(), meaning: z.string() })),
  cocClauses: z.array(z.object({ ref: z.string(), title: z.string(), bodyText: z.string() })),

  particular: z.object({
    contractSumCents: z.bigint().nullable(),
    contractorName: z.string().nullable(),
    commencementDate: z.string().date().nullable(),
    engineerName: z.string(),
    employerName: z.string(),
    governingLaw: z.string(),
    languageOfCommunication: z.string(),
    documentPriorityOrder: z.array(z.string()),

    performanceBondPercent: z.number(),
    advancePaymentBondPercent: z.number(),
    advancePaymentPercent: z.number(),

    timesForCompletionDays: z.array(z.object({ label: z.string(), days: z.number().int() })),

    liquidatedDamagesPerDayCents: z.bigint(),
    liquidatedDamagesCapCents: z.bigint().nullable(),
    liquidatedDamagesCapPercent: z.number().nullable(),

    retentionPercent: z.number(),
    retentionCapCents: z.bigint().nullable(),
    retentionCapPercent: z.number().nullable(),

    dlpMonths: z.number().int(),
    decennialLiabilityYears: z.number().int(),

    fixedPrice: z.boolean(),
    disputeForum: z.string(),
    amicableSettlementPeriodDays: z.number().int().optional(),
  }),

  insurance: z.object({
    machineryAllRisksMinCents: z.bigint(),
    workmensCompMinCents: z.bigint(),
    employersLiabilityMinCents: z.bigint(),
    contractorAllRiskMinCents: z.bigint(),
  }),
})

export type Coc = z.infer<typeof cocSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Conditions of Contract (COC)]
└── [Tabs: Manual | Upload]
    └── Manual tab — only the Particular Conditions block
        ├── Contract identity
        │   • Contract form code         (text — usually pre-filled from upload)
        │   • Version                    (text)
        ├── Particular Conditions
        │   • Contract Sum (cents)       (money)
        │   • Times for Completion       (repeating-rows — cross-checked vs FOT)
        │   • Advance Payment %          (percent)
        │   • Performance Bond %         (percent)
        │   • Advance Payment Bond %     (percent)
        │   • Retention %                (percent)
        │   • Retention cap              (currency OR percent of contract sum)
        │   • LDs per day                (money)
        │   • LDs cap                    (currency OR percent)
        │   • DLP (months)               (integer)
        │   • Decennial liability years  (integer)
        │   • Governing law              (text)
        │   • Dispute forum              (text — Dubai Courts)
        │   • Language                   (text)
        │   • Working hours (start / end)
        │   • Engineer name              (text — auto from ITT)
        ├── Insurance minimums
        │   • Machinery All Risks min    (money)
        │   • Workmen's Comp min         (money)
        │   • Employer's Liability min   (money)
        │   • Contractor's All Risk min  (money)
        ├── Full clause list (read-only side panel after upload)
        └── [Save COC]
```

---

## 5. Persistor mapping

All Particular Conditions values land on the `project` row:

| Form field | DB row |
| --- | --- |
| `header.contractFormCode` | `project.contract_form_code` |
| `header.contractForm` | `project.contract_form` |
| `particular.contractSumCents` | `project.contract_sum_cents` (post-award; nullable until then) |
| `particular.engineerName` | `project.engineer_name` |
| `particular.governingLaw` | `project.governing_law` |
| `particular.languageOfCommunication` | `project.language` |
| `particular.documentPriorityOrder` | `project.document_priority_order` jsonb |
| `particular.performanceBondPercent` | `project.performance_bond_percent` |
| `particular.advancePaymentBondPercent` | `project.advance_payment_bond_percent` |
| `particular.advancePaymentPercent` | `project.advance_payment_percent` |
| `particular.liquidatedDamagesPerDayCents` | `project.ld_per_day_cents` |
| `particular.liquidatedDamagesCapCents` | `project.ld_cap_cents` |
| `particular.retentionPercent` | `project.retention_percent` |
| `particular.retentionCapCents` | `project.retention_cap_cents` |
| `particular.dlpMonths` | `project.dlp_months` |
| `particular.decennialLiabilityYears` | `project.decennial_liability_years` |
| `particular.fixedPrice` | `project.fixed_price` |
| `particular.disputeForum` | `project.dispute_forum` |
| `insurance.*` | `project.insurance_minimums` jsonb |
| `cocClauses[]` | `document.extracted_data.cocClauses[]` (side panel display) |

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `particular.timesForCompletionDays[i]` must equal `fot.clause2.timesForCompletion[i].days` | save | hard |
| `particular.timesForCompletionDays[i]` must equal `sopr.sectionsOfTheWorks[i].timeForCompletionDays` | save | hard |
| `particular.engineerName` ↔ `itt.formOfAgreement.engineerName` | save | hard |
| `particular.documentPriorityOrder` ↔ `itt.formOfAgreement.documentPriorityOrder` | save | hard |
| `particular.performanceBondPercent` > 0 → `itt.bonds.performanceBondRequired = true` | save | hard |
| `particular.governingLaw` ≠ `itt.language` mismatch warning | save | soft |

---

## 7. Agent extraction notes

- The COC is the longest doc — pre-extractor must produce a per-clause `surface.md` chunked by clause ref, and a separate `particular_conditions.md` with the Appendix A block isolated.
- Definitions (Clause 1) appear as `(a) Term means …` letter-prefixed lists; some span multiple paragraphs. Use lettered-list parsing.
- Particular Conditions (Appendix A) is the **highest-value block** — usually a table with two columns: "Clause Ref" and "Particular Condition". Numbers + units must be extracted as `bigint` cents / integer days / numeric percent.
- LD cap and retention cap can be expressed either as a cents amount **or** as a percentage of the contract sum. The agent must detect which and populate the correct field, leaving the other null.
- Clause 22.11 Decennial Liability: extract years (typical 10). If absent, default to 0 with INSUFFICIENT_EVIDENCE warning.
- Insurance appendices E/F/G use tables with policy types and minimum coverages — extract as money values in AED.
- Clauses 33-35 (Force Majeure, Default, Termination): mostly DISPLAY, but extract any notice-period day counts.
- Clause 4.3 priority order is the canonical reference for `document_priority_order` — both ITT Appendix A and COC must agree; if they don't, raise a hard cross-doc warning.

---

## 8. Sample evidence

- Pages 1-5: Cover + TOC
- Pages 6-10: Clause 1 Definitions
- Pages 11-50: Clauses 2-37 body
- Pages 51-79: Appendices A-G

Observed values in the Dubai Creek Harbour COC (form code `BO-LF-NONRERA-DC`):

- Contract form: bespoke (FIDIC Red-derived structure)
- Version: February 2025 Rev-Sep25
- Document priority order: Agreement > LoA > COC > Tender Addenda > Specification > Drawings > SOPR > BOQ
- Decennial Liability: present in Clause 22.11 (UAE Civil Code reference)
- Substantial Completion: 8 sub-conditions (tests passed, as-builts delivered, warranties received, etc.)
- Particular Conditions Appendix A: present (but specific values not visible in the first 10 pages — must read further into the doc)
