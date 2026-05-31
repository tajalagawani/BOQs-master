import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { tendererSubmissions, tenderFlags } from "@/modules/analysis/schema"
import {
  boqItemRates,
  boqItems,
  boqPricesets,
  boqSections,
} from "@/modules/boq/schema"
import { db } from "@/modules/core/db"

/**
 * Per-bidder rows for Section D's BoQ Review sub-tables. Pulled from
 * `tender_flag` joined to `boq_item` so every sub-table has live data
 * — no mock fallback.
 *
 *   - Arithmetical Errors → tender_flag.kind = 'arithmetical_error'
 *   - High-rate analysis  → tender_flag.kind = 'high_rate'
 *   - Low-rate items      → tender_flag.kind = 'low_rate'
 *
 * Each row carries the BoQ-item context (no, label, unit) plus the
 * rate/amount the bidder submitted, so the UI can render the same
 * column shape as the Figma.
 */

export interface ArithmeticalErrorRow {
  id: string
  itemRef: string
  description: string
  document: string
  expected: string
  found: string
  difference: string
  includeInPtc: boolean
}

export interface RateAnalysisRow {
  id: string
  itemRef: string
  description: string
  unit: string
  rateCents: string
  baselineCents: string | null
  variancePct: number | null
  includeInPtc: boolean
}

export interface BoqReviewPayload {
  arithmetical: ArithmeticalErrorRow[]
  /** High-rate flags on MAIN-WORKS sections (pricing_mode='measured'). */
  highRates: RateAnalysisRow[]
  /** Low-rate flags on MAIN-WORKS sections (pricing_mode='measured'). */
  lowRates: RateAnalysisRow[]
  /** High/low rate flags filtered to GENERAL-REQUIREMENTS sections
   *  (pricing_mode='general_req'). Drives Section D's "General
   *  Requirements — High / Low rates" sub-block. */
  generalRequirementsRates: {
    high: RateAnalysisRow[]
    low: RateAnalysisRow[]
  }
}

/** Format an integer-cents bigint as AED with thousand-separators. */
function formatCents(cents: bigint | null): string {
  if (cents === null) return "—"
  const aed = Number(cents) / 100
  return aed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatSignedCents(cents: bigint | null): string {
  if (cents === null) return "—"
  const aed = Number(cents) / 100
  const sign = aed > 0 ? "+" : ""
  return `${sign}${aed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export async function getBidderBoqReviewData(
  projectId: string,
  bidderId: string,
): Promise<BoqReviewPayload> {
  void projectId

  // Latest applied submission for this bidder.
  const [submission] = await db
    .select({ id: tendererSubmissions.id })
    .from(tendererSubmissions)
    .where(eq(tendererSubmissions.tendererId, bidderId))
    .orderBy(desc(tendererSubmissions.submittedAt))
    .limit(1)
  if (!submission) {
    return {
      arithmetical: [],
      highRates: [],
      lowRates: [],
      generalRequirementsRates: { high: [], low: [] },
    }
  }

  // Bidder's submission priceset(s).
  const pricesets = await db
    .select({ id: boqPricesets.id })
    .from(boqPricesets)
    .where(
      and(
        eq(boqPricesets.ownerKind, "submission"),
        eq(boqPricesets.ownerId, submission.id),
      ),
    )
  if (pricesets.length === 0) {
    return {
      arithmetical: [],
      highRates: [],
      lowRates: [],
      generalRequirementsRates: { high: [], low: [] },
    }
  }
  const pricesetIds = pricesets.map((p) => p.id)

  // Pull every flag row for this bidder plus the BoQ-item context and
  // the bidder's submitted rate/amount. Joins `boq_section` so we can
  // bucket high/low rate flags by `pricing_mode` (measured = main works,
  // general_req = Section D's General Requirements sub-block).
  const rows = await db
    .select({
      flagId: tenderFlags.id,
      kind: tenderFlags.kind,
      payload: tenderFlags.payload,
      itemId: tenderFlags.itemId,
      itemNo: boqItems.no,
      itemLabel: boqItems.label,
      itemUnit: boqItems.unit,
      pricingMode: boqSections.pricingMode,
      rateCents: boqItemRates.unitRateCents,
      amountCents: boqItemRates.amountCents,
    })
    .from(tenderFlags)
    .innerJoin(boqItems, eq(boqItems.id, tenderFlags.itemId))
    .innerJoin(boqSections, eq(boqSections.id, boqItems.sectionId))
    .leftJoin(
      boqItemRates,
      and(
        eq(boqItemRates.itemId, tenderFlags.itemId),
        inArray(boqItemRates.pricesetId, pricesetIds),
      ),
    )
    .where(eq(tenderFlags.submissionId, submission.id))

  const arithmetical: ArithmeticalErrorRow[] = []
  const highRates: RateAnalysisRow[] = []
  const lowRates: RateAnalysisRow[] = []
  const grHigh: RateAnalysisRow[] = []
  const grLow: RateAnalysisRow[] = []

  for (const r of rows) {
    if (!r.itemId) continue
    if (r.kind === "arithmetical_error") {
      const payload = (r.payload ?? {}) as {
        expectedCents?: string
        gotCents?: string
        documentSource?: string
      }
      const expected = payload.expectedCents
        ? formatCents(BigInt(payload.expectedCents))
        : r.amountCents
          ? formatCents(r.amountCents)
          : "—"
      const found = payload.gotCents
        ? formatCents(BigInt(payload.gotCents))
        : r.amountCents
          ? formatCents(r.amountCents)
          : "—"
      const diff =
        payload.expectedCents && payload.gotCents
          ? formatSignedCents(
              BigInt(payload.gotCents) - BigInt(payload.expectedCents),
            )
          : "—"
      arithmetical.push({
        id: r.flagId,
        itemRef: r.itemNo,
        description: r.itemLabel,
        document: payload.documentSource ?? "BoQ",
        expected,
        found,
        difference: diff,
        includeInPtc: true,
      })
    } else if (r.kind === "high_rate" || r.kind === "low_rate") {
      const payload = (r.payload ?? {}) as {
        variancePct?: number
        baselineCents?: string
      }
      const row: RateAnalysisRow = {
        id: r.flagId,
        itemRef: r.itemNo,
        description: r.itemLabel,
        unit: r.itemUnit ?? "",
        rateCents: r.rateCents ? r.rateCents.toString() : "0",
        baselineCents: payload.baselineCents ?? null,
        variancePct: payload.variancePct ?? null,
        includeInPtc: true,
      }
      const isGeneralReq = r.pricingMode === "general_req"
      if (r.kind === "high_rate") {
        if (isGeneralReq) grHigh.push(row)
        else highRates.push(row)
      } else {
        if (isGeneralReq) grLow.push(row)
        else lowRates.push(row)
      }
    }
  }

  return {
    arithmetical,
    highRates,
    lowRates,
    generalRequirementsRates: { high: grHigh, low: grLow },
  }
}
