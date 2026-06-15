"use client"

import { Info } from "lucide-react"

import { Prose, SectionTitle, SubTitle } from "@/components/suite"

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
      <div className="suite bg-white flex flex-col rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <SectionTitle
          no="App A"
          title="Summary Comparison of the Tenders Received"
        />
        <Prose size={11.5} muted>
          Ranked by normalised tender sum (lowest first). Currency: AED.
        </Prose>

        {/* Sub-block: Adjusted tender sums */}
        <SubTitle>
          Adjusted tender sums
          <Info className="size-[14px] text-suite-ink-3" />
        </SubTitle>
        <Prose size={12}>
          Per-section sums by bidder, plus arithmetical adjustments and the
          difference from the lowest tender.
        </Prose>

        {sumBreakdown ? (
          <SumBreakdownTable
            data={sumBreakdown}
            showPte
            highlightLowestId={lowestBidderId}
            extraRows={[arithmetical, ittMethod, adjustedTotal, diffLowest]}
          />
        ) : (
          <div className="rounded-[14px] border border-dashed border-suite-line-2 py-[24px] text-center text-[12px] text-suite-ink-4">
            BoQ template not loaded yet — return to Step 2 to upload the BoQ.
          </div>
        )}
      </div>
    </section>
  )
}
