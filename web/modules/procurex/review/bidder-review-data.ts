"use server"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { tendererSubmissions } from "@/modules/analysis/schema"
import { companies } from "@/modules/companies/schema"
import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import { tenderers } from "@/modules/procurex/tenderers/schema"

import {
  notImpl,
  type BidderHeader,
  type BidderReviewData,
  type BidderRow,
  type ReviewSectionRows,
} from "./types"
import { getBidderCocStanding } from "./sections/bidder-coc-standing"
import { getBidderDeviations } from "./sections/bidder-deviations"
import { getBidderFotSubmission } from "./sections/bidder-fot-submission"
import { buildBoqSectionRows } from "./sections/bills-of-quantities"
import { getBidderBoqReviewData } from "./sections/boq-review"
import { getBidderUnpricedItems } from "./sections/boq-unpriced"
import { buildFotSectionRows } from "./sections/fot"
import { getProjectCocRequirements } from "./sections/project-coc-requirements"
import { getProjectFotRequirements } from "./sections/project-fot-requirements"
import { buildAddendaSectionRows } from "./sections/tender-addenda"
import { buildTenderDocumentsSectionRows } from "./sections/tender-documents"
import { buildTacSectionRows } from "./sections/terms-and-conditions"
import { buildTenderersQualificationRows } from "./sections/tenderers-qualification"
import {
  getProjectReviewRows,
  type ReviewRowSnapshot,
} from "./review-row-actions"

/**
 * Orchestrator for the per-bidder review page.
 *
 * Returns one `ReviewSectionRows` payload per top-level section the UI
 * already renders today. Sections are never removed: when a field
 * can't be sourced from Step 2 yet, the cell is `not_implemented` and
 * the UI renders a slate "Not implemented" pill. That way the QS can
 * literally see the audit of what's wired vs. what isn't by opening
 * any bidder's page.
 *
 * THIS FILE INTENTIONALLY STARTS WITH ALL CELLS AS `not_implemented`.
 * Each section will be wired one PR at a time — first FOT (we have
 * `getProjectFotCompliance`), then BoQ (`tender_flag`), then
 * Tenderers Qualification (`tender_deviation` + cover-letter
 * exceptions), then the partial sections. See per-section section
 * comments below for the planned data source.
 */

export async function getBidderReviewData(
  projectId: string,
  bidderId?: string,
): Promise<BidderReviewData | null> {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return null

  // All tenderers on the project drive the row order across every
  // section so columns line up consistently bidder-to-bidder.
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

  // Load persisted QS state (comments + Include-in-PTC toggles) so the
  // grid renders with whatever the QS has already written. Indexed by
  // `${tendererId}::${sectionKey}` for O(1) lookup per row.
  const persistedReviewRows = await getProjectReviewRows(projectId)
  const persistedByKey = new Map<string, ReviewRowSnapshot>()
  for (const r of persistedReviewRows) {
    persistedByKey.set(`${r.tendererId}::${r.sectionKey}`, r)
  }
  const hydrate = (sectionKey: string) => (t: { id: string; companyName: string }) => {
    const persisted = persistedByKey.get(`${t.id}::${sectionKey}`)
    return {
      bidderId: t.id,
      bidderName: t.companyName,
      cells: [],
      qsComment: persisted?.qsComment ?? null,
      includeInPtc: persisted?.includeInPtc ?? true,
    } satisfies BidderRow
  }
  const baseRowsForSection = (sectionKey: string): BidderRow[] =>
    tenRows.map(hydrate(sectionKey))

  // (Every section now uses `baseRowsForSection(...)` directly so it
  // gets its own per-section persisted state — no shared `baseRows`.)

  // Resolve the bidder header (name + real tender sums) for the bidder
  // the URL is pointing at. Falls back to `null` when the bidderId
  // doesn't belong to this project — the page treats that as a 404-ish
  // state without an explicit error.
  const tenderIds = tenRows.map((t) => t.id)
  const submissionRows =
    tenderIds.length > 0
      ? await db
          .select({
            tendererId: tendererSubmissions.tendererId,
            tenderSumCents: tendererSubmissions.tenderSumCents,
            adjustedSumCents: tendererSubmissions.adjustedSumCents,
            submittedAt: tendererSubmissions.submittedAt,
          })
          .from(tendererSubmissions)
          .where(inArray(tendererSubmissions.tendererId, tenderIds))
          .orderBy(desc(tendererSubmissions.submittedAt))
      : []
  const latestSubmissionByTenderer = new Map<
    string,
    { tenderSumCents: bigint | null; adjustedSumCents: bigint | null }
  >()
  for (const s of submissionRows) {
    if (!latestSubmissionByTenderer.has(s.tendererId)) {
      latestSubmissionByTenderer.set(s.tendererId, {
        tenderSumCents: s.tenderSumCents,
        adjustedSumCents: s.adjustedSumCents,
      })
    }
  }

  let currentBidder: BidderHeader | null = null
  if (bidderId) {
    const target = tenRows.find((t) => t.id === bidderId)
    if (target) {
      const sub = latestSubmissionByTenderer.get(target.id)
      currentBidder = {
        id: target.id,
        code: target.code,
        name: target.companyName,
        tenderSumCents: sub?.tenderSumCents
          ? sub.tenderSumCents.toString()
          : null,
        adjustedSumCents: sub?.adjustedSumCents
          ? sub.adjustedSumCents.toString()
          : null,
        // Rank requires a project-wide ranking pass — not yet
        // implemented. Stays null until that lands; the UI shows "—".
        rank: null,
      }
    }
  }

  // ─── Per-section builders ────────────────────────────────────────
  // Each section starts as "all not_implemented" so the page never
  // hides a gap. As wiring lands, swap the call below for the real
  // builder (e.g. buildFotSection(projectId, baseRows)). Column counts
  // MUST match the section's `columns` array in `compliance-sections.tsx`
  // so cells line up.

  // Sections A + D + J + BoQ unpriced run concurrently — each makes
  // its own DB calls and gets base rows hydrated with its own
  // persisted QS state.
  const [
    formOfTender,
    termsAndConditions,
    billsOfQuantities,
    tenderersQualification,
    boqUnpriced,
    boqReview,
    bidderDeviations,
    projectFotRequirements,
    bidderFotSubmission,
    projectCocRequirements,
    bidderCocStanding,
    tenderDocumentsBuilt,
    tenderAddendaBuilt,
  ] = await Promise.all([
    buildFotSectionRows(projectId, baseRowsForSection("fot")),
    buildTacSectionRows(projectId, baseRowsForSection("tac")),
    buildBoqSectionRows(projectId, baseRowsForSection("boqs")),
    buildTenderersQualificationRows(projectId, baseRowsForSection("qual")),
    bidderId
      ? getBidderUnpricedItems(projectId, bidderId)
      : Promise.resolve({ included: [], excluded: [] }),
    bidderId
      ? getBidderBoqReviewData(projectId, bidderId)
      : Promise.resolve({
          arithmetical: [],
          highRates: [],
          lowRates: [],
          generalRequirementsRates: { high: [], low: [] },
        }),
    bidderId
      ? getBidderDeviations(bidderId)
      : Promise.resolve({ contractual: [], commercial: [], technical: [] }),
    getProjectFotRequirements(projectId),
    bidderId ? getBidderFotSubmission(bidderId) : Promise.resolve(null),
    getProjectCocRequirements(projectId),
    bidderId ? getBidderCocStanding(bidderId) : Promise.resolve(null),
    buildTenderDocumentsSectionRows(
      projectId,
      baseRowsForSection("tender-docs"),
    ),
    buildAddendaSectionRows(projectId, baseRowsForSection("addenda")),
  ])

  // Section B + E + G are now real builders above; expose the row
  // payloads (and side data we'll forward to the page) here.
  const tenderDocuments = tenderDocumentsBuilt.section
  const projectTenderDocuments = tenderDocumentsBuilt.documents
  const tenderAddenda = tenderAddendaBuilt.section
  const projectAddenda = tenderAddendaBuilt.project
  const bidderAddendaStanding = bidderId
    ? (tenderAddendaBuilt.byBidder[bidderId] ?? null)
    : null

  const signatureAuthority: ReviewSectionRows = {
    sectionKey: "sigauth",
    // Section C — single column per Figma 1280:66075: ["Power of Attorney"].
    // No POA extractor today; stays Not implemented.
    rows: baseRowsForSection("sigauth").map((r) => ({
      ...r,
      cells: notImpl(1),
    })),
  }
  const tenderBond: ReviewSectionRows = {
    sectionKey: "bond",
    // Section F — no Tender Bond extractor yet; stays Not implemented.
    rows: baseRowsForSection("bond").map((r) => ({
      ...r,
      cells: notImpl(2),
    })),
  }
  const valueEngineering: ReviewSectionRows = {
    sectionKey: "ve",
    // Section H (Figma 1287:41097) has no per-bidder pill row — the
    // table is row-level (one row per VE proposal), rendered via the
    // ComplianceCard's `children` slot.
    rows: baseRowsForSection("ve").map((r) => ({ ...r, cells: [] })),
  }
  const formOfMaintenance: ReviewSectionRows = {
    sectionKey: "maint",
    // Section I (Figma 1287:42013): 3 columns — Form of Maintenance
    // Agreement, Warranty Requirements, Service Response Commitments.
    rows: baseRowsForSection("maint").map((r) => ({
      ...r,
      cells: notImpl(3),
    })),
  }
  // (Section J `tenderersQualification` was produced by the Promise.all above)

  // ─── Filter every section to the SINGLE current bidder ──────────
  // The /projects/[id]/review/[bidderId] route is a per-bidder view.
  // Each compliance section renders one row only, matching the
  // Figma design (node 1280:64196). When no bidderId was supplied,
  // every section returns an empty rows array — the page header still
  // renders, but the per-section tables disappear cleanly.
  const filterToCurrent = (s: ReviewSectionRows): ReviewSectionRows => ({
    sectionKey: s.sectionKey,
    rows: bidderId ? s.rows.filter((r) => r.bidderId === bidderId) : [],
  })

  return {
    projectId,
    projectName: project.name,
    tenderers: tenRows.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.companyName,
    })),
    currentBidder,
    formOfTender: filterToCurrent(formOfTender),
    termsAndConditions: filterToCurrent(termsAndConditions),
    signatureAuthority: filterToCurrent(signatureAuthority),
    billsOfQuantities: filterToCurrent(billsOfQuantities),
    tenderDocuments: filterToCurrent(tenderDocuments),
    tenderBond: filterToCurrent(tenderBond),
    tenderAddenda: filterToCurrent(tenderAddenda),
    valueEngineering: filterToCurrent(valueEngineering),
    formOfMaintenance: filterToCurrent(formOfMaintenance),
    tenderersQualification: filterToCurrent(tenderersQualification),
    boqUnpriced,
    boqReview,
    bidderDeviations,
    projectFotRequirements,
    bidderFotSubmission: bidderId ? bidderFotSubmission : null,
    projectCocRequirements,
    bidderCocStanding: bidderId ? bidderCocStanding : null,
    projectTenderDocuments,
    projectAddenda,
    bidderAddendaStanding,
  }
}
