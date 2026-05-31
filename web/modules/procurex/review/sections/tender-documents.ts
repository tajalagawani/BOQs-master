import "server-only"

import type {
  BidderRow,
  CellValue,
  ProjectTenderDocuments,
  ReviewSectionRows,
} from "../types"
import { getProjectTenderDocuments } from "./project-tender-documents"

/**
 * Section E — TENDER DOCUMENTS verdict cells.
 *
 * Per-bidder cells are identical across every bidder today because the
 * issued tender doc set is shared. Cell verdict = doc present on the
 * project for that category. When a per-bidder acknowledgement signal
 * exists in the future, plug it in here.
 */

function cell(present: boolean): CellValue {
  return present
    ? { kind: "value", text: "Issued", tone: "success" }
    : { kind: "missing" }
}

export async function buildTenderDocumentsSectionRows(
  projectId: string,
  baseRows: BidderRow[],
): Promise<{ section: ReviewSectionRows; documents: ProjectTenderDocuments }> {
  const docs = await getProjectTenderDocuments(projectId)
  const cells: CellValue[] = [
    cell(docs.itt.count > 0),
    cell(docs.coc.count > 0),
    cell(docs.sopr.count > 0),
    cell(docs.drawings.count > 0),
    cell(docs.specifications.count > 0),
  ]
  return {
    section: {
      sectionKey: "tender-docs",
      rows: baseRows.map((r) => ({ ...r, cells })),
    },
    documents: docs,
  }
}
