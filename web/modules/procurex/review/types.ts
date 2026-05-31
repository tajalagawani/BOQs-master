/**
 * Types shared between the per-bidder review server action
 * (`getBidderReviewData`) and the review UI in
 * `app/projects/[projectId]/review/[bidderId]/`.
 *
 * Three things to remember:
 *
 * 1. Every cell on the bidder review page is a `CellValue` — never a
 *    raw string. That forces every section to be explicit about
 *    whether the data is real, missing, or not yet implemented.
 *
 * 2. `not_implemented` means STEP 2 has no agent/field for this signal
 *    yet (e.g., Tender Bond — no spec exists). It is a build-time gap,
 *    not a data-time gap. The QS sees a slate pill labelled "Not
 *    implemented" so the audit of "what we have vs what we don't" is
 *    self-documenting.
 *
 * 3. `missing` means the BIDDER hasn't uploaded that doc yet — we
 *    would know the answer if they did. Renders as an amber pill.
 *
 * Sections themselves are NEVER removed. If a section is fully
 * unimplemented (Tender Bond, Value Engineering, Form of Maintenance),
 * every cell is `not_implemented` so the section still renders.
 */

export type CellTone = "success" | "danger" | "warning" | "neutral"

export type CellValue =
  /** Real value extracted/derived from project + bidder data. */
  | { kind: "value"; text: string; tone: CellTone }
  /** Bidder hasn't submitted the underlying doc yet — answer is
   *  unknowable until they upload. */
  | { kind: "missing" }
  /** Step 2 has no extractor for this field yet. Build-time gap. */
  | { kind: "not_implemented" }

export interface BidderRow {
  /** Stable id — tenderer id from `tenderer.id`. */
  bidderId: string
  /** Human-readable bidder name to render in the leftmost column. */
  bidderName: string
  /** One CellValue per column header in the section's `columns` array
   *  (so cells.length === columns.length). */
  cells: CellValue[]
  /** Optional QS comment seeded from any persisted text — currently
   *  always null; the textarea state is local-only until we add a
   *  `tender_qs_comment` table. */
  qsComment?: string | null
  /** Whether this bidder is currently flagged "Include in PTC". Local
   *  toggle only today; persistence is `not_implemented`. */
  includeInPtc?: boolean
}

/**
 * The per-section payload returned from `getBidderReviewData`. Each
 * section's UI consumes its `rows`; the rest (title, description,
 * criteria card copy) stays in the section component since it's
 * static design content.
 *
 * `sectionKey` is the stable id used by `tender_review_row` so the
 * client can persist QS comments / Include-in-PTC toggles against the
 * right (tendererId, sectionKey) pair.
 */
export interface ReviewSectionRows {
  sectionKey: ReviewSectionKey
  rows: BidderRow[]
}

/** Stable section ids — also the values of `tender_review_row.section_key`. */
export type ReviewSectionKey =
  | "fot"
  | "tac"
  | "sigauth"
  | "boqs"
  | "tender-docs"
  | "bond"
  | "addenda"
  | "ve"
  | "maint"
  | "qual"

export interface BidderHeader {
  id: string
  code: string
  name: string
  /** Original tender sum (bigint-as-string, AED cents) — null when no
   *  submission has been applied for this bidder yet. */
  tenderSumCents: string | null
  /** QS-corrected tender sum (cents) — null when not corrected yet. */
  adjustedSumCents: string | null
  /** Rank — populated from the project's leaderboard when we add one;
   *  null until then. */
  rank: number | null
}

/** Per-bidder row data for Section D's "Unpriced / Incomplete Items"
 *  sub-table. Mirrors `UnpricedIncompleteRow` on the client component
 *  so the wire payload and the UI prop share a shape. */
export interface BoqUnpricedRow {
  id: string
  itemRef: string
  boqItem: string
  unit: string
  quantity: string
  tendererEntry: "Included" | "Excluded" | "By others" | "By client"
  impactAed: string
  impactWarning?: boolean
  instruction?: "Price item" | "Missing unit rate" | "Missing price"
  includeInPtc: boolean
}

export interface BoqUnpriced {
  included: BoqUnpricedRow[]
  excluded: BoqUnpricedRow[]
}

/** Arithmetical Errors sub-table row — Section D Figma 1292:47192. */
export interface BoqArithmeticalErrorRow {
  id: string
  itemRef: string
  description: string
  document: string
  expected: string
  found: string
  difference: string
  includeInPtc: boolean
}

/** Per-row High/Low-rate analysis row — Section D. */
export interface BoqRateAnalysisRow {
  id: string
  itemRef: string
  description: string
  unit: string
  rateCents: string
  baselineCents: string | null
  variancePct: number | null
  includeInPtc: boolean
}

export interface BoqReviewSubtables {
  arithmetical: BoqArithmeticalErrorRow[]
  highRates: BoqRateAnalysisRow[]
  lowRates: BoqRateAnalysisRow[]
  /** General-requirements high/low rate flags — same row shape, but
   *  filtered to sections where `pricing_mode = 'general_req'`. Drives
   *  Section D's "General Requirements — High / Low rates" block. */
  generalRequirementsRates: {
    high: BoqRateAnalysisRow[]
    low: BoqRateAnalysisRow[]
  }
}

/** Per-bidder deviation row — Section J sub-tables. */
export interface BidderDeviation {
  id: string
  ref: string
  statement: string
  qsResponse: string
  severity: "minor" | "major"
  includeInPtc: boolean
}

export interface BidderDeviationsBuckets {
  contractual: BidderDeviation[]
  commercial: BidderDeviation[]
  technical: BidderDeviation[]
}

/**
 * Canonical FOT shape — five buckets that map 1:1 onto the bidder
 * review page's Section A columns and onto the FOT extractor's prompt
 * sections. Both the project-side requirements and each bidder's
 * submission share this shape so callers can render them side-by-side
 * without translating field-by-field.
 *
 * Groups:
 *   1. fotSubmission     → Clause 1 + identity (tender sum, currency, dates)
 *   2. timeForCompletion → Clause 2 (sections + days)
 *   3. ohpMarkup         → Clause 3 (OHP percentages)
 *   4. tenderValidity    → Clause 4 + Clause 9 (validity + addenda)
 *   5. signatures        → execution block + signatures
 */

export interface FotSubmissionGroup {
  /** Date the FOT was issued / signed. */
  tenderDate: string | null
  /** Tender currency (e.g. AED). */
  currency: string | null
  /** Lump-sum tender amount in cents (bigint serialised as string for
   *  client safety). Null when blank (e.g. on the issued template). */
  tenderSumCents: string | null
  /** Tender sum in words. */
  tenderSumWords: string | null
  /** Tenderer legal company id (UUID) when picked. */
  tendererCompanyId: string | null
}

export interface TimeForCompletionGroup {
  sections: Array<{
    label: string
    days: number
    fromText: string | null
    parallelText: string | null
  }>
  /** Sum of all section days (excluding the DNP if any). Null when
   *  the FOT didn't enumerate any sections. */
  totalDays: number | null
}

export interface OhpMarkupGroup {
  variationProvisionalPercent: number | null
  nominatedSubcontractorPercent: number | null
  buildersWorkNote: string | null
}

export interface TenderValidityGroup {
  validityDays: number | null
  acknowledgedAddenda: Array<{ reference: string; dateOfIssue: string | null }>
}

export interface SignatureBlock {
  inTheCapacityOf: string | null
  name: string | null
  dulyAuthorisedFor: string | null
  witnessName: string | null
  witnessAddress: string | null
  witnessOccupation: string | null
  signatureImageUrl: string | null
  witnessSignatureImageUrl: string | null
}

export interface SignaturesGroup {
  executionDate: string | null
  blocks: SignatureBlock[]
}

/** Canonical grouped FOT verdict shared by project + bidder sides. */
export interface FotGrouped {
  fotSubmission: FotSubmissionGroup
  timeForCompletion: TimeForCompletionGroup
  ohpMarkup: OhpMarkupGroup
  tenderValidity: TenderValidityGroup
  signatures: SignaturesGroup
}

/** Aliases so callers read clearly at the call site. Both are the
 *  same grouped shape — the difference is whose FOT it came from. */
export type ProjectFotRequirements = FotGrouped
export type BidderFotSubmission = FotGrouped

/**
 * Section B (Conditions of Contract) shape — two groups matching the
 * UI's two criteria columns. Project COC values are extracted from the
 * project's own COC doc; bidder side carries the bidder's own COC
 * verdict (rare) plus deviation counts (the normal compliance signal).
 */
export interface CocTermsGroup {
  contractForm: string | null
  contractFormCode: string | null
  contractFormVersion: string | null
  governingLaw: string | null
  disputeForum: string | null
  language: string | null
  engineerName: string | null
  dlpMonths: number | null
  decennialLiabilityYears: number | null
  fixedPrice: boolean | null
  documentPriorityOrder: string[]
}

export interface CocPaymentTermsGroup {
  advancePaymentPercent: number | null
  advancePaymentBondPercent: number | null
  performanceBondPercent: number | null
  retentionPercent: number | null
  /** Bigint cents serialised as string for client safety. */
  retentionCapCents: string | null
  retentionCapPercent: number | null
  ldPerDayCents: string | null
  ldCapCents: string | null
  ldCapPercent: number | null
}

export interface CocGrouped {
  termsAndConditions: CocTermsGroup
  paymentTerms: CocPaymentTermsGroup
}

export type ProjectCocRequirements = CocGrouped

export interface BidderCocStanding {
  /** The bidder's own COC verdict if they submitted a re-execution.
   *  Null when they didn't — most bidders only submit deviations. */
  cocVerdict: CocGrouped | null
  /** Counts of `tender_deviation` rows attributed to this bidder per
   *  COC-relevant kind. */
  deviationCounts: {
    commercial: number
    contractual: number
  }
}

export interface BidderReviewData {
  projectId: string
  /** Real project name from the `projects` table. */
  projectName: string
  /** All tenderers on the project — drives the row order across every
   *  section so they read left-to-right consistently. */
  tenderers: Array<{ id: string; code: string; name: string }>
  /** Real header values for the currently-viewed bidder. Null when the
   *  url's bidderId doesn't match any tenderer on this project. */
  currentBidder: BidderHeader | null

  /** Section A — FORM OF TENDER */
  formOfTender: ReviewSectionRows
  /** Section B — TERMS AND CONDITIONS */
  termsAndConditions: ReviewSectionRows
  /** Section C — SIGNATURE AUTHORITY */
  signatureAuthority: ReviewSectionRows
  /** Section D — BILLS OF QUANTITIES */
  billsOfQuantities: ReviewSectionRows
  /** Section E — TENDER DOCUMENTS */
  tenderDocuments: ReviewSectionRows
  /** Section F — TENDER BOND */
  tenderBond: ReviewSectionRows
  /** Section G — TENDER ADDENDA */
  tenderAddenda: ReviewSectionRows
  /** Section H — VALUE ENGINEERING / SCHEDULE OF ALTERNATIVES */
  valueEngineering: ReviewSectionRows
  /** Section I — FORM OF MAINTENANCE AGREEMENT */
  formOfMaintenance: ReviewSectionRows
  /** Section J — TENDERERS QUALIFICATION / CLARIFICATIONS */
  tenderersQualification: ReviewSectionRows
  /** Section D sub-table — Unpriced / Incomplete Items per Figma
   *  1279:61031. Populated from boq_item_rate (is_unpriced=true)
   *  joined to boq_item. */
  boqUnpriced: BoqUnpriced
  /** Section D sub-tables — Arithmetical Errors + High/Low rate
   *  analysis. Populated from tender_flag joined to boq_item. */
  boqReview: BoqReviewSubtables
  /** Section J sub-tables — bidder's contractual / commercial /
   *  technical deviations from `tender_deviation`. */
  bidderDeviations: BidderDeviationsBuckets
  /** Section A baseline — extracted from the project's own FOT doc.
   *  Null when the project FOT hasn't been extracted yet. */
  projectFotRequirements: ProjectFotRequirements | null
  /** Section A submitted values for the CURRENT bidder. Null when the
   *  bidder hasn't uploaded an FOT yet OR no successful run yet. */
  bidderFotSubmission: BidderFotSubmission | null
  /** Section B baseline — extracted from the project's own COC doc.
   *  Null when the project COC hasn't been extracted yet. */
  projectCocRequirements: ProjectCocRequirements | null
  /** Section B standing for the CURRENT bidder — their COC verdict
   *  (typically null) + deviation counts (commercial + contractual). */
  bidderCocStanding: BidderCocStanding | null
  /** Section E baseline — five required tender doc categories and
   *  whether each is uploaded on the project. */
  projectTenderDocuments: ProjectTenderDocuments
  /** Section G baseline — issued addenda on the project (scope=ta). */
  projectAddenda: ProjectAddenda
  /** Section G standing for the CURRENT bidder — how many addenda
   *  they acknowledged in their FOT, plus a signed flag. */
  bidderAddendaStanding: BidderAddendaStanding | null
}

/**
 * Section E (Tender Documents) — project doc presence per category.
 */
export interface TenderDocPresence {
  count: number
  documentId: string | null
  filename: string | null
}

export interface ProjectTenderDocuments {
  itt: TenderDocPresence
  coc: TenderDocPresence
  sopr: TenderDocPresence
  drawings: TenderDocPresence
  specifications: TenderDocPresence
}

/**
 * Section G (Tender Addenda) — project addenda + bidder acknowledgement.
 */
export interface ProjectAddendum {
  id: string
  filename: string
  ref: string
  createdAt: Date
}

export interface ProjectAddenda {
  rows: ProjectAddendum[]
  count: number
}

export interface BidderAddendaStanding {
  project: ProjectAddenda
  acknowledgedCount: number
  acknowledgedRefs: string[]
  signed: boolean
}

/** Convenience constructor — `notImpl(n)` returns an array of n
 *  `not_implemented` cells. Saves boilerplate in section builders. */
export function notImpl(n: number): CellValue[] {
  return Array.from({ length: n }, () => ({ kind: "not_implemented" }) as CellValue)
}

/** Convenience for "bidder didn't submit this doc" rows. */
export function missing(n: number): CellValue[] {
  return Array.from({ length: n }, () => ({ kind: "missing" }) as CellValue)
}
