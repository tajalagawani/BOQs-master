"use client"

import { ChevronUp, Info } from "lucide-react"

import { SectionTitle } from "@/components/suite"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { SumBreakdownTable } from "./sum-breakdown-table"

/**
 * 03. Detailed Tender Analysis — Figma 931:72945, restyled to the 10X
 * suite (P0). Card with header + sub-blocks:
 *  1) Tender period strip (issued / original / adjusted return dates)
 *  2) "Tender Sum Breakdown (AED)" — sections × bidders pivot from
 *     `getTenderSumBreakdown` (includes PTE column).
 */
export function DetailedTenderAnalysisSection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { project, sumBreakdown, lowestBidderId } = data

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="suite flex w-full flex-col gap-8 rounded-[16px] bg-white p-6">
        {/* Header */}
        <SectionTitle
          no="03"
          title="Detailed Tender Analysis"
          right={
            <button
              type="button"
              aria-label="Collapse"
              className="grid size-8 place-items-center rounded-lg hover:bg-suite-card-soft"
            >
              <ChevronUp className="size-4 text-suite-ink" />
            </button>
          }
        />

        {/* Tender period strip */}
        <div className="grid grid-cols-3 gap-4">
          <Meta label="Issued" value={project.tenderIssuedAt ?? "—"} />
          <Meta
            label="Original return"
            value={project.originalReturnAt ?? "—"}
          />
          <Meta
            label="Adjusted return"
            value={project.adjustedReturnAt ?? "—"}
          />
        </div>

        {/* Sub-block: 1) Tender Sum Breakdown (AED) */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[16px] font-semibold leading-[24px] text-suite-ink">
              1) Tender Sum Breakdown (AED)
              <Info className="size-4 text-suite-ink" />
            </div>
            <p className="text-[12px] font-light leading-[16px] text-suite-ink-3">
              Per-section totals as submitted, side-by-side across tenderers
              with the PTE for reference. Ranked by normalised tender sum
              (lowest first).
            </p>
          </div>

          {sumBreakdown ? (
            <SumBreakdownTable
              data={sumBreakdown}
              showPte
              highlightLowestId={lowestBidderId}
            />
          ) : (
            <div className="rounded-[12px] border border-dashed border-suite-line-2 py-6 text-center text-[12px] text-suite-ink-4">
              BoQ template not loaded yet — return to Step 2 to upload the BoQ.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-suite-ink-4">
        {label}
      </span>
      <span className="text-[13px] leading-[20px] text-suite-ink">{value}</span>
    </div>
  )
}
