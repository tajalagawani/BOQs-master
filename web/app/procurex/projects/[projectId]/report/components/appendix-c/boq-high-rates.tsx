"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"

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
 * Appendix C — BOQ High-rate analysis.
 *
 * Two views, toggled via segmented control:
 *  - "Per item"    → row per BoQ item per bidder (rate vs PTE rate)
 *  - "Per section" → row per BoQ section per bidder (sum vs PTE sum)
 *
 * Item rows come from `data.rateComparisons.high` (deterministic vs
 * PTE). Section rows are derived client-side from
 * `data.sumBreakdown` so we don't ship a second fetcher for the
 * aggregate view.
 *
 * Falls back to the AI-flagged `boqReview.highRates` per bidder
 * when PTE isn't loaded yet (item view only — section view requires
 * PTE totals).
 */
export function BoqHighRatesBlock({
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
  const thresholdPct = rateComparisons?.highThresholdPct ?? 20

  // Item-view rows (PTE-derived first, AI-flag fallback otherwise).
  const itemRows: CrossBidderRateRow[] = usingPte
    ? (rateComparisons?.high ?? []).map((r) => ({
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
        (appendixC?.byBidder[b.id]?.boqReview?.highRates ?? []).map((r) => ({
          ...r,
          bidderId: b.id,
          bidderCode: b.code,
          bidderName: b.name,
          isFirstInGroup: false,
        })),
      )
  const taggedItems = tagGroups(itemRows)

  // Section-view rows (always derived from sumBreakdown).
  const sectionRows = buildSectionComparisons(
    sumBreakdown,
    "high",
    thresholdPct,
  )

  const rowCount = view === "item" ? itemRows.length : sectionRows.length
  const emptyLabel =
    view === "item"
      ? usingPte
        ? `No items above +${thresholdPct}% vs PTE`
        : "No high-rate flags yet"
      : `No sections above +${thresholdPct}% vs PTE`

  const thresholdNote = usingPte
    ? `Computed vs PTE. Threshold: ≥ +${thresholdPct}% of PTE.`
    : "PTE not loaded — falling back to `tender_flag(kind='high_rate')` rows."

  return (
    <CrossBidderTableShell
      id={id}
      title="BOQ High-rate analysis"
      hint={`Items priced significantly above the PTE benchmark. ${thresholdNote}`}
      icon={<TrendingUp className="size-[16px] text-suite-navy" />}
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
