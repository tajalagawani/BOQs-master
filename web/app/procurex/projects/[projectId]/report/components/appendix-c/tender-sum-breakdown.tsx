"use client"

import { SubTitle } from "@/components/suite"
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
    <section id={id} className="scroll-mt-[24px] print:break-inside-avoid">
      <SubTitle>Bills of Quantities — Tender sum breakdown</SubTitle>
      <p className="mb-2 max-w-[78ch] text-[11.5px] leading-[1.6] text-suite-ink-3">
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
        <div className="rounded-[14px] border border-dashed border-suite-line-2 px-4 py-6 text-center text-[12px] text-suite-ink-4">
          BoQ template not loaded.
        </div>
      )}
    </section>
  )
}
