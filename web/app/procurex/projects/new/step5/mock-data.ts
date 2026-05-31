import type {
  Bidder,
  BidderSummary,
  ComplianceRow,
  TenderReturnRow,
} from "./types"

export const BIDDERS: Bidder[] = [
  {
    id: "orion",
    shortName: "Orion",
    fullName: "Orion Property Group",
    rank: 1,
    selected: true,
  },
  {
    id: "stratus",
    shortName: "Stratus",
    fullName: "Stratus Infrastructure Group",
    rank: 2,
    selected: true,
  },
  {
    id: "helix",
    shortName: "Helix",
    fullName: "Helix MEP Solutions LLC",
    rank: 3,
  },
  {
    id: "linea",
    shortName: "Linea",
    fullName: "Linea Interiors Group",
    rank: 4,
  },
  {
    id: "crestline",
    shortName: "Crestline",
    fullName: "Crestline Advisory Partners",
    rank: 5,
    selected: true,
  },
  {
    id: "axis",
    shortName: "Axis",
    fullName: "Axis Structural Engineers GmbH",
    rank: 6,
  },
]

export const BIDDER_SUMMARIES: BidderSummary[] = [
  {
    ...BIDDERS[0],
    tenderSum: 11.88,
    ptcSum: 10.57,
    variancePct: -2.4,
    isLowest: true,
    chips: ["Lowest tender", "Most commercially compliant", "ISO 9001"],
  },
  {
    ...BIDDERS[1],
    tenderSum: 12.45,
    ptcSum: 12.22,
    variancePct: 1.7,
    chips: ["Most technically compliant", "ISO 9001", "Safety"],
  },
  {
    ...BIDDERS[2],
    tenderSum: 13.20,
    ptcSum: 13.19,
    variancePct: 7.8,
    chips: ["MEP specialist", "Local presence"],
  },
  {
    ...BIDDERS[3],
    tenderSum: 13.18,
    ptcSum: 13.32,
    variancePct: 7.6,
    chips: ["Interiors", "Green Build"],
  },
  {
    ...BIDDERS[4],
    tenderSum: 14.10,
    ptcSum: 14.01,
    variancePct: 15.1,
    chips: ["Advisory", "Experience"],
  },
  {
    ...BIDDERS[5],
    tenderSum: 15.28,
    ptcSum: 15.28,
    variancePct: 24.7,
    chips: ["Structural", "EU presence"],
  },
]

export const COMPLIANCE_ROWS: ComplianceRow[] = BIDDERS.map((b, i) => {
  const compliant = { status: "compliant" as const }
  const partial = { status: "partial" as const }
  const nonCompliant = { status: "non_compliant" as const }
  const missing = { status: "missing" as const }
  const cells = [
    [compliant, compliant, compliant, compliant, compliant],
    [compliant, compliant, partial, compliant, compliant],
    [compliant, nonCompliant, compliant, compliant, partial],
    [compliant, compliant, compliant, partial, compliant],
    [partial, compliant, compliant, compliant, compliant],
    [compliant, missing, partial, nonCompliant, compliant],
  ]
  const [fot, time, ohp, validity, sigs] = cells[i]
  return {
    bidderId: b.id,
    fotSubmission: fot,
    timeForCompletion: time,
    ohpMarkup: ohp,
    tenderValidity: validity,
    signatures: sigs,
  }
})

const LOWEST_TENDER_SUM = Math.min(...BIDDER_SUMMARIES.map((b) => b.ptcSum))

const KEY_ISSUES_BY_RANK: Record<number, string> = {
  1: "Lowest bidder · no material issues raised.",
  2: "OHP missing on FOT; 1 arithmetical error reconciled.",
  3: "Time-for-completion conflict vs ITT; high-rate cluster on Sect. 3.",
  4: "Materials substitution proposed; partial DLP acceptance.",
  5: "Validity below 90 days; commercial deviation on payment terms.",
  6: "Signatures missing on FOT; significant scope exclusions.",
}

export const TENDER_RETURNS: TenderReturnRow[] = BIDDER_SUMMARIES.map((b) => {
  const corrected = b.ptcSum * 1_000_000
  return {
    bidderId: b.id,
    tenderSum: b.tenderSum * 1_000_000,
    adjustedSum: corrected,
    variancePct: b.variancePct,
    pctFromLowest:
      LOWEST_TENDER_SUM === 0
        ? 0
        : ((b.ptcSum - LOWEST_TENDER_SUM) / LOWEST_TENDER_SUM) * 100,
    pricedItems: 156 - b.rank * 2,
    unpricedItems: b.rank * 2,
    excludedCount: b.rank === 1 ? 0 : Math.max(0, b.rank - 1),
    arithmeticalErrors: b.rank === 1 ? 0 : Math.max(0, b.rank - 1),
    highRates: 4 + b.rank,
    lowRates: 2 + (b.rank % 3),
    keyIssues: KEY_ISSUES_BY_RANK[b.rank] ?? "",
  }
})

export const PROJECT_TITLE = "City Center Infrastructure Upgrade"
export const REVISION_LABEL = "Initial Tender Revision (Revision 0)"
