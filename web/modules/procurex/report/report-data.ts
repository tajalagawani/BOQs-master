"use server"

import { eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import {
  getProjectBidderOverview,
  getProjectComplianceRows,
  type ProjectBidderOverviewRow,
  type ProjectComplianceRow,
} from "@/modules/procurex/review/overview-data"

import {
  getBoqChangeEvents,
  type BoqChangeEvents,
} from "./boq-changes"
import {
  getRateComparisons,
  type RateComparisonBuckets,
} from "./rate-comparisons"
import {
  getTenderSumBreakdown,
  type TenderSumBreakdown,
} from "./sum-breakdown"

/**
 * Tender Evaluation Report — server-side data orchestrator.
 *
 * One call assembles every section the report renders. Reuses the
 * Step 5 overview fetchers (`getProjectBidderOverview`,
 * `getProjectComplianceRows`) so the report and the review pages
 * share a single source of truth — no second comparator.
 *
 * Sections that don't have a backing fetcher yet (Executive Summary
 * narrative, PTC schedule, etc.) return `null` and the UI renders a
 * "Not implemented" empty state. That way every section is *visible*
 * on the page from day 1 and gets filled in as data lands.
 */

export type ReportType = "executive" | "full"
export type ReportRound = "initial" | "ptc1" | "ptc2" | "ptc3"

export interface ReportOptions {
  type: ReportType
  appendices: boolean
  round: ReportRound
}

/** Per-tenderer ranking row derived from the bidder overview. */
export interface ReportRanking {
  bidderId: string
  code: string
  name: string
  rank: number
  /** Cents (string) so big ints round-trip safely over the wire. */
  tenderSumCents: string | null
  adjustedSumCents: string | null
  /** Variance vs the lowest applied (or original) tender sum, as a
   *  percentage. `null` when this bidder has no submission yet. */
  variancePctVsLowest: number | null
}

export interface TenderReportData {
  project: {
    id: string
    name: string
    currency: string | null
    city: string | null
    country: string | null
    projectType: string | null
    tenderIssuedAt: string | null
    originalReturnAt: string | null
    adjustedReturnAt: string | null
  }
  options: ReportOptions
  /** Raw bidder overview rows — used by the Tender Comparison +
   *  Detailed Tender Analysis sections. */
  bidders: ProjectBidderOverviewRow[]
  /** Derived ranking rows (sorted by applied/original sum ascending). */
  rankings: ReportRanking[]
  /** Compliance matrix — one row per tenderer, five FOT cells each. */
  compliance: ProjectComplianceRow[]
  /** Lowest-sum tenderer id (null when nobody has submitted). */
  lowestBidderId: string | null
  /** Per-section per-bidder BoQ totals (from `getProjectBoq`). Drives
   *  Section 03 + Appendix A + Appendix C "Tender Sum Breakdown".
   *  `null` when the project has no BoQ template loaded yet. */
  sumBreakdown: TenderSumBreakdown | null
  /** Project-wide BoQ change log (description + quantity changes
   *  recorded as `tender_item_event` rows). Drives Appendix C's
   *  "BOQ description changes" + "Quantity changes" tables. */
  boqChanges: BoqChangeEvents | null
  /** Deterministic high/low rate comparisons vs PTE — does NOT
   *  depend on the AI flagger. Each bidder × BoQ item where the
   *  variance from the PTE rate exceeds the threshold lands in one
   *  of the two buckets. Falls back to an empty payload (with
   *  `hasPte=false`) when no PTE is loaded yet. */
  rateComparisons: RateComparisonBuckets | null
}

/** Pull the effective sum (adjusted falls back to original) for
 *  variance + ranking calculations. Returns null when neither is set. */
function effectiveCents(b: ProjectBidderOverviewRow): bigint | null {
  const raw = b.adjustedSumCents ?? b.tenderSumCents
  if (!raw) return null
  try {
    return BigInt(raw)
  } catch {
    return null
  }
}

function computeRankings(
  bidders: ProjectBidderOverviewRow[],
): { rankings: ReportRanking[]; lowestBidderId: string | null } {
  const withSums = bidders.map((b) => ({ b, cents: effectiveCents(b) }))
  const withSubmissions = withSums
    .filter((x): x is { b: ProjectBidderOverviewRow; cents: bigint } =>
      x.cents !== null,
    )
    .sort((a, b) => (a.cents < b.cents ? -1 : a.cents > b.cents ? 1 : 0))

  const lowest = withSubmissions[0]?.cents ?? null
  const lowestBidderId = withSubmissions[0]?.b.id ?? null

  // Rank submitted bidders 1..N, then append no-submission bidders at
  // the bottom with `rank = withSubmissions.length + i + 1` so the UI
  // can show them in the table.
  const rankings: ReportRanking[] = []
  withSubmissions.forEach(({ b, cents }, i) => {
    const variancePctVsLowest =
      lowest && lowest > 0n
        ? Number(((cents - lowest) * 10_000n) / lowest) / 100
        : null
    rankings.push({
      bidderId: b.id,
      code: b.code,
      name: b.name,
      rank: i + 1,
      tenderSumCents: b.tenderSumCents,
      adjustedSumCents: b.adjustedSumCents,
      variancePctVsLowest,
    })
  })
  let unrankedIdx = 0
  withSums
    .filter((x) => x.cents === null)
    .forEach(({ b }) => {
      rankings.push({
        bidderId: b.id,
        code: b.code,
        name: b.name,
        rank: withSubmissions.length + ++unrankedIdx,
        tenderSumCents: b.tenderSumCents,
        adjustedSumCents: b.adjustedSumCents,
        variancePctVsLowest: null,
      })
    })

  return { rankings, lowestBidderId }
}

export async function getTenderReportData(
  projectId: string,
  options: ReportOptions,
): Promise<TenderReportData | null> {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      currency: projects.currency,
      city: projects.city,
      country: projects.country,
      projectType: projects.projectType,
      tenderIssuedAt: projects.tenderIssuedAt,
      originalReturnAt: projects.originalReturnAt,
      adjustedReturnAt: projects.adjustedReturnAt,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return null

  const [bidders, compliance, sumBreakdown, boqChanges, rateComparisons] =
    await Promise.all([
      getProjectBidderOverview(projectId),
      getProjectComplianceRows(projectId),
      getTenderSumBreakdown(projectId),
      getBoqChangeEvents(projectId),
      getRateComparisons(projectId),
    ])

  const { rankings, lowestBidderId } = computeRankings(bidders)

  return {
    project,
    options,
    bidders,
    rankings,
    compliance,
    lowestBidderId,
    sumBreakdown,
    boqChanges,
    rateComparisons,
  }
}
