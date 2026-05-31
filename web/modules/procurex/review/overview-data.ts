"use server"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { tendererSubmissions } from "@/modules/analysis/schema"
import { companies } from "@/modules/companies/schema"
import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import { getProjectFotCompliance } from "@/modules/procurex/tenderers/compliance-actions"
import type { ComplianceVerdict } from "@/modules/procurex/tenderers/compliance-types"
import {
  getProjectBidderDeviationCounts,
  getProjectBidderFlagCounts,
} from "@/modules/procurex/tenderers/flag-actions"
import { tenderers } from "@/modules/procurex/tenderers/schema"

/**
 * One row per tenderer on the project, for the Step 5 overview's
 * BidderSummaries cards.
 *
 * Real fields only. Anything we don't yet model in the DB (rank, etc.)
 * is left explicitly null/0 so the UI can render a literal "Not
 * implemented" badge instead of a faked number.
 */
export interface ProjectBidderOverviewRow {
  id: string
  code: string
  name: string
  /** Original tender sum (cents-as-string for bigint over the wire).
   *  Null until a submission has been applied. */
  tenderSumCents: string | null
  /** QS-corrected tender sum. Null until corrected. */
  adjustedSumCents: string | null
  /** Ranking is not yet computed anywhere — stays null. */
  rank: number | null
  /** Counts that drive the bidder card pills. Zeros when the analysis
   *  pass hasn't run. */
  counts: {
    variance: number
    highRate: number
    unpriced: number
    commercial: number
    technical: number
    contractual: number
    arithmeticalError: number
  }
}

/** Status used by the Step 5 compliance pills. Lowercase variant of
 *  `ComplianceVerdict` from the server comparator. */
export type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "missing"

export interface ProjectComplianceRow {
  bidderId: string
  code: string
  name: string
  /** Rank — not modelled yet, stays null until a ranking pass lands. */
  rank: number | null
  cells: {
    fotSubmission: ComplianceStatus
    timeForCompletion: ComplianceStatus
    ohpMarkup: ComplianceStatus
    tenderValidity: ComplianceStatus
    signatures: ComplianceStatus
  }
}

function verdictToStatus(v: ComplianceVerdict): ComplianceStatus {
  switch (v) {
    case "Compliant":
      return "compliant"
    case "Partial":
      return "partial"
    case "Non-compliant":
      return "non_compliant"
    case "Missing":
      return "missing"
  }
}

/**
 * Per-bidder compliance summary for the Step 5 "Compliance
 * Requirements" card. One row per tenderer on the project, with five
 * status cells matching the FOT clause grid the UI renders.
 *
 * Sources the verdicts from `getProjectFotCompliance(projectId)` so
 * the same comparator drives both the per-bidder review page and the
 * overview summary — no second source of truth.
 */
export async function getProjectComplianceRows(
  projectId: string,
): Promise<ProjectComplianceRow[]> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return []

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
  if (tenRows.length === 0) return []

  const verdicts = await getProjectFotCompliance(projectId)

  return tenRows.map((t): ProjectComplianceRow => {
    const v = verdicts[t.id]
    const cell = (k: keyof typeof v) =>
      v ? verdictToStatus(v[k]) : ("missing" as ComplianceStatus)
    return {
      bidderId: t.id,
      code: t.code,
      name: t.companyName,
      rank: null,
      cells: {
        fotSubmission: cell("FOT Submission"),
        timeForCompletion: cell("Time for Completion"),
        ohpMarkup: cell("OHP Markup"),
        tenderValidity: cell("Tender Validity"),
        signatures: cell("Signatures"),
      },
    }
  })
}

export async function getProjectBidderOverview(
  projectId: string,
): Promise<ProjectBidderOverviewRow[]> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return []

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
  if (tenRows.length === 0) return []

  const tenderIds = tenRows.map((t) => t.id)

  const submissions = await db
    .select({
      tendererId: tendererSubmissions.tendererId,
      tenderSumCents: tendererSubmissions.tenderSumCents,
      adjustedSumCents: tendererSubmissions.adjustedSumCents,
      submittedAt: tendererSubmissions.submittedAt,
    })
    .from(tendererSubmissions)
    .where(inArray(tendererSubmissions.tendererId, tenderIds))
    .orderBy(desc(tendererSubmissions.submittedAt))

  const latestByTenderer = new Map<
    string,
    { tenderSumCents: bigint | null; adjustedSumCents: bigint | null }
  >()
  for (const s of submissions) {
    if (!latestByTenderer.has(s.tendererId)) {
      latestByTenderer.set(s.tendererId, {
        tenderSumCents: s.tenderSumCents,
        adjustedSumCents: s.adjustedSumCents,
      })
    }
  }

  const [flagCounts, deviationCounts] = await Promise.all([
    getProjectBidderFlagCounts(projectId),
    getProjectBidderDeviationCounts(projectId),
  ])

  return tenRows.map((t): ProjectBidderOverviewRow => {
    const sub = latestByTenderer.get(t.id)
    const f = flagCounts[t.id]
    const d = deviationCounts[t.id]
    return {
      id: t.id,
      code: t.code,
      name: t.companyName,
      tenderSumCents: sub?.tenderSumCents ? sub.tenderSumCents.toString() : null,
      adjustedSumCents: sub?.adjustedSumCents
        ? sub.adjustedSumCents.toString()
        : null,
      rank: null,
      counts: {
        variance: f?.variance ?? 0,
        highRate: f?.high_rate ?? 0,
        unpriced: f?.unpriced ?? 0,
        arithmeticalError: f?.arithmetical_error ?? 0,
        commercial: d?.commercial ?? 0,
        technical: d?.technical ?? 0,
        contractual: d?.contractual ?? 0,
      },
    }
  })
}
