import "server-only"

import type { BidderRow, ReviewSectionRows } from "../types"

/**
 * Section J — TENDERERS QUALIFICATION / CLARIFICATIONS.
 *
 * Per the user's screenshot, Section J no longer has a per-bidder
 * pill row. Instead it hosts THREE deviation sub-tables (Contractual /
 * Commercial / Technical) via `BidderDeviationsBlock` rendered as
 * `children` of the ComplianceCard. We emit empty cells here so the
 * card's `hideTable` path is consistent with the other Section-D-style
 * blocks.
 */
export async function buildTenderersQualificationRows(
  projectId: string,
  baseRows: BidderRow[],
): Promise<ReviewSectionRows> {
  void projectId
  return {
    sectionKey: "qual",
    rows: baseRows.map((r) => ({ ...r, cells: [] })),
  }
}
