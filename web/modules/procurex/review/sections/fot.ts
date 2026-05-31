import "server-only"

import { getProjectFotCompliance } from "@/modules/procurex/tenderers/compliance-actions"

import type { BidderRow, ReviewSectionRows } from "../types"
import { verdictCell } from "./helpers"

/**
 * Section A — FORM OF TENDER.
 *
 * Cells: [FOT, Time for Completion, OHP %, Tender Validity]
 *
 * Sources every value from `getProjectFotCompliance(projectId)` —
 * which already does the per-clause comparison (Compliant / Partial /
 * Non-compliant / Missing). The 5th clause it returns (Signatures) is
 * not in this section's columns — it lives in Section C.
 */

export async function buildFotSectionRows(
  projectId: string,
  baseRows: BidderRow[],
): Promise<ReviewSectionRows> {
  const verdictsByTenderer = await getProjectFotCompliance(projectId)
  return {
    sectionKey: "fot",
    rows: baseRows.map((r) => {
      const v = verdictsByTenderer[r.bidderId]
      if (!v) {
        // No FOT run yet for this bidder → all 4 cells "Missing"
        return {
          ...r,
          cells: [
            { kind: "missing" },
            { kind: "missing" },
            { kind: "missing" },
            { kind: "missing" },
          ],
        }
      }
      return {
        ...r,
        cells: [
          verdictCell(v["FOT Submission"]),
          verdictCell(v["Time for Completion"]),
          verdictCell(v["OHP Markup"]),
          verdictCell(v["Tender Validity"]),
        ],
      }
    }),
  }
}
