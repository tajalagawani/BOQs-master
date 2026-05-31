import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { tendererSubmissions } from "@/modules/analysis/schema"
import { boqItemRates, boqItems, boqPricesets } from "@/modules/boq/schema"
import { db } from "@/modules/core/db"

/**
 * Per-bidder Unpriced / Incomplete items for the Section D sub-table
 * (Figma 1279:61031). Pulled from the bidder's applied priceset:
 *
 *   tender_submission → boq_priceset (ownerKind='submission')
 *                     → boq_item_rate (is_unpriced = true)
 *                     → boq_item (label / unit / quantity)
 *
 * Today the schema can't tell apart Included/Incomplete vs Excluded
 * (we don't have an `excluded_kind` column). Everything is currently
 * classified as **Included / Missing price** so the row is visible
 * and the QS knows what's missing. The "Excluded" tab returns empty
 * until we add that field.
 */

export interface UnpricedRow {
  id: string
  itemRef: string
  boqItem: string
  unit: string
  quantity: string
  tendererEntry: "Included" | "Excluded" | "By others" | "By client"
  impactAed: string
  impactWarning?: boolean
  instruction?: "Price item" | "Missing unit rate" | "Missing price"
  includeInPtc: boolean
}

export interface BoqUnpricedPayload {
  included: UnpricedRow[]
  excluded: UnpricedRow[]
}

export async function getBidderUnpricedItems(
  projectId: string,
  bidderId: string,
): Promise<BoqUnpricedPayload> {
  void projectId
  // Find this bidder's latest applied submission, then its priceset.
  const [submission] = await db
    .select({ id: tendererSubmissions.id })
    .from(tendererSubmissions)
    .where(eq(tendererSubmissions.tendererId, bidderId))
    .orderBy(desc(tendererSubmissions.submittedAt))
    .limit(1)
  if (!submission) return { included: [], excluded: [] }

  const pricesets = await db
    .select({ id: boqPricesets.id })
    .from(boqPricesets)
    .where(
      and(
        eq(boqPricesets.ownerKind, "submission"),
        eq(boqPricesets.ownerId, submission.id),
      ),
    )
  if (pricesets.length === 0) return { included: [], excluded: [] }
  const pricesetIds = pricesets.map((p) => p.id)

  // Pull every unpriced rate row joined to its BoQ item.
  const rows = await db
    .select({
      rateId: boqItemRates.id,
      itemId: boqItemRates.itemId,
      itemNo: boqItems.no,
      itemLabel: boqItems.label,
      itemUnit: boqItems.unit,
      itemQuantity: boqItems.quantityPlanned,
      unitRateCents: boqItemRates.unitRateCents,
      amountCents: boqItemRates.amountCents,
    })
    .from(boqItemRates)
    .innerJoin(boqItems, eq(boqItems.id, boqItemRates.itemId))
    .where(
      and(
        inArray(boqItemRates.pricesetId, pricesetIds),
        eq(boqItemRates.isUnpriced, true),
      ),
    )

  const included: UnpricedRow[] = rows.map((r) => {
    // The instruction depends on which field is missing:
    //   - no unitRate at all          → "Missing price"
    //   - unitRate present, no amount → "Missing unit rate" (rare —
    //     the parser fills both or neither, but keep the branch)
    const hasRate = r.unitRateCents !== null
    const hasAmount = r.amountCents !== null
    const instruction: UnpricedRow["instruction"] = hasRate
      ? hasAmount
        ? "Price item"
        : "Missing unit rate"
      : "Missing price"
    const qty =
      r.itemQuantity !== null && r.itemQuantity !== undefined
        ? String(r.itemQuantity)
        : "—"
    return {
      id: r.rateId,
      itemRef: r.itemNo,
      boqItem: r.itemLabel,
      unit: r.itemUnit ?? "",
      quantity: qty,
      tendererEntry: "Included",
      impactAed: "—",
      instruction,
      includeInPtc: true,
    }
  })

  // Excluded items need an `excluded_kind` column we don't have yet.
  // Stays empty so the C2 table shows its honest empty state.
  const excluded: UnpricedRow[] = []

  return { included, excluded }
}
