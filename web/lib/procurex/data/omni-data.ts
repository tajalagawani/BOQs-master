// Mock data layer for the omni cover.
// Pure functions — no backend, no DB. Replace with your own data source later.

export type OmniTenderStatus = "active" | "review" | "completed" | "cancelled"

export interface OmniTenderCard {
  id: string
  projectName: string
  referenceNumber: string
  status: OmniTenderStatus
  statusLabel: string
  createdAt: Date
  deadline: Date | null
  bidders: number
  highRates: number
  lowRates: number
  unpricedItems: number
  deviations: number
  arithmeticalErrors: number
}

const TENDERS: OmniTenderCard[] = [
  {
    id: "city-center",
    projectName: "City Center Infrastructure Upgrade",
    referenceNumber: "CCI-2026-001",
    status: "review",
    statusLabel: "Review",
    createdAt: new Date("2026-04-10"),
    deadline: new Date("2026-06-15"),
    bidders: 6,
    highRates: 12,
    lowRates: 4,
    unpricedItems: 8,
    deviations: 5,
    arithmeticalErrors: 2,
  },
  {
    id: "harbour-link",
    projectName: "Harbour Link Phase 2",
    referenceNumber: "HLP-2026-014",
    status: "active",
    statusLabel: "Active",
    createdAt: new Date("2026-03-22"),
    deadline: new Date("2026-07-01"),
    bidders: 4,
    highRates: 6,
    lowRates: 2,
    unpricedItems: 3,
    deviations: 1,
    arithmeticalErrors: 0,
  },
]

export async function getOmniTenders(): Promise<OmniTenderCard[]> {
  return TENDERS
}

// ============================================================================
// Tender detail (omni "Open Tender" page)
// ============================================================================

export interface OmniBidderRow {
  tendererId: string
  companyName: string
  totalBid: number
  itemsPriced: number
}

export interface OmniBidderCard extends OmniBidderRow {
  rank: number
  compliancePct: number
  qualifications: string[]
  recommended: boolean
}

export interface OmniTenderDetail {
  projectId: string
  projectName: string
  referenceNumber: string
  insights: string[]
  rounds: Array<{ key: string; label: string; rows: OmniBidderRow[] }>
  bidders: OmniBidderCard[]
}

const DETAIL_BIDDERS: OmniBidderCard[] = [
  {
    tendererId: "orion",
    companyName: "Orion Property Group",
    totalBid: 11980000,
    itemsPriced: 432,
    rank: 1,
    compliancePct: 98,
    qualifications: ["ISO 9001", "OHSAS 18001", "LEED AP"],
    recommended: true,
  },
  {
    tendererId: "stratus",
    companyName: "Stratus Infrastructure Group",
    totalBid: 12220000,
    itemsPriced: 430,
    rank: 2,
    compliancePct: 96,
    qualifications: ["ISO 9001", "ISO 14001"],
    recommended: false,
  },
  {
    tendererId: "helix",
    companyName: "Helix MEP Solutions LLC",
    totalBid: 12450000,
    itemsPriced: 428,
    rank: 3,
    compliancePct: 94,
    qualifications: ["MEP Cert"],
    recommended: false,
  },
  {
    tendererId: "linea",
    companyName: "Linea Interiors Group",
    totalBid: 13180000,
    itemsPriced: 410,
    rank: 4,
    compliancePct: 89,
    qualifications: [],
    recommended: false,
  },
  {
    tendererId: "crestline",
    companyName: "Crestline Advisory Partners",
    totalBid: 14010000,
    itemsPriced: 405,
    rank: 5,
    compliancePct: 92,
    qualifications: ["PMP"],
    recommended: false,
  },
  {
    tendererId: "axis",
    companyName: "Axis Structural Engineers GmbH",
    totalBid: 15280000,
    itemsPriced: 401,
    rank: 6,
    compliancePct: 90,
    qualifications: ["DIN EN ISO 9001"],
    recommended: false,
  },
]

export async function getOmniTenderDetail(
  projectId: string
): Promise<OmniTenderDetail | null> {
  const tender = TENDERS.find((t) => t.id === projectId)
  if (!tender) return null

  const rows: OmniBidderRow[] = DETAIL_BIDDERS.map((b) => ({
    tendererId: b.tendererId,
    companyName: b.companyName,
    totalBid: b.totalBid,
    itemsPriced: b.itemsPriced,
  }))

  return {
    projectId: tender.id,
    projectName: tender.projectName,
    referenceNumber: tender.referenceNumber,
    insights: [
      "Orion Property Group shows 2% cost advantage with 98% compliance",
      "Overall bid spread is 27% across 6 bidders",
      "2 bidders below 95% compliance — clarification recommended before PTC issuance",
    ],
    rounds: [
      { key: "initial", label: "Initial", rows },
      { key: "ptc1", label: "PTC 1", rows },
      { key: "ptc2", label: "PTC 2", rows },
    ],
    bidders: DETAIL_BIDDERS,
  }
}

// ============================================================================
// Detailed Analysis (omni "View Detailed Analysis" page)
// ============================================================================

export interface RateAnalysisRow {
  id: string
  itemId: string
  description: string
  unit: string
  rate: number
  benchmark: number
  variancePct: number
  bidderComparison: string
}

export interface UnpricedRow {
  id: string
  itemId: string
  description: string
  unit: string
  bidder: string
  status: string
}

export interface ArithmeticalRow {
  id: string
  bidder: string
  errorAmount: number
  tenderSum: number
  adjustedSum: number
}

export interface DeviationRow {
  id: string
  bidder: string
  documentCode: string
  documentName: string
  status: string
  notes: string | null
}

export interface OmniDetailedAnalysis {
  projectId: string
  projectName: string
  highRates: RateAnalysisRow[]
  lowRates: RateAnalysisRow[]
  unpriced: UnpricedRow[]
  arithmetical: ArithmeticalRow[]
  commercialDev: DeviationRow[]
  technicalDev: DeviationRow[]
}

export async function getOmniDetailedAnalysis(
  projectId: string
): Promise<OmniDetailedAnalysis | null> {
  const tender = TENDERS.find((t) => t.id === projectId)
  if (!tender) return null

  return {
    projectId: tender.id,
    projectName: tender.projectName,
    highRates: [
      {
        id: "h-1",
        itemId: "5.04.012",
        description: "Reinforced concrete slab, 300mm",
        unit: "m³",
        rate: 1480,
        benchmark: 1100,
        variancePct: 34.5,
        bidderComparison: "Highest among bidders",
      },
      {
        id: "h-2",
        itemId: "8.02.004",
        description: "Structural steel framing, painted",
        unit: "ton",
        rate: 6200,
        benchmark: 4800,
        variancePct: 29.2,
        bidderComparison: "Above avg by 22%",
      },
    ],
    lowRates: [
      {
        id: "l-1",
        itemId: "3.01.009",
        description: "Excavation, ordinary soil",
        unit: "m³",
        rate: 32,
        benchmark: 55,
        variancePct: -41.8,
        bidderComparison: "Lowest among bidders",
      },
    ],
    unpriced: [
      {
        id: "u-1",
        itemId: "11.04.001",
        description: "Provisional sum for landscaping",
        unit: "item",
        bidder: "Linea Interiors Group",
        status: "BLANK",
      },
    ],
    arithmetical: [
      {
        id: "a-1",
        bidder: "Helix MEP Solutions LLC",
        errorAmount: 24500,
        tenderSum: 12450000,
        adjustedSum: 12474500,
      },
    ],
    commercialDev: [
      {
        id: "cd-1",
        bidder: "Orion Property Group",
        documentCode: "A3",
        documentName: "Payment Terms",
        status: "PARTIAL",
        notes: "Requests 45-day payment vs 30 days in FOT",
      },
    ],
    technicalDev: [
      {
        id: "td-1",
        bidder: "Helix MEP Solutions LLC",
        documentCode: "B7",
        documentName: "MEP Specifications",
        status: "NON_COMPLIANT",
        notes: "Substituted MEP scope wording — confirm equivalent coverage",
      },
    ],
  }
}
