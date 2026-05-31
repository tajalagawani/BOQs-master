"use client"

import { ChevronUp } from "lucide-react"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { formatAed } from "./section-shell"

/**
 * 01. Executive Summary — Figma 1295:86680 "Executive Overview Accordion".
 *
 * Card layout:
 *  - Header row: "01" pill + "Executive Summary" + chevron
 *  - Subtitle: "This is a commercial evaluation summary..."
 *  - PTE callout box (light blue) with 3 sentence rows using real
 *    template values:
 *      {Lowest} is the lowest tenderer at {Sum}, which is {V}% {above|below} the PTE.
 *      {Most commercially compliant} is the most compliant commercial by {%}.
 *      {Most technically compliant} is the most compliant technical by {%}.
 *  - QS Recommendation textarea
 */
export function ExecutiveSummarySection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { rankings, lowestBidderId, bidders, sumBreakdown } = data
  const lowest = rankings.find((r) => r.bidderId === lowestBidderId)
  const lowestName = lowest?.name ?? "—"
  const lowestSum = formatAed(
    lowest?.adjustedSumCents ?? lowest?.tenderSumCents ?? null,
  )

  // Real variance vs PTE — sourced from `summary.variancePctVsPte`
  // (which `getProjectBoq` computes per bidder against the PTE total).
  // Positive = above the PTE, negative = below.
  const lowestVariancePct =
    sumBreakdown?.bidders.find((b) => b.id === lowestBidderId)?.variancePctVsPte ??
    null
  const varianceVsPte =
    lowestVariancePct === null
      ? "—"
      : `${Math.abs(lowestVariancePct).toFixed(1)}%`
  const direction =
    lowestVariancePct === null
      ? "vs"
      : lowestVariancePct > 0
        ? "above"
        : lowestVariancePct < 0
          ? "below"
          : "matching"

  // Commercial / technical compliance leaders — for now we pick the
  // bidder with the *fewest* commercial / technical deviations from
  // `flagCounts` (a real signal once the deviation extractor runs).
  // Ties broken by bidder code for a deterministic readout.
  const sortByLowest = (key: "commercial" | "technical") =>
    [...bidders].sort((a, b) => {
      const av = a.counts[key]
      const bv = b.counts[key]
      if (av !== bv) return av - bv
      return a.code.localeCompare(b.code, undefined, { numeric: true })
    })[0]
  const mostCommercial = sortByLowest("commercial")?.name ?? "—"
  const commercialPct =
    bidders.length > 0
      ? `${((1 - (sortByLowest("commercial")?.counts.commercial ?? 0) / Math.max(1, Math.max(...bidders.map((b) => b.counts.commercial)))) * 100).toFixed(0)}%`
      : "—"
  const mostTechnical = sortByLowest("technical")?.name ?? "—"
  const technicalPct =
    bidders.length > 0
      ? `${((1 - (sortByLowest("technical")?.counts.technical ?? 0) / Math.max(1, Math.max(...bidders.map((b) => b.counts.technical)))) * 100).toFixed(0)}%`
      : "—"

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <div className="flex flex-col gap-[8px] w-full">
          <div className="flex gap-[32px] h-[32px] items-center w-full">
            <div className="flex flex-1 gap-[8px] items-center min-w-px">
              <span className="bg-[#142845] flex h-[24px] items-center justify-center px-[16px] rounded-[30px] w-[40px] text-white text-[12px] leading-[16px] font-medium">
                01
              </span>
              <h2 className="text-[#142845] text-[18px] leading-[24px] font-semibold">
                Executive Summary
              </h2>
            </div>
            <button
              type="button"
              aria-label="Collapse"
              className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-[rgba(226,237,247,0.5)]"
            >
              <ChevronUp className="size-[16px] text-[#142845]" />
            </button>
          </div>
          <p className="text-[#142845] text-[12px] leading-[16px] font-light w-[680px]">
            This is a commercial evaluation summary and should be read
            alongside technical and contractual review.
          </p>
        </div>

        {/* With PTE callout */}
        <div className="bg-[rgba(226,237,247,0.5)] border border-[rgba(226,237,247,0.5)] rounded-[8px] p-[16px] w-full">
          <div className="flex flex-col gap-[16px]">
            <p className="flex flex-wrap gap-[4px] items-center text-[14px] leading-[24px]">
              <span className="text-[#142845] font-semibold">
                {lowestName}
              </span>
              <span className="text-black font-light">
                is the lowest tenderer at
              </span>
              <span className="text-[#142845] font-semibold">{lowestSum}</span>
              <span className="text-black font-light">, which is</span>
              <span className="text-[#142845] font-semibold">
                {varianceVsPte}% {direction}
              </span>
              <span className="text-black font-light">the PTE.</span>
            </p>
            <p className="flex flex-wrap gap-[4px] items-center text-[14px] leading-[24px]">
              <span className="text-[#142845] font-semibold">
                {mostCommercial}
              </span>
              <span className="text-black font-light">
                is the most compliant commercial by
              </span>
              <span className="text-[#142845] font-semibold">
                {commercialPct}.
              </span>
            </p>
            <p className="flex flex-wrap gap-[4px] items-center text-[14px] leading-[24px]">
              <span className="text-[#142845] font-semibold">
                {mostTechnical}
              </span>
              <span className="text-black font-light">
                is the most compliant technical by
              </span>
              <span className="text-[#142845] font-semibold">
                {technicalPct}.
              </span>
            </p>
          </div>
        </div>

        {/* QS Recommendation input */}
        <div className="flex flex-col gap-[8px] w-full">
          <label className="text-[#434343] text-[12px] leading-[16px] font-normal">
            QS Recommendation
          </label>
          <div className="bg-white border border-[#d9d9d9] rounded-[16px] px-[16px] py-[8px] min-h-[64px] flex items-center w-full">
            <span className="text-[#555] text-[14px] leading-[24px] italic">
              Add any context for the employer (e.g. pricing strategy, known
              exclusions, key risks)
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
