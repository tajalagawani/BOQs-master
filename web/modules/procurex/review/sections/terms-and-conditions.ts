import "server-only"

import { getProjectBidderDeviationCounts } from "@/modules/procurex/tenderers/flag-actions"

import type { BidderRow, CellValue, ReviewSectionRows } from "../types"

/**
 * Section B — TERMS AND CONDITIONS.
 *
 * Two cells per bidder, scored from `tender_deviation` counts vs the
 * project's COC baseline:
 *   - cell 1 → "Terms and Conditions" → contractual deviations
 *   - cell 2 → "Payment terms"        → commercial deviations
 *
 * Scoring band (matches FOT comparator vocabulary):
 *   0 deviations         → success / "Compliant"
 *   1–2 deviations       → warning / "Partial"
 *   3+ deviations        → danger  / "Non-compliant"
 */

function tone(n: number): "success" | "warning" | "danger" {
  if (n === 0) return "success"
  if (n <= 2) return "warning"
  return "danger"
}

function pill(n: number, suffix: string): CellValue {
  if (n === 0) return { kind: "value", text: "Compliant", tone: "success" }
  return {
    kind: "value",
    text: `${n} ${suffix}${n === 1 ? "" : "s"}`,
    tone: tone(n),
  }
}

export async function buildTacSectionRows(
  projectId: string,
  baseRows: BidderRow[],
): Promise<ReviewSectionRows> {
  const counts = await getProjectBidderDeviationCounts(projectId)
  return {
    sectionKey: "tac",
    rows: baseRows.map((r) => {
      const d = counts[r.bidderId]
      const contractual = d?.contractual ?? 0
      const commercial = d?.commercial ?? 0
      return {
        ...r,
        cells: [
          pill(contractual, "contractual deviation"),
          pill(commercial, "commercial deviation"),
        ],
      }
    }),
  }
}
