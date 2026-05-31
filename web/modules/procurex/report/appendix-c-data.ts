"use server"

import { and, eq, isNull } from "drizzle-orm"

import { companies } from "@/modules/companies/schema"
import { db } from "@/modules/core/db"
import { getBidderReviewData } from "@/modules/procurex/review/bidder-review-data"
import type { BidderReviewData } from "@/modules/procurex/review/types"
import { tenderers } from "@/modules/procurex/tenderers/schema"

/**
 * Appendix C — Detailed Tender Analysis — server orchestrator.
 *
 * Fans out `getBidderReviewData(projectId, bidderId)` over every
 * tenderer on the project in a single `Promise.all`, then exposes the
 * payload keyed by bidderId so each sub-block component can iterate
 * once and pluck what it needs.
 *
 * Kept in its own fetcher (separate from `getTenderReportData`) so
 * the main report stays fast — Appendix C is the only "N round-
 * trips" part of the report. If the user has 8 tenderers we do 8
 * concurrent fetches here, while the rest of the report still
 * resolves in 2.
 */

export interface AppendixCTendererHeader {
  id: string
  code: string
  name: string
}

export interface AppendixCData {
  tenderers: AppendixCTendererHeader[]
  /** Map of bidderId → full per-bidder review payload. The same
   *  shape `getBidderReviewData` already returns for the per-bidder
   *  review page, so every Appendix C sub-block reuses the existing
   *  type contract — no duplication. */
  byBidder: Record<string, BidderReviewData>
}

export async function getAppendixCData(
  projectId: string,
): Promise<AppendixCData | null> {
  // Identify every active tenderer on the project.
  const tenRows = await db
    .select({
      id: tenderers.id,
      code: tenderers.code,
      companyName: companies.name,
    })
    .from(tenderers)
    .innerJoin(companies, eq(companies.id, tenderers.companyId))
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
    .orderBy(tenderers.code)

  if (tenRows.length === 0) {
    return { tenderers: [], byBidder: {} }
  }

  // Concurrent fan-out — one `getBidderReviewData` per tenderer.
  // Each internally runs its own Promise.all over section fetchers, so
  // total parallelism is high (N × ~13 concurrent DB calls). Acceptable
  // here because this only runs when the QS opens the report.
  const reviewPayloads = await Promise.all(
    tenRows.map((t) => getBidderReviewData(projectId, t.id)),
  )

  const byBidder: Record<string, BidderReviewData> = {}
  for (let i = 0; i < tenRows.length; i++) {
    const payload = reviewPayloads[i]
    if (payload) byBidder[tenRows[i]!.id] = payload
  }

  return {
    tenderers: tenRows.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.companyName,
    })),
    byBidder,
  }
}
