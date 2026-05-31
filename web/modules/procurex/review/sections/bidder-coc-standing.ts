import "server-only"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { tenderDeviations } from "@/modules/analysis/schema"
import { workflowRuns } from "@/modules/workflows/schema"

import type { BidderCocStanding, CocGrouped } from "../types"
import { mapCocVerdictToGrouped } from "./project-coc-requirements"

/**
 * Per-bidder Section B (Terms and Conditions) standing.
 *
 * Bidders rarely submit a separate COC doc — their compliance signal
 * lives in `tender_deviation` rows (commercial + contractual). This
 * fetcher returns:
 *   - cocVerdict: the bidder's own COC extraction if they submitted one
 *                 (null otherwise — and it usually is)
 *   - deviationCounts: per-kind tallies on the project's COC
 *
 * Pair with `getProjectCocRequirements(projectId)` to render Section B
 * side-by-side: project values become the "Required" baseline, the
 * deviation count + verdict drives the per-bidder pill.
 */

export async function getBidderCocStanding(
  bidderId: string,
): Promise<BidderCocStanding> {
  const [bidderCocVerdict, devCounts] = await Promise.all([
    fetchBidderCocVerdict(bidderId),
    fetchBidderDeviationCounts(bidderId),
  ])
  return {
    cocVerdict: bidderCocVerdict,
    deviationCounts: devCounts,
  }
}

async function fetchBidderCocVerdict(
  bidderId: string,
): Promise<CocGrouped | null> {
  const docRows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.scope, "bidder_submission"),
        eq(documents.targetKind, "tenderer"),
        eq(documents.category, "Conditions of Contract"),
        eq(documents.targetId, bidderId),
        isNull(documents.deletedAt),
      ),
    )
  if (docRows.length === 0) return null
  const docIds = new Set(docRows.map((d) => d.id))

  const runs = await db
    .select({
      output: workflowRuns.output,
      input: workflowRuns.input,
      finishedAt: workflowRuns.finishedAt,
    })
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.kind, "ai.extract:coc"),
        eq(workflowRuns.status, "succeeded"),
      ),
    )
    .orderBy(desc(workflowRuns.finishedAt))

  const latest = runs.find((r) => {
    const docId = (r.input as { documentId?: string } | null)?.documentId
    return docId ? docIds.has(docId) : false
  })
  if (!latest) return null

  const verdict = (latest.output as { verdict?: unknown } | null)?.verdict
  return mapCocVerdictToGrouped(verdict)
}

async function fetchBidderDeviationCounts(
  bidderId: string,
): Promise<{ commercial: number; contractual: number }> {
  const rows = await db
    .select({ kind: tenderDeviations.kind })
    .from(tenderDeviations)
    .where(
      and(
        eq(tenderDeviations.tendererId, bidderId),
        inArray(tenderDeviations.kind, ["commercial", "contractual"]),
      ),
    )
  let commercial = 0
  let contractual = 0
  for (const r of rows) {
    if (r.kind === "commercial") commercial += 1
    else if (r.kind === "contractual") contractual += 1
  }
  return { commercial, contractual }
}
