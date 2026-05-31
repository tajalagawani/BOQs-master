"use server"

import { and, eq, inArray } from "drizzle-orm"

import { boqSections } from "@/modules/boq/schema"
import { db } from "@/modules/core/db"
import { getProjectBoq } from "@/modules/procurex/boq/actions"

/**
 * Per-section per-tenderer BoQ totals — the data source for:
 *   - Section 03's "Tender Sum Breakdown (AED)" matrix
 *   - Appendix A's "Adjusted tender sums" matrix
 *   - Appendix C's "Bills of Quantities — Tender Sum Breakdown"
 *
 * The BoQ route's `getProjectBoq` already hydrates the project's BoQ
 * template + each tenderer's applied rates against the template. We
 * piggy-back on it: sum each section's `amountCents` per tenderer,
 * plus the same column for the PTE.
 *
 * Output uses cents-as-string for bigint values so the payload
 * round-trips through Server Components without precision loss.
 */

export interface TenderSumSection {
  id: string
  no: string
  label: string
  position: number
  /** `measured` = main-works BoQ section (Sections B–R typically).
   *  `general_req` = preliminaries / OH&P / contingency style sections.
   *  Drives the GR-only filter in Appendix C's General Requirements
   *  rate sub-block. */
  pricingMode: "measured" | "general_req" | null
}

export interface TenderSumBidder {
  id: string
  code: string
  name: string
  /** Bottom-of-table totals — copied from `tenderer_submissions` so
   *  they match the value the QS sees on the bidder cards. */
  tenderSumCents: string | null
  adjustedSumCents: string | null
  variancePctVsPte: number | null
}

export interface TenderSumBreakdown {
  sections: TenderSumSection[]
  bidders: TenderSumBidder[]
  /** sectionId → bidderId → cents string. Missing key means the
   *  bidder hasn't priced that section yet (renders "—"). */
  perSection: Record<string, Record<string, string>>
  /** sectionId → PTE total cents string. Null when no PTE loaded. */
  pteBySection: Record<string, string | null>
  /** Project-level totals.  */
  totals: {
    perBidder: Record<string, string | null>
    pte: string | null
  }
}

function sumCentsStrings(values: Array<string | null | undefined>): bigint {
  let acc = 0n
  for (const v of values) {
    if (!v) continue
    try {
      acc += BigInt(v)
    } catch {
      // skip non-numeric / overflow values
    }
  }
  return acc
}

export async function getTenderSumBreakdown(
  projectId: string,
): Promise<TenderSumBreakdown | null> {
  const result = await getProjectBoq(projectId)
  if (!result.ok) return null
  const { boq, pte, submissions, summary } = result.data
  if (!boq) {
    return {
      sections: [],
      bidders: [],
      perSection: {},
      pteBySection: {},
      totals: { perBidder: {}, pte: null },
    }
  }

  // Hydrate `boq_section.pricing_mode` for each section so the report
  // can split sections into measured vs general_req buckets. The
  // BoQ-viewer payload doesn't carry this field, so we look it up
  // directly. One IN query for the whole project's sections.
  const sectionIds = boq.sections.map((s) => s.id)
  const pricingModeRows =
    sectionIds.length > 0
      ? await db
          .select({ id: boqSections.id, pricingMode: boqSections.pricingMode })
          .from(boqSections)
          .where(
            and(
              inArray(boqSections.id, sectionIds),
              eq(boqSections.templateId, boq.id),
            ),
          )
      : []
  const pricingModeById = new Map(
    pricingModeRows.map((r) => [r.id, r.pricingMode] as const),
  )

  const sections: TenderSumSection[] = boq.sections.map((s) => ({
    id: s.id,
    no: s.no,
    label: s.label,
    position: s.position,
    pricingMode: pricingModeById.get(s.id) ?? null,
  }))

  // Map sections → items for O(1) lookup when summing per section.
  const itemsBySection = new Map<string, string[]>()
  for (const it of boq.items) {
    const arr = itemsBySection.get(it.sectionId) ?? []
    arr.push(it.id)
    itemsBySection.set(it.sectionId, arr)
  }

  // ── PTE: sum per section.
  const pteRatesByItemId: Map<string, string | null> = new Map()
  if (pte) {
    for (const it of pte.items) {
      pteRatesByItemId.set(it.id, it.amountCents ?? null)
    }
  }
  const pteBySection: Record<string, string | null> = {}
  let ptePerProject: bigint | null = pte ? 0n : null
  for (const sec of sections) {
    const itemIds = itemsBySection.get(sec.id) ?? []
    if (!pte) {
      pteBySection[sec.id] = null
      continue
    }
    const sum = sumCentsStrings(itemIds.map((id) => pteRatesByItemId.get(id)))
    pteBySection[sec.id] = sum.toString()
    if (ptePerProject !== null) ptePerProject += sum
  }

  // ── Bidder columns.
  const summaryByTenderer = new Map(
    summary.map((s) => [s.tendererId, s] as const),
  )
  const bidders: TenderSumBidder[] = submissions.map((s) => {
    const sum = summaryByTenderer.get(s.tendererId)
    return {
      id: s.tendererId,
      code: s.tendererCode,
      name: s.tendererName,
      tenderSumCents: sum?.tenderSumCents ?? null,
      adjustedSumCents: sum?.adjustedSumCents ?? null,
      variancePctVsPte: sum?.variancePctVsPte ?? null,
    }
  })

  const perSection: Record<string, Record<string, string>> = {}
  const totalsPerBidder: Record<string, string | null> = {}
  for (const sec of sections) perSection[sec.id] = {}

  for (const sub of submissions) {
    const ratesByItemId = new Map<string, string | null>()
    for (const it of sub.template.items) {
      ratesByItemId.set(it.id, it.amountCents ?? null)
    }
    let bidderTotal: bigint | null = null
    for (const sec of sections) {
      const itemIds = itemsBySection.get(sec.id) ?? []
      const sum = sumCentsStrings(itemIds.map((id) => ratesByItemId.get(id)))
      if (sum > 0n) {
        perSection[sec.id]![sub.tendererId] = sum.toString()
        bidderTotal = (bidderTotal ?? 0n) + sum
      }
    }
    totalsPerBidder[sub.tendererId] = bidderTotal?.toString() ?? null
  }

  return {
    sections,
    bidders,
    perSection,
    pteBySection,
    totals: {
      perBidder: totalsPerBidder,
      pte: ptePerProject?.toString() ?? null,
    },
  }
}
