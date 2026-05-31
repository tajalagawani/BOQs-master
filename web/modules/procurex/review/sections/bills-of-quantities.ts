import "server-only"

import type { BidderRow, ReviewSectionRows } from "../types"

/**
 * Section D — BILLS OF QUANTITIES (Figma 1280:66928).
 *
 * After the redesign, the BoQ section renders ONLY the header + 4
 * criteria cards (Arithmetical Errors, Unpriced/Incomplete Items,
 * High / Low Analysis, Deviations from Tender Bill). The per-bidder
 * status row that used to live here is gone — line-item review is
 * surfaced via the BOQ sub-sections (Arithmetical Errors,
 * Unpriced/Incomplete, High/Low Analysis, Deviations from Tender Bill)
 * rendered below this card by `Step5ReviewTenderer`.
 *
 * The orchestrator still calls this so the section's `sectionKey` +
 * persisted QS state (if/when the table comes back) stays consistent.
 * Cells are an empty array — the card has `hideTable` set on the UI.
 *
 * Real wiring (left intentionally deferred until the sub-tables get
 * built):
 *   - tender_flag (kind ∈ {arithmetical_error, unpriced, high_rate,
 *     low_rate}) joined to BoQ items for the per-row deviation tables
 *   - tendererSubmissions.priced/unpriced for the "Fully priced" pill
 */
export async function buildBoqSectionRows(
  projectId: string,
  baseRows: BidderRow[],
): Promise<ReviewSectionRows> {
  void projectId
  return {
    sectionKey: "boqs",
    rows: baseRows.map((r) => ({ ...r, cells: [] })),
  }
}
