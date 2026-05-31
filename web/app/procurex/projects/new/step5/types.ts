export type RoundKey = "initial" | "ptc1" | "ptc2" | "ptc3"

export type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "missing"

export interface Bidder {
  id: string
  shortName: string
  fullName: string
  rank: number
  selected?: boolean
}

export interface BidderSummary extends Bidder {
  tenderSum: number // millions
  ptcSum: number // millions
  variancePct: number
  isLowest?: boolean
  chips: string[]
}

export interface ComplianceCell {
  status: ComplianceStatus
  label?: string
}

export interface ComplianceRow {
  bidderId: string
  fotSubmission: ComplianceCell
  timeForCompletion: ComplianceCell
  ohpMarkup: ComplianceCell
  tenderValidity: ComplianceCell
  signatures: ComplianceCell
}

export interface TenderReturnRow {
  bidderId: string
  /** Original Tender Sum — the bidder's submitted total (raw). */
  tenderSum: number
  /** Corrected Tender Sum — after QS arithmetical corrections. */
  adjustedSum: number
  /** Percent variance vs the chosen baseline (PTE / Avg / Median / …). */
  variancePct: number
  /** Percent variance vs the lowest bidder. Negative for the lowest. */
  pctFromLowest: number
  pricedItems: number
  unpricedItems: number
  /** Items excluded by the bidder ("By others / By client / Excluded"). */
  excludedCount: number
  arithmeticalErrors: number
  highRates: number
  lowRates: number
  /** One-line summary the QS records next to the row. */
  keyIssues?: string
  notes?: string
}
