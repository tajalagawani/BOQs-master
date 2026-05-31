"use server"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { tendererSubmissions } from "@/modules/analysis/schema"
import { boqSections } from "@/modules/boq/schema"
import { companies } from "@/modules/companies/schema"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { getProjectBoq } from "@/modules/procurex/boq/actions"
import type {
  BoqViewerItem,
  BoqViewerSection,
} from "@/modules/procurex/boq/actions"
import { projects } from "@/modules/procurex/projects/schema"
import { getBidderReviewData } from "@/modules/procurex/review/bidder-review-data"
import type { BidderReviewData } from "@/modules/procurex/review/types"
import { tenderers } from "@/modules/procurex/tenderers/schema"

import { getBoqChangeEvents, type BoqChangeEvents } from "./boq-changes"
import { getRateComparisons, type RateComparisonBuckets } from "./rate-comparisons"
import { getTenderSumBreakdown, type TenderSumBreakdown } from "./sum-breakdown"

/**
 * Single comprehensive project snapshot.
 *
 * Returns everything a downstream consumer (report, export, AI agent,
 * audit) needs in one structured tree:
 *
 *   project · documents · sections (with items × per-bidder rates)
 *   · tenderers (with full review data per bidder)
 *   · comparisons (item/section/bidder vs PTE)
 *   · rankings · events · counts
 *
 * Designed to be stable + traversable: every collection is keyed by
 * a stable id, every monetary value is cents-as-string for bigint
 * safety, and every nested fetcher is reused from the existing
 * modules so the snapshot stays in sync with the per-page views.
 */

export interface ProjectSnapshotMeta {
  generatedAt: string
  schemaVersion: 1
}

export interface SnapshotProject {
  id: string
  name: string
  workspaceId: string
  currency: string | null
  city: string | null
  country: string | null
  projectType: string | null
  basisOfTender: string | null
  conditionsOfContract: string | null
  gfa: string | null
  bua: string | null
  tenderIssuedAt: string | null
  originalReturnAt: string | null
  adjustedReturnAt: string | null
}

export interface SnapshotDocument {
  id: string
  category: string | null
  filename: string
  scope: string | null
  targetKind: string | null
  uploadedAt: string | null
}

export interface SnapshotItemPricing {
  bidderId: string
  rateCents: string | null
  amountCents: string | null
}

export interface SnapshotItem {
  id: string
  no: string
  label: string
  unit: string | null
  quantityPlanned: string | null
  /** PTE rate + amount when loaded. Null when PTE is missing for this item. */
  pteRateCents: string | null
  pteAmountCents: string | null
  bidders: SnapshotItemPricing[]
}

export interface SnapshotSectionTotals {
  pteCents: string | null
  perBidder: Record<string, string | null>
}

export interface SnapshotSection {
  id: string
  no: string
  label: string
  position: number
  pricingMode: "measured" | "general_req" | null
  itemCount: number
  totals: SnapshotSectionTotals
  items: SnapshotItem[]
}

export interface SnapshotBidder {
  id: string
  code: string
  name: string
  companyId: string | null
  submission: {
    tenderSumCents: string | null
    adjustedSumCents: string | null
    submittedAt: string | null
  }
  /** Counts surfaced by the bidder card (variance, high-rate, …). */
  counts: {
    variance: number
    highRate: number
    lowRate: number
    unpriced: number
    arithmeticalError: number
    commercial: number
    technical: number
    contractual: number
  }
  /** Variance vs PTE (real %); positive = above the PTE. */
  variancePctVsPte: number | null
  /** Full review payload for this bidder — Section A/B/D/J/etc. */
  review: BidderReviewData | null
}

export interface SnapshotComparisonItem {
  itemId: string
  bidderId: string
  bidderRateCents: string
  pteRateCents: string
  variancePct: number
  pricingMode: "measured" | "general_req" | null
}

export interface SnapshotComparisonSection {
  sectionId: string
  bidderId: string
  bidderAmountCents: string
  baselineCents: string
  baselineSource: "pte" | "bidder_mean"
  variancePct: number
}

export interface SnapshotComparisonBidder {
  bidderId: string
  /** Effective tender sum used for variance — adjusted ?? tender sum. */
  effectiveCents: string | null
  /** Lowest applied sum across all bidders. */
  lowestCents: string | null
  /** PTE project total. */
  pteCents: string | null
  variancePctVsPte: number | null
  variancePctVsLowest: number | null
  rank: number
  isLowest: boolean
}

export interface SnapshotComparisons {
  item: SnapshotComparisonItem[]
  section: SnapshotComparisonSection[]
  bidder: SnapshotComparisonBidder[]
}

export interface ProjectSnapshot {
  meta: ProjectSnapshotMeta
  project: SnapshotProject
  documents: SnapshotDocument[]
  sections: SnapshotSection[]
  bidders: SnapshotBidder[]
  comparisons: SnapshotComparisons
  events: BoqChangeEvents | null
  /** Raw payloads from the existing fetchers — included so downstream
   *  consumers don't need to call them separately. */
  raw: {
    sumBreakdown: TenderSumBreakdown | null
    rateComparisons: RateComparisonBuckets | null
  }
}

function toBigInt(value: string | null | undefined): bigint | null {
  if (!value) return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

function sumCents(values: Array<string | null | undefined>): bigint {
  let acc = 0n
  for (const v of values) {
    const n = toBigInt(v)
    if (n !== null) acc += n
  }
  return acc
}

export async function getProjectSnapshot(
  projectId: string,
): Promise<ProjectSnapshot | null> {
  // ── Project header ────────────────────────────────────────────
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      workspaceId: projects.workspaceId,
      currency: projects.currency,
      city: projects.city,
      country: projects.country,
      projectType: projects.projectType,
      basisOfTender: projects.basisOfTender,
      conditionsOfContract: projects.conditionsOfContract,
      gfa: projects.gfa,
      bua: projects.bua,
      tenderIssuedAt: projects.tenderIssuedAt,
      originalReturnAt: projects.originalReturnAt,
      adjustedReturnAt: projects.adjustedReturnAt,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return null

  // ── Tenderers + latest submission per tenderer ────────────────
  const tenRows = await db
    .select({
      id: tenderers.id,
      code: tenderers.code,
      companyId: tenderers.companyId,
      companyName: companies.name,
    })
    .from(tenderers)
    .innerJoin(companies, eq(companies.id, tenderers.companyId))
    .where(
      and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)),
    )
    .orderBy(tenderers.code)

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
  const latestSubByTen = new Map<string, (typeof submissionRows)[number]>()
  for (const s of submissionRows) {
    if (!latestSubByTen.has(s.tendererId)) latestSubByTen.set(s.tendererId, s)
  }

  // ── Heavy parallel fan-out ───────────────────────────────────
  const [boqResult, sumBreakdown, rateComparisons, boqChanges, reviewPayloads] =
    await Promise.all([
      getProjectBoq(projectId),
      getTenderSumBreakdown(projectId),
      getRateComparisons(projectId),
      getBoqChangeEvents(projectId),
      Promise.all(
        tenRows.map((t) => getBidderReviewData(projectId, t.id)),
      ),
    ])

  const reviewByBidder = new Map<string, BidderReviewData>()
  tenRows.forEach((t, i) => {
    const p = reviewPayloads[i]
    if (p) reviewByBidder.set(t.id, p)
  })

  // ── Documents ─────────────────────────────────────────────────
  const docRows = await db
    .select({
      id: documents.id,
      category: documents.category,
      filename: documents.filename,
      scope: documents.scope,
      targetKind: documents.targetKind,
      uploadedAt: documents.uploadedAt,
    })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.uploadedAt))

  // ── Section pricing-mode lookup (BoQ viewer doesn't carry it) ──
  const boqData = boqResult.ok ? boqResult.data : null
  const pricingModeBySectionId = new Map<
    string,
    "measured" | "general_req"
  >()
  if (boqData?.boq) {
    const ids = boqData.boq.sections.map((s) => s.id)
    if (ids.length > 0) {
      const rows = await db
        .select({
          id: boqSections.id,
          pricingMode: boqSections.pricingMode,
        })
        .from(boqSections)
        .where(
          and(
            inArray(boqSections.id, ids),
            eq(boqSections.templateId, boqData.boq.id),
          ),
        )
      for (const r of rows) pricingModeBySectionId.set(r.id, r.pricingMode)
    }
  }

  // ── Per-bidder rate lookup keyed by itemId ─────────────────────
  const submissionsByBidder = new Map<
    string,
    Map<string, { rateCents: string | null; amountCents: string | null }>
  >()
  if (boqData) {
    for (const sub of boqData.submissions) {
      const ratesByItem = new Map<
        string,
        { rateCents: string | null; amountCents: string | null }
      >()
      for (const it of sub.template.items) {
        ratesByItem.set(it.id, {
          rateCents: it.rateCents,
          amountCents: it.amountCents,
        })
      }
      submissionsByBidder.set(sub.tendererId, ratesByItem)
    }
  }

  // ── Build the sections × items tree ───────────────────────────
  const itemsBySection = new Map<string, BoqViewerItem[]>()
  if (boqData?.boq) {
    for (const it of boqData.boq.items) {
      const arr = itemsBySection.get(it.sectionId) ?? []
      arr.push(it)
      itemsBySection.set(it.sectionId, arr)
    }
  }

  const sectionsOut: SnapshotSection[] = []
  if (boqData?.boq) {
    for (const sec of boqData.boq.sections as BoqViewerSection[]) {
      const items: SnapshotItem[] = (itemsBySection.get(sec.id) ?? []).map(
        (it) => {
          const pteOverlay = boqData.pteRatesByBoqItemId[it.id] ?? null
          const pteRateCents = pteOverlay?.rateCents ?? null
          const pteAmountCents = pteOverlay?.amountCents ?? null
          const bidders: SnapshotItemPricing[] = tenRows.map((t) => {
            const rates = submissionsByBidder.get(t.id)?.get(it.id)
            return {
              bidderId: t.id,
              rateCents: rates?.rateCents ?? null,
              amountCents: rates?.amountCents ?? null,
            }
          })
          return {
            id: it.id,
            no: it.no,
            label: it.label,
            unit: it.unit,
            quantityPlanned: it.quantityPlanned,
            pteRateCents,
            pteAmountCents,
            bidders,
          }
        },
      )

      // Section totals.
      const pteTotal = items.reduce(
        (acc, it) => acc + (toBigInt(it.pteAmountCents) ?? 0n),
        0n,
      )
      const perBidder: Record<string, string | null> = {}
      for (const t of tenRows) {
        const total = items.reduce((acc, it) => {
          const bp = it.bidders.find((b) => b.bidderId === t.id)
          return acc + (toBigInt(bp?.amountCents ?? null) ?? 0n)
        }, 0n)
        perBidder[t.id] = total > 0n ? total.toString() : null
      }

      sectionsOut.push({
        id: sec.id,
        no: sec.no,
        label: sec.label,
        position: sec.position,
        pricingMode: pricingModeBySectionId.get(sec.id) ?? null,
        itemCount: sec.itemCount,
        totals: {
          pteCents: pteTotal > 0n ? pteTotal.toString() : null,
          perBidder,
        },
        items,
      })
    }
  }

  // ── Bidders array with counts + review ────────────────────────
  const summaryByTen = new Map(
    (boqData?.summary ?? []).map((s) => [s.tendererId, s] as const),
  )
  const biddersOut: SnapshotBidder[] = tenRows.map((t) => {
    const sub = latestSubByTen.get(t.id)
    const summary = summaryByTen.get(t.id)
    return {
      id: t.id,
      code: t.code,
      name: t.companyName,
      companyId: t.companyId,
      submission: {
        tenderSumCents: sub?.tenderSumCents
          ? sub.tenderSumCents.toString()
          : null,
        adjustedSumCents: sub?.adjustedSumCents
          ? sub.adjustedSumCents.toString()
          : null,
        submittedAt: sub?.submittedAt
          ? sub.submittedAt.toISOString()
          : null,
      },
      counts: {
        variance: summary?.flagCounts.variance ?? 0,
        highRate: summary?.flagCounts.highRate ?? 0,
        lowRate: summary?.flagCounts.lowRate ?? 0,
        unpriced: summary?.flagCounts.unpriced ?? 0,
        arithmeticalError: summary?.flagCounts.arithmeticalError ?? 0,
        commercial: summary?.flagCounts.commercial ?? 0,
        technical: summary?.flagCounts.technical ?? 0,
        contractual: summary?.flagCounts.contractual ?? 0,
      },
      variancePctVsPte: summary?.variancePctVsPte ?? null,
      review: reviewByBidder.get(t.id) ?? null,
    }
  })

  // ── Comparisons ──────────────────────────────────────────────
  const itemCmp: SnapshotComparisonItem[] = []
  for (const sec of sectionsOut) {
    for (const it of sec.items) {
      const pteRate = toBigInt(it.pteRateCents)
      if (pteRate === null || pteRate === 0n) continue
      for (const bp of it.bidders) {
        const bRate = toBigInt(bp.rateCents)
        if (bRate === null || bRate === 0n) continue
        const variancePct =
          (Number(bRate - pteRate) / Number(pteRate)) * 100
        if (!Number.isFinite(variancePct)) continue
        itemCmp.push({
          itemId: it.id,
          bidderId: bp.bidderId,
          bidderRateCents: bRate.toString(),
          pteRateCents: pteRate.toString(),
          variancePct,
          pricingMode: sec.pricingMode,
        })
      }
    }
  }

  const sectionCmp: SnapshotComparisonSection[] = []
  for (const sec of sectionsOut) {
    const ptePresent = sec.totals.pteCents !== null
    let baseline: bigint | null = toBigInt(sec.totals.pteCents)
    let source: "pte" | "bidder_mean" = "pte"
    if (!ptePresent || baseline === null || baseline === 0n) {
      const bidderValues = Object.values(sec.totals.perBidder).filter(
        (v): v is string => v !== null,
      )
      if (bidderValues.length > 0) {
        const sum = sumCents(bidderValues)
        baseline = sum / BigInt(bidderValues.length)
        source = "bidder_mean"
      } else {
        baseline = null
      }
    }
    if (baseline === null || baseline === 0n) continue
    for (const [bidderId, total] of Object.entries(sec.totals.perBidder)) {
      const b = toBigInt(total)
      if (b === null) continue
      const variancePct =
        (Number(b - baseline) / Number(baseline)) * 100
      if (!Number.isFinite(variancePct)) continue
      sectionCmp.push({
        sectionId: sec.id,
        bidderId,
        bidderAmountCents: b.toString(),
        baselineCents: baseline.toString(),
        baselineSource: source,
        variancePct,
      })
    }
  }

  const bidderCmp: SnapshotComparisonBidder[] = (() => {
    const ranked = [...biddersOut]
      .map((b) => ({
        bidder: b,
        cents:
          toBigInt(b.submission.adjustedSumCents) ??
          toBigInt(b.submission.tenderSumCents),
      }))
      .filter(
        (x): x is { bidder: SnapshotBidder; cents: bigint } =>
          x.cents !== null,
      )
      .sort((a, b) => (a.cents < b.cents ? -1 : a.cents > b.cents ? 1 : 0))
    const lowest = ranked[0]?.cents ?? null
    const pteCents = toBigInt(sumBreakdown?.totals.pte ?? null)
    const out: SnapshotComparisonBidder[] = []
    let rank = 0
    for (const { bidder, cents } of ranked) {
      rank += 1
      const vsLow =
        lowest && lowest > 0n
          ? Number(((cents - lowest) * 10_000n) / lowest) / 100
          : null
      const vsPte =
        pteCents && pteCents > 0n
          ? Number(((cents - pteCents) * 10_000n) / pteCents) / 100
          : (bidder.variancePctVsPte ?? null)
      out.push({
        bidderId: bidder.id,
        effectiveCents: cents.toString(),
        lowestCents: lowest?.toString() ?? null,
        pteCents: pteCents?.toString() ?? null,
        variancePctVsPte: vsPte,
        variancePctVsLowest: vsLow,
        rank,
        isLowest: cents === lowest,
      })
    }
    // Bidders without a submission still appear, with rank after the
    // ranked ones, so the snapshot is exhaustive.
    let unrankedRank = ranked.length
    for (const b of biddersOut) {
      if (out.some((x) => x.bidderId === b.id)) continue
      unrankedRank += 1
      out.push({
        bidderId: b.id,
        effectiveCents: null,
        lowestCents: lowest?.toString() ?? null,
        pteCents: pteCents?.toString() ?? null,
        variancePctVsPte: null,
        variancePctVsLowest: null,
        rank: unrankedRank,
        isLowest: false,
      })
    }
    return out
  })()

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    project: {
      id: project.id,
      name: project.name,
      workspaceId: project.workspaceId,
      currency: project.currency,
      city: project.city,
      country: project.country,
      projectType: project.projectType,
      basisOfTender: project.basisOfTender,
      conditionsOfContract: project.conditionsOfContract,
      gfa: project.gfa,
      bua: project.bua,
      tenderIssuedAt: project.tenderIssuedAt,
      originalReturnAt: project.originalReturnAt,
      adjustedReturnAt: project.adjustedReturnAt,
    },
    documents: docRows.map((d) => ({
      id: d.id,
      category: d.category,
      filename: d.filename,
      scope: d.scope,
      targetKind: d.targetKind,
      uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString() : null,
    })),
    sections: sectionsOut,
    bidders: biddersOut,
    comparisons: {
      item: itemCmp,
      section: sectionCmp,
      bidder: bidderCmp,
    },
    events: boqChanges,
    raw: {
      sumBreakdown,
      rateComparisons,
    },
  }
}
