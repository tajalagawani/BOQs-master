"use client"

import { useState } from "react"
import { Activity } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

import {
  CrossBidderTableShell,
  tagGroups,
} from "./cross-bidder-table"
import {
  CrossBidderRateTable,
} from "./rate-analysis-table"
import { RateViewToggle, type RateView } from "./rate-view-toggle"
import {
  CrossBidderSectionRateTable,
  buildSectionComparisons,
  type CrossBidderSectionRow,
} from "./section-comparison-table"

/**
 * Appendix C — General Requirements: High / Low rates.
 *
 * Same "Per item / Per section" toggle pattern as the main high/low
 * blocks, but RESTRICTED to BoQ sections with
 * `pricing_mode='general_req'` (Prelims, OH&P, contingencies, etc.).
 *
 *  - Per item    → from `byBidder[id].boqReview.generalRequirementsRates`
 *                  (high + low combined; tone follows the sign of
 *                  the variance %).
 *  - Per section → derived from `data.sumBreakdown`, filtering its
 *                  sections to general_req only before running the
 *                  same threshold logic the main high/low uses.
 */
export function GenReqHighLowBlock({
  id,
  data,
  appendixC,
}: {
  id: string
  data: TenderReportData | null | undefined
  appendixC: AppendixCData | null
}) {
  const [view, setView] = useState<RateView>("item")
  const sumBreakdown = data?.sumBreakdown ?? null
  const thresholdPct =
    data?.rateComparisons?.highThresholdPct ??
    data?.rateComparisons?.lowThresholdPct ??
    20

  // Item view rows — high + low buckets combined, variance sign
  // carries the meaning.
  const tenderers = appendixC?.tenderers ?? []
  const itemRows = tenderers.flatMap((b) => {
    const both =
      appendixC?.byBidder[b.id]?.boqReview?.generalRequirementsRates
    const high = (both?.high ?? []).map((r) => ({
      ...r,
      bidderId: b.id,
      bidderCode: b.code,
      bidderName: b.name,
      isFirstInGroup: false,
    }))
    const low = (both?.low ?? []).map((r) => ({
      ...r,
      bidderId: b.id,
      bidderCode: b.code,
      bidderName: b.name,
      isFirstInGroup: false,
    }))
    return [...high, ...low]
  })
  const taggedItems = tagGroups(itemRows)

  // Section view — filter sumBreakdown to general_req sections only,
  // then run both high + low comparisons through it.
  const sectionRows: CrossBidderSectionRow[] = (() => {
    if (!sumBreakdown) return []
    const grOnly = {
      ...sumBreakdown,
      sections: sumBreakdown.sections.filter(
        (s) => s.pricingMode === "general_req",
      ),
    }
    const high = buildSectionComparisons(grOnly, "high", thresholdPct)
    const low = buildSectionComparisons(grOnly, "low", thresholdPct)
    const combined = [...high, ...low]
    combined.sort((a, b) => {
      const c = a.bidderCode.localeCompare(b.bidderCode, undefined, {
        numeric: true,
      })
      if (c !== 0) return c
      return Math.abs(b.variancePct) - Math.abs(a.variancePct)
    })
    return combined
  })()

  const rowCount = view === "item" ? itemRows.length : sectionRows.length
  const emptyLabel =
    view === "item"
      ? "No GR rate issues"
      : `No GR sections beyond ±${thresholdPct}% vs PTE`

  return (
    <CrossBidderTableShell
      id={id}
      title="General Requirements — High / Low rates"
      hint={`High/low flags on BoQ sections with \`pricing_mode='general_req'\` (Prelims, OH&P, contingencies). Threshold: ±${thresholdPct}%.`}
      icon={<Activity className="size-[16px] text-[#142845]" />}
      rowCount={rowCount}
      emptyLabel={emptyLabel}
      toolbar={
        <RateViewToggle
          value={view}
          onChange={setView}
          itemCount={itemRows.length}
          sectionCount={sectionRows.length}
        />
      }
    >
      {view === "item" ? (
        <CrossBidderRateTable rows={taggedItems} variancePositiveIsBad />
      ) : (
        <CrossBidderSectionRateTable rows={sectionRows} variancePositiveIsBad />
      )}
    </CrossBidderTableShell>
  )
}
