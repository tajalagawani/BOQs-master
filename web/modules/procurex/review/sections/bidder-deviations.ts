import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { tenderDeviations } from "@/modules/analysis/schema"
import { db } from "@/modules/core/db"

/**
 * Per-bidder deviation rows for Section J's three sub-tables:
 *   - Contractual Deviations
 *   - Commercial Deviations
 *   - Technical Deviations
 *
 * Sourced from `tender_deviation` rows attributed to this tenderer.
 * Each row carries the bidder's clause text + a short id used as the
 * "ID" column in the Figma (COH-01, COH-02, TECH-01, …).
 */

export interface BidderDeviationRow {
  id: string
  /** Display ref shown in the leftmost ID column. */
  ref: string
  /** Bidder's clause text — populates "Tenderer statement". */
  statement: string
  /** QS response — currently always empty; persistence TBD. */
  qsResponse: string
  /** Severity from the agent. */
  severity: "minor" | "major"
  includeInPtc: boolean
}

export interface BidderDeviationsPayload {
  contractual: BidderDeviationRow[]
  commercial: BidderDeviationRow[]
  technical: BidderDeviationRow[]
}

const PREFIX: Record<"contractual" | "commercial" | "technical", string> = {
  contractual: "COH",
  commercial: "COH",
  technical: "TECH",
}

export async function getBidderDeviations(
  bidderId: string,
): Promise<BidderDeviationsPayload> {
  if (!bidderId) {
    return { contractual: [], commercial: [], technical: [] }
  }
  const rows = await db
    .select({
      id: tenderDeviations.id,
      kind: tenderDeviations.kind,
      clause: tenderDeviations.clause,
      snippet: tenderDeviations.snippet,
      severity: tenderDeviations.severity,
      createdAt: tenderDeviations.createdAt,
    })
    .from(tenderDeviations)
    .where(
      and(
        eq(tenderDeviations.tendererId, bidderId),
        inArray(tenderDeviations.kind, [
          "contractual",
          "commercial",
          "technical",
        ]),
      ),
    )
    .orderBy(tenderDeviations.createdAt)

  const buckets: BidderDeviationsPayload = {
    contractual: [],
    commercial: [],
    technical: [],
  }
  const counters: Record<string, number> = { COH: 0, TECH: 0 }
  for (const r of rows) {
    const prefix = PREFIX[r.kind]
    counters[prefix] = (counters[prefix] ?? 0) + 1
    const ref = `${prefix}-${String(counters[prefix]).padStart(2, "0")}`
    const row: BidderDeviationRow = {
      id: r.id,
      ref,
      statement: r.clause + (r.snippet ? ` — ${r.snippet}` : ""),
      qsResponse: "",
      severity: r.severity === "major" ? "major" : "minor",
      includeInPtc: true,
    }
    buckets[r.kind as "contractual" | "commercial" | "technical"].push(row)
  }
  return buckets
}
