# ProcureX — Document Structures Reference

> **What this file is.** A single reference for the **structure of every document type** ProcureX
> handles — Form of Tender, Instructions to Tenderer, Conditions of Contract, Schedule of Project
> Requirements, the blank Bill of Quantities, the Pre-Tender Estimate, the Technical Specification,
> the Drawings Register, Tender Addenda, and every bidder-submission document. For each one it lists
> the actual fields, their types and constraints, what part of the source document each field comes
> from, and where the value is stored.
>
> This is a *structure* reference (the schema of each document). For what each step of the workflow
> *does* with these documents, see `procurex-study.md`.

---

## 1. How documents work in ProcureX (the common model)

Every document category is defined once, in a single registry, and that one definition drives the
upload, the AI extraction, the manual entry form, and the persistence. A category is described by a
**document spec** with this envelope:

| Property | Meaning |
|---|---|
| `id` | Stable identifier (e.g. `fot`, `itt`, `boq-template`). |
| `label` | Human name (e.g. "Form of Tender"). |
| `shortLabel` | Abbreviation (e.g. "FOT"). |
| `scope` | Which side of the tender it belongs to (see below). |
| `category` | The stored category string on the document record (matches `label`). |
| `required` | Whether it is a must-have in the employer's package. |
| `manualFeasible` | `full` / `partial` / `no` — how much can be typed in by hand vs upload-only. |
| `schema` | The validation schema for both the AI-extracted and manually-entered shapes. |
| `agentSpecPath` | The markdown brief the AI extractor reads for that document. |
| `chunkStrategy` | Optional — split a large document (per sheet / per page) before extraction. |

**Scopes** a document can have: `required` (employer package), `applicable` (context document),
`pte` (the Pre-Tender Estimate), `ta` (a Tender Addendum), `ptc` (a clarification pack),
`bidder_submission` (a bidder's return), `ptc_response` (a bidder's clarification response).

**Manual feasibility** — `full` = every field has a form input; `partial` = some fields manual, the
rest need an upload; `no` = upload-only (the document is too large/structural to type, e.g. the BOQ
and the Specification).

**Two ways every field is filled.** A document is either *uploaded and machine-extracted* or
*filled in by hand*; both paths produce the **same validated field set**. The AI extractor returns a
nested, sometimes-messy verdict, which is flattened to the flat field shape shown in this document
before validation.

**The clause archive.** FOT, ITT, COC and SOPR each also carry a `clauses[]` list — every clause
kept **verbatim** as `{ ref, text }` — so any value can be traced back to the exact clause it came
from.

**Where the structured values land — three layers:**

1. The **flat fields** in this document (the validated subset) are written to **project columns** or
   to dedicated **child tables** (see §7).
2. The **full extraction verdict** (the complete, often larger field set — e.g. the ITT's ~80-field
   breakdown, the SOPR's full 553-page structure) is stored on the document record's
   `extracted_data`.
3. The **priced/structural documents** (BOQ, PTE, priced BOQ) are stored in the shared BOQ data
   model (§6).

---

## 2. Document catalogue (all categories at a glance)

| id | Label | Short | Scope | Required | Manual | Structure |
|---|---|---|---|---|---|---|
| `fot` | Form of Tender | FOT | required | yes | full | Structured fields (§3.1) |
| `itt` | Instructions to Tenderer | ITT | required | yes | full | Structured fields (§3.2) |
| `coc` | Conditions of Contract | COC | required | yes | partial | Structured fields (§3.3) |
| `sopr` | Schedule of Project Requirements | SOPR | required | yes | partial | Structured fields (§3.4) |
| `boq-template` | Blank BOQ / Pricing Schedule | BOQ-T | required | yes | no | BOQ data model (§3.5, §6) |
| `specification` | Technical Specification | SPEC | required | yes | no | CSI sections (§3.6) |
| `drawings-register` | Drawings Register | DR | required | yes | full | List (stub) (§3.7) |
| `pte` | Pre-Tender Estimate | PTE | pte | no | partial | Priced BOQ data model (§3.8, §6) |
| `addenda` | Tender Addenda | TA | ta | no | full | Addendum tables (§5) |
| `boq-priceset` | Priced BOQ | BOQ-P | bidder_submission | no | partial | Priced BOQ data model (§4.1, §6) |
| `cover-letter` | Cover Letter | CL | bidder_submission | no | full | Stub (§4.2) |
| `deviations` | Deviations register | Deviations | bidder_submission | no | no | Clause list (§4.3) |

The required employer package is FOT, ITT, COC, blank BOQ, SOPR, Drawings Register, and Technical
Specification. The optional/context documents are the PTE and Tender Addenda. The bidder-submission
documents are the Priced BOQ, Cover Letter, and Deviations register (plus the bidder's own FOT / ITT
/ COC / SOPR responses, which reuse the same specs — see §4.4).

---

## 3. Employer / tender-package documents

### 3.1 FOT — Form of Tender

The bidder's binding offer. In the employer's package this is the blank template; the bidder fills
the highlighted fields when responding.

| Field (key) | Type | Constraints | Source / meaning |
|---|---|---|---|
| `tendererCompanyId` | string | nullable | The tendering company (bidder-filled). |
| `tenderDate` | string (ISO date) | nullable | Date of the tender (bidder-filled). |
| `tenderSumFigures` | bigint (cents) | nullable | **Clause 1** — tender sum in figures. |
| `tenderSumWords` | string | nullable | **Clause 1** — tender sum in words (**words prevail per Clause 6**). |
| `currency` | string | AED / USD / EUR / GBP / SAR | **Clause 1** — tender currency. |
| `timesForCompletion[]` | array | one row per Section of the Works | **Clause 2** — see below. |
| `timesForCompletion[].label` | string | nullable | Section label. |
| `timesForCompletion[].days` | integer | ≥ 0, nullable | Calendar days for that section. |
| `timesForCompletion[].fromText` | string | nullable | Start reference (e.g. "Commencement Date"). |
| `timesForCompletion[].parallelText` | string | nullable | Parallel/qualifying note. |
| `validityDays` | integer | > 0, nullable | **Clause 4** — tender validity period. |
| `ohpMarkups.variationProvisionalPercent` | number | 0–100, nullable | **Clause 3** — OH&P % on variations / provisional sums. |
| `ohpMarkups.nominatedSubcontractorPercent` | number | 0–100, nullable | **Clause 3** — OH&P % on nominated subcontractors. |
| `ohpMarkups.buildersWorkNote` | string | nullable | **Clause 3** — builder's-work note. |
| `acknowledgedAddenda[]` | array | | **Clause 9** — addenda the bidder acknowledges. |
| `acknowledgedAddenda[].reference` | string | nullable | Addendum reference. |
| `acknowledgedAddenda[].dateOfIssue` | string (ISO date) | nullable | Date of issue. |
| `executionDate` | string (ISO date) | nullable | Execution date (bidder-filled). |
| `signatures[]` | array | one block per signatory; JV = one per member | Execution block. |
| `signatures[].inTheCapacityOf` | string | nullable | Capacity of the signatory. |
| `signatures[].name` | string | nullable | Signatory name. |
| `signatures[].dulyAuthorisedFor` | string | nullable | Party the signatory is authorised for. |
| `signatures[].witnessName` | string | nullable | Witness name. |
| `signatures[].witnessAddress` | string | nullable | Witness address. |
| `signatures[].witnessOccupation` | string | nullable | Witness occupation. |
| `signatures[].signatureImageUrl` | string | nullable | Signature image. |
| `signatures[].witnessSignatureImageUrl` | string | nullable | Witness signature image. |
| `clauses[]` | array of `{ ref, text }` | optional | Verbatim clause archive. |

### 3.2 ITT — Instructions to Tenderer

The submission rules. The flat fields below are the project-configuration subset; the full ~80-field
text breakdown is stored on the document's `extracted_data`.

| Field (key) | Type | Constraints | Source / meaning |
|---|---|---|---|
| `version` | string | optional | Document version. |
| `notificationOfIntentDays` | integer | ≥ 0 | **Cl. 4/5/6/7** — notification-of-intent window. |
| `addendaCutoffDays` | integer | ≥ 0 | Addenda cut-off (days before deadline). |
| `clarificationCutoffDays` | integer | ≥ 0 | Clarification cut-off (days before deadline). |
| `requiredValidityDays` | integer | > 0 | Required tender validity. |
| `currency` | enum | AED / USD / EUR / GBP / SAR | Tender currency. |
| `language` | string | optional | Language of the tender. |
| `vatTreatment` | enum | `exclusive` / `inclusive` | VAT treatment. |
| `alternativeTenderAllowed` | boolean | optional | **Clause 16** — alternative tenders permitted. |
| `reraTrustAccountRequired` | boolean | optional | **Clause 14A** — RERA trust account required. |
| `bondsPerformanceRequired` | boolean | optional | **Clause 15** — performance bond required. |
| `bondsAdvancePaymentRequired` | boolean | optional | **Clause 15** — advance-payment bond required. |
| `approvedBondBanks[]` | string[] | optional | **Clause 15** — approved bond-issuing banks. |
| `submissionSchedules[]` | array | A1–A17 | **Clause 8.1** — seeds the Step 5 compliance matrix. |
| `submissionSchedules[].id` | string | required | Schedule id (e.g. "A1"). |
| `submissionSchedules[].name` | string | required | Schedule name (e.g. "Preliminary Programme"). |
| `submissionSchedules[].format` | string | optional | Required format (e.g. "Primavera P6"). |
| `engineerName` | string | optional | **Appendix A** — engineer. |
| `documentPriorityOrder[]` | string[] | optional | **Appendix A** — priority of documents (highest first). |
| `arithmeticErrorAdjustToBoqTotal` | boolean | optional | **Cl. 18.2(a)** — errors amended through to the BOQ total. |
| `arithmeticErrorLockIfBqHigher` | boolean | optional | **Cl. 18.2(b)** — tender sum locked if the bill is higher. |
| `arithmeticErrorAdjustIfBqLower` | boolean | optional | **Cl. 18.2(c)** — tender sum adjusted down if the bill is lower. |
| `clauses[]` | array of `{ ref, text }` | optional | Verbatim clause archive. |

> The three `arithmeticError…` flags define the **arithmetic-error policy** the report's adjustments
> honour when correcting a bidder's extension mistakes.

### 3.3 COC — Conditions of Contract

The Particular Conditions. The full clause body is stored on `extracted_data`.

| Field (key) | Type | Constraints | Source / meaning |
|---|---|---|---|
| `contractFormCode` | string | optional | Contract form code. |
| `contractForm` | enum | `fidic-red` / `fidic-yellow` / `nec` / `bespoke` | Contract form family. |
| `contractFormVersion` | string | optional | Form version. |
| `contractSumCents` | bigint (cents) | nullable | Contract sum (post-award; blank in template). |
| `engineerName` | string | optional | Engineer. |
| `governingLaw` | string | optional | Governing law. |
| `disputeForum` | string | optional | Dispute forum / jurisdiction. |
| `language` | string | optional | Language of communication. |
| `timesForCompletion[]` | array of `{ label, days }` | days int ≥ 0 | Cross-checked against FOT Clauses 1 & 2. |
| `advancePaymentPercent` | number | 0–100 | Advance payment %. |
| `advancePaymentBondPercent` | number | 0–100 | Advance-payment bond %. |
| `performanceBondPercent` | number | 0–100 | Performance bond %. |
| `retentionPercent` | number | 0–100 | Retention %. |
| `retentionCapCents` | bigint (cents) | nullable | Retention cap (amount). |
| `retentionCapPercent` | number | 0–100 | Retention cap (% of contract sum). |
| `ldPerDayCents` | bigint (cents) | nullable | **Liquidated damages** per day. |
| `ldCapCents` | bigint (cents) | nullable | LD cap (amount). |
| `ldCapPercent` | number | 0–100 | LD cap (% of contract sum). |
| `dlpMonths` | integer | > 0 | **Defects Liability Period** (months). |
| `decennialLiabilityYears` | integer | > 0 | Decennial liability (years). |
| `fixedPrice` | boolean | optional | **Clause 31.1** — fixed price. |
| `documentPriorityOrder[]` | string[] | optional | **Clause 4.3** — cross-checked vs ITT Appendix A. |
| `insuranceMachineryAllRisksMinCents` | bigint (cents) | nullable | **App. E/F/G** — machinery all-risks minimum. |
| `insuranceWorkmensCompMinCents` | bigint (cents) | nullable | Workmen's-comp minimum. |
| `insuranceContractorAllRiskMinCents` | bigint (cents) | nullable | Contractor's all-risk minimum. |
| `clauses[]` | array of `{ ref, text }` | optional | Verbatim clause archive. |

### 3.4 SOPR — Schedule of Project Requirements

The works-and-site requirements. The flat fields below are the manual-fillable subset of a large
document; phases, the responsibility matrix, compliance templates, and close-out items are also
written to dedicated child tables (§7), and the full structure lands on `extracted_data`.

| Field (key) | Type | Constraints | Source / meaning |
|---|---|---|---|
| `district` | string | optional | District / sub-project. |
| `commencementSubmissions[]` | array | | **§2.1(ix)** — items due after commencement. |
| `commencementSubmissions[].id` | string | required | Item id. |
| `commencementSubmissions[].label` | string | required | Item description. |
| `commencementSubmissions[].daysAfterCommencement` | integer | ≥ 0 | Due within N days of commencement. |
| `sectionsOfTheWorks[]` | array | | **§2.2** — cross-checked vs FOT Cl.2 + COC. |
| `sectionsOfTheWorks[].milestone` | integer | > 0 | Milestone number. |
| `sectionsOfTheWorks[].sectionName` | string | required | Section name. |
| `sectionsOfTheWorks[].timeForCompletionDays` | integer | > 0 | Time for completion (days). |
| `sectionsOfTheWorks[].startReference` | string | optional | Start reference. |
| `sectionsOfTheWorks[].finishReference` | string | optional | Finish reference. |
| `ambientTempMaxC` / `ambientTempMinC` | number | optional | **§3.1** — ambient temperature range (°C). |
| `relativeHumidityMaxPct` | number | optional | Max relative humidity (%). |
| `seawaterTempMaxC` / `seawaterTempMinC` | number | optional | Seawater temperature range (°C). |
| `windGust3sec50yrMs` | number | optional | 3-sec gust, 50-yr (m/s). |
| `seismicIntensity` | string | optional | Seismic intensity. |
| `workingHoursStart` / `workingHoursEnd` | string (HH:MM) | optional | **§6.12** — working hours. |
| `weekendWorkAllowed` | boolean | optional | Weekend work permitted. |
| `programmeSoftware` | string | optional | **§9** — programme software. |
| `progressReportFrequency` | string | optional | Progress-report frequency. |
| `qmsStandard` | string | optional | QMS standard (e.g. ISO 9001). |
| `phases[]` | array | | **Appendix A** — project phases. |
| `phases[].phaseId` / `.name` | string | required | Phase id / name. |
| `phases[].startMilestone` / `.finishMilestone` | string | optional | Start / finish milestone. |
| `responsibilityMatrixRows[]` | array | | **Appendix G** — who prices/provides each item. |
| `responsibilityMatrixRows[].category` | string | required | Category. |
| `responsibilityMatrixRows[].ref` | string | required | Reference (e.g. "1.7"). |
| `responsibilityMatrixRows[].itemLabel` | string | required | Item. |
| `responsibilityMatrixRows[].responsibility` | string | required | Responsible party (GC / PS / EM …). |
| `responsibilityMatrixRows[].pricingNote` | string | optional | Pricing note. |
| `bimLodLevel` / `bimPlatform` / `commonDataEnvironment` | string | optional | **Appendix H** — BIM requirements. |
| `technicalDeliverables[]` | array | | **Appendix M** — each row seeds a compliance criterion. |
| `technicalDeliverables[].scheduleId` / `.scheduleLabel` | string | required | Deliverable id / name. |
| `technicalDeliverables[].formatRequired` / `.submissionWindow` | string | optional | Format / window. |
| `cpiThresholdMin` / `spiThresholdMin` | number | optional | **Appendix N** — earned-value thresholds. |
| `sustainabilityCertification` / `…Level` | string | optional | **Appendix R** — sustainability target. |
| `clauses[]` | array of `{ ref, text }` | optional | Verbatim clause archive. |

### 3.5 Blank BOQ / Pricing Schedule

The empty priced schedule issued to bidders — thousands of items across many sheets. Upload-only
(too large to type). Structurally it is a **BOQ template** (sections + items, no rates) in the shared
BOQ data model (§6). When parsed from the workbook, each row is read into the six canonical columns:

| Column | Meaning |
|---|---|
| `itemRef` | Item reference (≤ 6 chars). |
| `description` | Item description (a running parent heading is prefixed to each leaf). |
| `quantity` | Planned quantity. |
| `unit` | Unit of measure. |
| `rate` | Unit rate (blank in the employer's template). |
| `amount` | Extended amount (blank in the employer's template). |

A real header is only recognised when at least `itemRef`, `description`, `quantity`, and `unit` are
present; the currency is read from the rate/amount column label (e.g. "Rate AED" → AED). Sections
carry a **pricing mode** of `measured` or `general_req` (preliminaries / OH&P / contingencies),
which the analysis uses to separate measured-works rates from general-requirements rates.

### 3.6 Technical Specification

CSI MasterFormat (or NBS / bespoke), 20+ sections × 3 parts. Upload-only. Stored across three tables:

**Specification document**

| Field | Type | Meaning |
|---|---|---|
| `discipline` | enum | `architectural` / `landscape` / `structural` / `mep` / `civil` / `combined`. |
| `format` | enum | `csi-masterformat` / `nbs` / `bespoke`. |
| `author`, `issuedAt`, `version`, `projectCode` | string | Document identity. |
| `sectionsTotal` | integer | Number of sections. |
| `divisionsUsed` | json | CSI divisions used. |

**Specification section** (one per CSI section)

| Field | Type | Meaning |
|---|---|---|
| `csiCode` | string | CSI section code. |
| `csiDivision` | string | CSI division. |
| `title` | string | Section title. |
| `pageCount` | integer | Pages. |
| `references` / `relatedSections` / `submittals` / `warranty` | json | Section metadata. |
| `part1Text` / `part2Text` / `part3Text` | text | The CSI 3-part body (General / Products / Execution). |

**Approved manufacturer** (per section)

| Field | Type | Meaning |
|---|---|---|
| `sectionCode` | string | Owning section. |
| `product` | string | Product. |
| `manufacturer` | string | Manufacturer. |
| `model` | string | Model. |
| `countryOfOrigin` | string | Country of origin. |
| `alternatives` | json | Permitted alternatives. |

### 3.7 Drawings Register

The list of issued drawings. Manual entry (bulk-paste / CSV planned); the structured schema is a
**stub** pending a later ticket. Note: the **drawings themselves are never stored or parsed** — only
their filenames are tracked (including inside addenda).

### 3.8 PTE — Pre-Tender Estimate

The QS's own internal cost estimate; the confidential **reference benchmark** for the employer-facing
comparison. Uploaded as a priced workbook. Structurally it is a **priceset** in the BOQ data model
(§6) with owner kind `estimate` — i.e. the same item structure as the BOQ, carrying the QS's rates
and amounts instead of a bidder's. Its rows are entity-matched to the project BOQ so the comparison
can pivot by item even when sheets are renumbered.

---

## 4. Bidder-submission documents

### 4.1 Priced BOQ

The bidder's priced return. Structurally a **priceset** (owner kind `submission`) over the project's
BOQ template (§6). Parsing matches every submitted row to a project BOQ item and writes one rate row
per match:

| Field | Type | Meaning |
|---|---|---|
| `unitRateCents` | bigint (cents) | The bidder's unit rate (null when unpriced). |
| `amountCents` | bigint (cents) | The bidder's extended amount. |
| `isUnpriced` | boolean | The item was left without a rate. |
| `isArithmeticalError` | boolean | The stated amount ≠ rate × quantity. |
| `normalisedRateCents` | bigint (cents) | A filled rate for unpriced items (when normalisation is applied). |

The parse also yields, per submission: match rate, priced/unpriced counts, unmatched rows, BOQ items
missing from the submission, and the **tender sum** (total of priced amounts).

### 4.2 Cover Letter

The bidder's transmittal letter. Manual entry; the structured schema is a **stub**. In practice the
AI extractor reads the cover letter for stated tender sum, validity, and exceptions, and it is one of
the documents scanned for deviations (§4.3).

### 4.3 Deviations register

Not structured fields but a **list of clauses** the bidder amended, added, or qualified relative to
the tender requirements. Extracted by an AI agent from any bidder document that may carry deviations
(cover letter, FOT, technical/commercial submittals).

| Field (key) | Type | Constraints | Meaning |
|---|---|---|---|
| `deviations[]` | array | default `[]` | One entry per deviation clause. |
| `deviations[].kind` | enum | `commercial` / `technical` / `contractual` | Deviation classification. |
| `deviations[].clause` | string | 1–200 chars | Short heading (e.g. "Payment terms"). |
| `deviations[].snippet` | string | ≤ 2000 chars, nullable | Verbatim excerpt for quick QS verification. |
| `deviations[].severity` | enum | `minor` / `major`, default `minor` | Severity. |
| `deviations[].references[]` | array | default `[]` | Source pointers. |
| `deviations[].references[].documentSection` | string | nullable | Section in the bidder doc. |
| `deviations[].references[].page` | integer | > 0, nullable | Page. |

Extraction runs **per sheet** for workbooks (bidder workbooks span 6–10 sheets), and the per-sheet
results are merged by deduping on `kind` + lower-cased clause heading, keeping the longest snippet.

### 4.4 Bidder FOT / ITT / COC / SOPR responses

A bidder may also submit its own Form of Tender, ITT response, COC amendments, and SOPR response.
These **reuse the same specs and field structures** as §3.1–3.4, but are stored against the tenderer
(scope `bidder_submission`) rather than the project — so the evaluation can compare the bidder's FOT
field-for-field against the employer's FOT requirements.

---

## 5. Tender Addenda (structure)

An addendum is an employer-issued revision to the tender package during the tender period, ingested
as a (often nested, password-protected) archive. Three tables capture it.

**Addendum**

| Field | Type | Meaning |
|---|---|---|
| `no` | string | Addendum number (e.g. "TA1"). |
| `issuedAt` | date | Issue date. |
| `status` | enum | `parsed` / `applied` / `withdrawn`. |
| `coverFileId` | string | The cover file. |
| `introText` | text | Intro text from the cover. |
| `scopeSummary` | json | What changed: `{ boqReplaceFull, boqReplacePartial, soprAmend, specAmend, drawingsAmend, tqResponses }`. |
| `sourceZipFilename` / `sourceZipSha256` | string | Source archive + hash. |
| `appliedAt` / `appliedByUserId` | timestamp / string | When/who applied it. |

**Addendum file** (one per file inside the archive)

| Field | Type | Meaning |
|---|---|---|
| `kind` | enum | `cover` / `boq_full` / `boq_sheet` / `sopr_supplement` / `spec` / `drawing_ref` / `qa_attachment` / `screenshot` / `password` / `other`. |
| `filename` / `relativePath` | string | Name / path inside the archive. |
| `blobUrl` | string | Stored blob (null for drawings — they are not stored). |
| `sizeBytes` / `sha256` | bigint / string | Size / hash. |
| `isDrawing` | boolean | Flagged as a drawing (filename tracked only). |

**Addendum query** (the tenderer-query Q&A table on the cover)

| Field | Type | Meaning |
|---|---|---|
| `queryNo` | string | Query number. |
| `queryText` | text | The query. |
| `referenceRaw` | string | Raw reference (e.g. "Bill No 2P3, Page 3, Item A"). |
| `referenceParsed` | json | Parsed `{ billNo, partName, page, itemLetter, itemDetail }`. |
| `resolvedItemId` | string | The BOQ item the reference resolves to. |
| `responseText` | text | The employer's response. |
| `derivedEvents` | json | Change events detected from the response (withdrawn / quantity / description). |
| `applied` / `appliedAt` | boolean / timestamp | Whether the change has been applied. |

---

## 6. The BOQ data model (the shared spine)

The blank BOQ (§3.5), the PTE (§3.8), and each bidder's priced BOQ (§4.1) are all expressed in one
five-level structure. The **template + sections + items** describe *what* is being priced; a
**priceset + item rates** describe *one party's prices* for it.

| Level | Holds | Key fields |
|---|---|---|
| **Template** | One BOQ structure | `name`, `ownerKind` (`project` / `workspace`), `currency`, `sourceDocumentId`. |
| **Section** | A bill/section | `no`, `label`, `pricingMode` (`measured` / `general_req`), `position`. |
| **Item** | A priced line | `no`, `label`, `unit`, `quantityPlanned`, `notes`, `entityOriginEventId`. |
| **Priceset** | One party's pricing | `ownerKind` (`submission` / `estimate` / `baseline`), `ownerId`, `label`, `currency`. |
| **Item rate** | One rate in a priceset | `unitRateCents`, `amountCents`, `isUnpriced`, `isArithmeticalError`, `normalisedRateCents`. |

So: the **blank BOQ** is a template with items and no rates; the **PTE** is a priceset of owner kind
`estimate`; a **bidder's priced BOQ** is a priceset of owner kind `submission`; a computed
**baseline** can be a priceset of owner kind `baseline`. All three sit on the same items, which is
what makes the cross-document, item-by-item comparison possible.

Changes to items over time (added / withdrawn / quantity changed / description changed / unit changed
/ priced) are recorded as an **append-only event log** per item, sourced from BOQ import, PTE import,
addendum, or manual edit — so the effective state of any item is its base row with its events
replayed.

---

## 7. Where the extracted values are stored

**Project record (the canonical contract configuration).** The flat FOT/ITT/COC/SOPR fields are
written onto the project record, grouped by source:

- *Step 1 (manual):* name, currency, city, country, project type; basis of tender, conditions of
  contract, GFA, BUA, budget; project lead, procurement lead, tender coordinator; tender issued /
  original return / adjusted return dates.
- *From ITT:* required validity days, addenda & clarification cut-off days, VAT treatment, engineer,
  document priority order, approved bond banks, alternative-tender-allowed, RERA trust account,
  language.
- *From COC:* contract form / code / version, contract sum, governing law, dispute forum, advance
  payment % and bond %, performance bond % and required flag, retention % and caps, LDs per day and
  caps, DLP months, decennial-liability years, fixed-price flag.
- *From SOPR + COC insurance appendices (as JSON):* insurance minimums, working hours, site
  conditions, material standards, BIM requirements, earned-value config, HSE requirements,
  sustainability config, master-community policy, security requirements, reporting frequency.

**Child tables.** SOPR also populates dedicated tables: project phases; the responsibility matrix
(`responsibleBy` = `{ gc, ps1, ps2, em, em_dc }`); compliance-record templates
(`sectionCode`, `criterionCode/Label`, `expectedValue`, `sourceRef` e.g. "SOPR §9.1" /
"ITT Clause 8.1.A1", `submissionMandatory`, `submissionWindow`, `formatRequired`,
`acceptanceCriterion`) — these seed the Step 5 compliance matrix; and Appendix J close-out items. The
Specification populates its three tables (§3.6); Addenda populate theirs (§5).

**Full verdict.** The complete extraction — every field, including the parts beyond the flat schema
(the ITT's full ~80-field breakdown, the SOPR's full structure, every clause body) — is stored on the
document record's `extracted_data`.

**Priced/structural documents** live entirely in the BOQ data model (§6).

---

## 8. Notes & naming caveats

- **PTE** is *Pre-Tender Estimate* (id `pte`, category "Pre-Tender Estimate"). One UI label elsewhere
  reads "Post Tender Estimate" — same document, the "Pre-Tender Estimate" expansion is correct.
- **PTC** (`ptc` / `ptc_response` scopes) is *Post-Tender Clarification*. Note a bidder's Priced BOQ
  slot is sometimes labelled "PTC" in the bidder-intake screens — that is the priced return
  (`boq-priceset`), not a clarification.
- The **`clauses[]` archive** on FOT/ITT/COC/SOPR is the verbatim source-of-truth behind every
  extracted field; treat the flat fields as the structured index over it.
- Several specs are **stubs** (Drawings Register, Cover Letter): the category, scope, and storage
  exist, but the detailed field schema is pending — they currently store the document and rely on AI
  extraction / later manual entry rather than a fixed field set.

---

## 9. Related documents

- `procurex-study.md` — what each step of the ProcureX workflow does with these documents (purpose,
  comparison math, review sections, report, PTC rounds).
