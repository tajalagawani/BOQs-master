"use client"

import { FileSpreadsheet } from "lucide-react"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { SumBreakdownTable } from "../sum-breakdown-table"

/**
 * Appendix C — Bills of Quantities · Tender Sum Breakdown.
 *
 * Same matrix as Section 03, repeated here so the appendix is
 * self-contained for the print bundle.
 */
export function TenderSumBreakdownBlock({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { sumBreakdown, lowestBidderId } = data
  return (
    <section
      id={id}
      className="flex flex-col gap-[20px] scroll-mt-[24px] print:break-inside-avoid"
    >
      <div className="flex gap-[12px] items-center w-full">
        <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[10px] size-[40px] shrink-0">
          <FileSpreadsheet className="size-[16px] text-[#142845]" />
        </span>
        <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px] flex-1 min-w-0">
          Bills of Quantities — Tender Sum Breakdown
        </h3>
      </div>
      <p className="text-[#555] text-[12px] leading-[16px] font-light pl-[52px]">
        Per-section totals across every tenderer. Source:
        <code className="px-[4px]">boq_item_rate</code> grouped by
        <code className="px-[4px]">boq_section</code>.
      </p>
      {sumBreakdown ? (
        <SumBreakdownTable
          data={sumBreakdown}
          showPte
          highlightLowestId={lowestBidderId}
        />
      ) : (
        <div className="border border-dashed border-[#e2edf7] rounded-[12px] py-[24px] text-center text-[12px] text-[#888]">
          BoQ template not loaded.
        </div>
      )}
    </section>
  )
}
