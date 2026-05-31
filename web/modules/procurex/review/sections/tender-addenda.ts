import "server-only"

import type {
  BidderAddendaStanding,
  BidderRow,
  CellValue,
  ProjectAddenda,
  ProjectAddendum,
  ReviewSectionRows,
} from "../types"
import { getBidderFotSubmission } from "./bidder-fot-submission"
import { getProjectAddenda } from "./project-addenda"

/**
 * Section G — TENDER ADDENDA verdict cells.
 *
 * Columns ["Acknowledged", "Pricing", "Queries", "Signed"]:
 *   - Acknowledged → bidder's `acknowledgedAddenda` covers the project
 *                    addenda count (≥ project count = Compliant).
 *   - Pricing      → not modelled (no per-addendum BoQ impact flag) →
 *                    not_implemented.
 *   - Queries      → not modelled (no addenda-query store) →
 *                    not_implemented.
 *   - Signed       → bidder has at least one signature on their FOT
 *                    (proxy for "FOT signed with addenda block").
 */

export async function getBidderAddendaStanding(
  projectId: string,
  bidderId: string,
): Promise<BidderAddendaStanding> {
  const [project, fot] = await Promise.all([
    getProjectAddenda(projectId),
    getBidderFotSubmission(bidderId),
  ])
  const acknowledged = fot?.tenderValidity.acknowledgedAddenda ?? []
  const refs = acknowledged
    .map((a) => a.reference?.trim())
    .filter((s): s is string => Boolean(s))
  return {
    project,
    acknowledgedCount: refs.length,
    acknowledgedRefs: refs,
    signed: (fot?.signatures.blocks.length ?? 0) > 0,
  }
}

function acknowledgedCell(
  acknowledged: number,
  expected: number,
): CellValue {
  if (expected === 0) {
    return { kind: "value", text: "No addenda", tone: "neutral" }
  }
  if (acknowledged >= expected)
    return { kind: "value", text: `${acknowledged}/${expected}`, tone: "success" }
  if (acknowledged === 0) return { kind: "missing" }
  return { kind: "value", text: `${acknowledged}/${expected}`, tone: "warning" }
}

function signedCell(signed: boolean, expected: number): CellValue {
  if (expected === 0)
    return { kind: "value", text: "No addenda", tone: "neutral" }
  return signed
    ? { kind: "value", text: "Signed", tone: "success" }
    : { kind: "missing" }
}

export async function buildAddendaSectionRows(
  projectId: string,
  baseRows: BidderRow[],
): Promise<{
  section: ReviewSectionRows
  project: ProjectAddenda
  byBidder: Record<string, BidderAddendaStanding>
}> {
  const project = await getProjectAddenda(projectId)
  const standings = await Promise.all(
    baseRows.map(async (r) => {
      const s = await getBidderAddendaStanding(projectId, r.bidderId)
      return [r.bidderId, s] as const
    }),
  )
  const byBidder = Object.fromEntries(standings)

  return {
    section: {
      sectionKey: "addenda",
      rows: baseRows.map((r) => {
        const s = byBidder[r.bidderId]
        const ack = s?.acknowledgedCount ?? 0
        const expected = project.count
        return {
          ...r,
          cells: [
            acknowledgedCell(ack, expected),
            { kind: "not_implemented" }, // Pricing impact — not modelled
            { kind: "not_implemented" }, // Open queries — not modelled
            signedCell(s?.signed ?? false, expected),
          ],
        }
      }),
    },
    project,
    byBidder,
  }
}

export type { ProjectAddendum }
