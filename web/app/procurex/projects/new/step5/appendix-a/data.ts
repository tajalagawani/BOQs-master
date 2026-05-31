import { BIDDERS } from "../mock-data"

export const APPENDIX_BIDDERS = BIDDERS

export interface TenderInfoCell {
  /** displayed in the header table for each bidder */
  tenderDate: string
  round: string
  currency: string
}

export const TENDER_INFO: Record<string, TenderInfoCell> = {
  orion: {
    tenderDate: "12 Sep 2025",
    round: "PTC 01",
    currency: "AED",
  },
  stratus: {
    tenderDate: "04 Nov 2025",
    round: "Close out PTC Rev 2",
    currency: "AED",
  },
  helix: {
    tenderDate: "21 Oct 2025",
    round: "PTC 02",
    currency: "AED",
  },
  linea: {
    tenderDate: "21 Oct 2025",
    round: "PTC 02",
    currency: "AED",
  },
  crestline: {
    tenderDate: "21 Sep 2025",
    round: "PTC 02",
    currency: "AED",
  },
  axis: {
    tenderDate: "21 Oct 2025",
    round: "PTC 02",
    currency: "AED",
  },
}

/** Tender Sum Breakdown — 17 element rows + total */
export interface BreakdownRow {
  no: number
  label: string
  amounts: Record<string, number> // bidderId -> number
  isTotal?: boolean
}

const ELEMENT_LABELS: string[] = [
  "Prelims",
  "Section B - Site works",
  "Section C - Concrete works",
  "Section D - Masonry",
  "Section E - Metalwork",
  "Section F - Woodwork",
  "Section G - Thermal & Moisture Protection",
  "Section H - Doors & Windows",
  "Section J - Finishes",
  "Section K - Accessories",
  "Section L - Equipment",
  "Section M - Furnishings",
  "Section P - Conveying Systems",
  "Section Q - Mechanical Installations",
  "Section R - Electrical Installations",
  "External Works",
  "Provisional Sums",
]

// Mock per-bidder per-element amount (AED) — visually realistic, all near 101,031,960 like the Figma
function genAmount(bidderIdx: number, elementIdx: number): number {
  const base = 101_031_960
  if (bidderIdx === 0) return base
  // small variation per bidder/element so totals differ
  const bidderVariance = [0, 0, 0, 0, 0, 0]
  return base + bidderVariance[bidderIdx]
}

export const BREAKDOWN_ROWS: BreakdownRow[] = ELEMENT_LABELS.map(
  (label, i) => ({
    no: i + 1,
    label,
    amounts: APPENDIX_BIDDERS.reduce(
      (acc, b, bIdx) => {
        acc[b.id] = genAmount(bIdx, i)
        return acc
      },
      {} as Record<string, number>,
    ),
  }),
)

/** Bottom total row (per bidder) */
export const BREAKDOWN_TOTALS: Record<string, number> = {
  orion: 971_552_396,
  stratus: 887_000_000,
  helix: 933_891_112,
  linea: 959_095_717,
  crestline: 1_103_343_000,
  axis: 1_103_829_781,
}

/** Section 1.1 Arithmetical errors / adjustments rows */
export interface AdjustmentRow {
  label: string
  /** value per bidder. number | string ("Not submitted", "TBC", etc.) */
  values: Record<string, number | string>
  errorFlags?: Record<string, "ok" | "warn" | "error">
}

export const ADJUSTMENT_ROWS: AdjustmentRow[] = [
  {
    label: "Tender amount as per Form of Tender (FOT)",
    values: {
      orion: 971_552_396,
      stratus: 887_000_000,
      helix: "Not submitted",
      linea: 959_095_717,
      crestline: 1_103_343_000,
      axis: 1_103_829_781,
    },
  },
  {
    label: "Adjustments (ITT method)",
    values: {
      orion: 0,
      stratus: 0,
      helix: 0,
      linea: 125_000,
      crestline: -75_000,
      axis: 0,
    },
  },
  {
    label: "Adjusted tender sums",
    values: {
      orion: 971_552_396,
      stratus: 887_000_000,
      helix: 933_891_112,
      linea: 959_220_717,
      crestline: 1_103_268_000,
      axis: 1_103_829_781,
    },
  },
  {
    label: "Arithmetical errors identified",
    values: {
      orion: "—",
      stratus: "—",
      helix: "TBC",
      linea: "✓",
      crestline: "✓",
      axis: "—",
    },
    errorFlags: {
      orion: "ok",
      stratus: "ok",
      helix: "warn",
      linea: "ok",
      crestline: "ok",
      axis: "ok",
    },
  },
]

/** Difference from lowest tender (Stratus is lowest at 887M) */
export const LOWEST_BIDDER_ID = "stratus"

export interface DifferenceRow {
  label: string
  values: Record<string, number | string>
}

export const DIFFERENCE_ROWS: DifferenceRow[] = [
  {
    label: "Difference from lowest tender",
    values: {
      orion: 84_552_396,
      stratus: 0,
      helix: 46_891_112,
      linea: 72_220_717,
      crestline: 144_268_000,
      axis: 1_103_829_781,
    },
  },
  {
    label: "% difference",
    values: {
      orion: "9,53%",
      stratus: "Lowest",
      helix: "5,29%",
      linea: "8,14%",
      crestline: "16,27%",
      axis: "24,45%",
    },
  },
]
