"use client"

import { ChevronUp, Info } from "lucide-react"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { formatAed, formatVariance } from "./section-shell"
import {
  SumBreakdownTable,
  type ExtraRow,
} from "./sum-breakdown-table"

/**
 * APPENDIX A — Summary Comparison of the Tenders Received.
 *
 * Figma 931:70585. Renders the per-section pivot from
 * `getTenderSumBreakdown` plus four append-only rows:
 *   - Arithmetical errors / adjustments (count from summary)
 *   - Adjustments (ITT method)  — pending; renders "—"
 *   - Adjusted tender sum       — from summary.adjustedSumCents
 *   - Difference from lowest    — derived
 */
export function AppendixASection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { rankings, lowestBidderId, bidders, sumBreakdown } = data

  // Build the extra rows that follow the section breakdown.
  const arithmetical: ExtraRow = {
    key: "arithmetical",
    label: "Arithmetical errors / adjustments",
    perBidder: Object.fromEntries(
      bidders.map((b) => {
        const n = b.counts.arithmeticalError
        return [b.id, n > 0 ? `${n} flagged` : "—"]
      }),
    ),
  }
  const ittMethod: ExtraRow = {
    key: "itt",
    label: "Adjustments (ITT method)",
    perBidder: Object.fromEntries(bidders.map((b) => [b.id, null])),
  }
  const adjustedTotal: ExtraRow = {
    key: "adjusted",
    label: "Adjusted tender sum",
    emphasize: true,
    perBidder: Object.fromEntries(
      bidders.map((b) => [
        b.id,
        formatAed(b.adjustedSumCents ?? b.tenderSumCents),
      ]),
    ),
  }
  const diffLowest: ExtraRow = {
    key: "diff-lowest",
    label: "Difference from lowest tender",
    perBidder: Object.fromEntries(
      rankings.map((r) => [
        r.bidderId,
        r.bidderId === lowestBidderId
          ? "Lowest"
          : formatVariance(r.variancePctVsLowest),
      ]),
    ),
  }

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <div className="flex flex-col gap-[8px] w-full">
          <div className="flex gap-[32px] h-[32px] items-center w-full">
            <div className="flex flex-1 gap-[8px] items-center min-w-px">
              <span className="bg-[#142845] flex h-[24px] items-center justify-center px-[16px] rounded-[30px] text-white text-[12px] leading-[16px] font-medium whitespace-nowrap">
                APPENDIX A
              </span>
              <h2 className="text-[#142845] text-[18px] leading-[24px] font-semibold">
                Summary Comparison of the Tenders Received
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
          <p className="text-[#142845] text-[12px] leading-[16px] font-light">
            Ranked by normalised tender sum (lowest first). Currency: AED.
          </p>
        </div>

        {/* Sub-block: Adjusted tender sums */}
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <h3 className="text-[#142845] text-[16px] leading-[24px] font-semibold">
                Adjusted tender sums
              </h3>
              <Info className="size-[16px] text-[#142845]" />
            </div>
            <p className="text-[#555] text-[12px] leading-[16px] font-light">
              Per-section sums by bidder, plus arithmetical adjustments and
              the difference from the lowest tender.
            </p>
          </div>

          {sumBreakdown ? (
            <SumBreakdownTable
              data={sumBreakdown}
              showPte
              highlightLowestId={lowestBidderId}
              extraRows={[arithmetical, ittMethod, adjustedTotal, diffLowest]}
            />
          ) : (
            <div className="border border-dashed border-[#e2edf7] rounded-[12px] py-[24px] text-center text-[12px] text-[#888]">
              BoQ template not loaded yet — return to Step 2 to upload the BoQ.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
