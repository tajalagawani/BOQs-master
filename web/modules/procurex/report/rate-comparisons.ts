"use server"

import { getProjectBoq } from "@/modules/procurex/boq/actions"

/**
 * Deterministic high / low rate detection — compares each bidder's
 * priced rate against the PTE rate on the same BoQ item. No reliance
 * on the AI flagger; runs purely from `boq_item_rate` data already
 * loaded by `getProjectBoq`.
 *
 *   variance% = (bidderRate − pteRate) / pteRate × 100
 *
 *   variance% ≥ HIGH_THRESHOLD  → "high" bucket
 *   variance% ≤ −LOW_THRESHOLD  → "low"  bucket
 */

const DEFAULT_HIGH_PCT = 20
const DEFAULT_LOW_PCT = 20

export interface CrossBidderRateComparison {
  /** `tender_flag.id` if this came from a flag row; otherwise the
   *  synthetic `${bidderId}:${itemId}`. Kept stable across reloads so
   *  React keys don't churn. */
  id: string
  bidderId: string
  bidderCode: string
  bidderName: string
  itemRef: string
  description: string
  unit: string
  rateCents: string
  baselineCents: string
  variancePct: number
  /** Always `true` for derived rows — we don't have a persisted
   *  Include-in-PTC toggle for these yet (DB row is computed). */
  includeInPtc: boolean
  /** "main" or "gr" (general requirements) based on the BoQ section's
   *  pricing_mode. Lets the GR sub-block filter separately. */
  pricingMode: "main" | "gr"
}

export interface RateComparisonBuckets {
  high: CrossBidderRateComparison[]
  low: CrossBidderRateComparison[]
  hasPte: boolean
  highThresholdPct: number
  lowThresholdPct: number
}

function toCents(value: string | null | undefined): bigint | null {
  if (!value) return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

export async function getRateComparisons(
  projectId: string,
  opts: { highPct?: number; lowPct?: number } = {},
): Promise<RateComparisonBuckets | null> {
  const result = await getProjectBoq(projectId)
  if (!result.ok) return null
  const { boq, pte, submissions } = result.data
  const highPct = opts.highPct ?? DEFAULT_HIGH_PCT
  const lowPct = opts.lowPct ?? DEFAULT_LOW_PCT

  if (!boq) {
    return {
      high: [],
      low: [],
      hasPte: false,
      highThresholdPct: highPct,
      lowThresholdPct: lowPct,
    }
  }

  // PTE rates keyed by BoQ item id (uses the entity-matched overlay
  // when available, falling back to direct id lookup on `pte.items`).
  const pteRatesByItemId = new Map<string, bigint>()
  if (pte) {
    for (const it of pte.items) {
      const rate = toCents(it.rateCents)
      if (rate !== null && rate > 0n) {
        pteRatesByItemId.set(it.id, rate)
      }
    }
  }
  for (const [id, r] of Object.entries(result.data.pteRatesByBoqItemId)) {
    if (!pteRatesByItemId.has(id)) {
      const rate = toCents(r.rateCents)
      if (rate !== null && rate > 0n) pteRatesByItemId.set(id, rate)
    }
  }

  const hasPte = pteRatesByItemId.size > 0

  // Item id → (description, unit, pricing mode) for fast lookup.
  const itemMeta = new Map<
    string,
    { ref: string; label: string; unit: string; sectionId: string }
  >()
  for (const it of boq.items) {
    itemMeta.set(it.id, {
      ref: it.no,
      label: it.label,
      unit: it.unit ?? "",
      sectionId: it.sectionId,
    })
  }
  // We need section.pricingMode but BoqViewerSection doesn't carry it
  // — boq_section is the source. For the report we don't strictly
  // need to distinguish here; mark every row "main" by default so the
  // high/low sub-blocks pick them up. The GR sub-block will be a v2
  // refinement that joins boq_section.pricing_mode.
  // (Kept as a forward-compatible field on the row.)

  const high: CrossBidderRateComparison[] = []
  const low: CrossBidderRateComparison[] = []

  if (!hasPte) {
    return {
      high,
      low,
      hasPte,
      highThresholdPct: highPct,
      lowThresholdPct: lowPct,
    }
  }

  for (const sub of submissions) {
    for (const it of sub.template.items) {
      const rate = toCents(it.rateCents)
      const pteRate = pteRatesByItemId.get(it.id)
      if (rate === null || rate === 0n || pteRate === undefined) continue
      // variance % = (rate − pte) / pte × 100  — kept in plain number
      // because rate ratios easily fit in JS-safe range.
      const variancePct =
        (Number(rate - pteRate) / Number(pteRate)) * 100
      if (!Number.isFinite(variancePct)) continue
      const meta = itemMeta.get(it.id)
      const row: CrossBidderRateComparison = {
        id: `${sub.tendererId}:${it.id}`,
        bidderId: sub.tendererId,
        bidderCode: sub.tendererCode,
        bidderName: sub.tendererName,
        itemRef: meta?.ref ?? it.no ?? it.id,
        description: meta?.label ?? it.label ?? "—",
        unit: meta?.unit ?? "",
        rateCents: rate.toString(),
        baselineCents: pteRate.toString(),
        variancePct,
        includeInPtc: true,
        pricingMode: "main",
      }
      if (variancePct >= highPct) high.push(row)
      else if (variancePct <= -lowPct) low.push(row)
    }
  }

  // Sort by bidder code (so groups stay contiguous), then by absolute
  // variance descending — the worst rows surface first within each
  // bidder's slice.
  const byCodeThenVariance = (
    a: CrossBidderRateComparison,
    b: CrossBidderRateComparison,
  ) => {
    const c = a.bidderCode.localeCompare(b.bidderCode, undefined, {
      numeric: true,
    })
    if (c !== 0) return c
    return Math.abs(b.variancePct) - Math.abs(a.variancePct)
  }
  high.sort(byCodeThenVariance)
  low.sort(byCodeThenVariance)

  return {
    high,
    low,
    hasPte,
    highThresholdPct: highPct,
    lowThresholdPct: lowPct,
  }
}
