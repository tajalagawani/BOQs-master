"use client"

import { useState } from "react"
import { TrendingDown } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

import {
  CrossBidderTableShell,
  tagGroups,
} from "./cross-bidder-table"
import {
  CrossBidderRateTable,
  type CrossBidderRateRow,
} from "./rate-analysis-table"
import { RateViewToggle, type RateView } from "./rate-view-toggle"
import {
  CrossBidderSectionRateTable,
  buildSectionComparisons,
} from "./section-comparison-table"

/**
 * Appendix C — BOQ Low rate items. Mirror of the high-rate block:
 * "Per item" view sources from `data.rateComparisons.low` (PTE-vs-
 * bidder rate), "Per section" view aggregates from `sumBreakdown`
 * and flags sections at ≤ −threshold % vs PTE.
 */
export function BoqLowRatesBlock({
  id,
  data,
  appendixC,
}: {
  id: string
  data: TenderReportData | null | undefined
  appendixC: AppendixCData | null
}) {
  const [view, setView] = useState<RateView>("item")
  const rateComparisons = data?.rateComparisons ?? null
  const sumBreakdown = data?.sumBreakdown ?? null
  const usingPte = (rateComparisons?.hasPte ?? false) === true
  const thresholdPct = rateComparisons?.lowThresholdPct ?? 20

  const itemRows: CrossBidderRateRow[] = usingPte
    ? (rateComparisons?.low ?? []).map((r) => ({
        id: r.id,
        bidderId: r.bidderId,
        bidderCode: r.bidderCode,
        bidderName: r.bidderName,
        itemRef: r.itemRef,
        description: r.description,
        unit: r.unit,
        rateCents: r.rateCents,
        baselineCents: r.baselineCents,
        variancePct: r.variancePct,
        includeInPtc: r.includeInPtc,
        isFirstInGroup: false,
      }))
    : (appendixC?.tenderers ?? []).flatMap((b) =>
        (appendixC?.byBidder[b.id]?.boqReview?.lowRates ?? []).map((r) => ({
          ...r,
          bidderId: b.id,
          bidderCode: b.code,
          bidderName: b.name,
          isFirstInGroup: false,
        })),
      )
  const taggedItems = tagGroups(itemRows)

  const sectionRows = buildSectionComparisons(
    sumBreakdown,
    "low",
    thresholdPct,
  )

  const rowCount = view === "item" ? itemRows.length : sectionRows.length
  const emptyLabel =
    view === "item"
      ? usingPte
        ? `No items below −${thresholdPct}% vs PTE`
        : "No low-rate flags yet"
      : `No sections below −${thresholdPct}% vs PTE`

  const thresholdNote = usingPte
    ? `Computed vs PTE. Threshold: ≤ −${thresholdPct}% of PTE.`
    : "PTE not loaded — falling back to `tender_flag(kind='low_rate')` rows."

  return (
    <CrossBidderTableShell
      id={id}
      title="BOQ Low rate items"
      hint={`Items priced significantly below the PTE benchmark — may indicate scope misunderstanding or aggressive pricing. ${thresholdNote}`}
      icon={<TrendingDown className="size-[16px] text-suite-navy" />}
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
        <CrossBidderRateTable rows={taggedItems} variancePositiveIsBad={false} />
      ) : (
        <CrossBidderSectionRateTable
          rows={sectionRows}
          variancePositiveIsBad={false}
        />
      )}
    </CrossBidderTableShell>
  )
}
