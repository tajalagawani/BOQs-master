"use client"

import { ChevronUp, Info } from "lucide-react"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { SumBreakdownTable } from "./sum-breakdown-table"

/**
 * 03. Detailed Tender Analysis — Figma 931:72945.
 *
 * Card with header + sub-blocks:
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
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <div className="flex h-[32px] items-center w-full">
          <div className="flex flex-1 gap-[8px] items-center min-w-px">
            <span className="bg-[#142845] flex h-[24px] items-center justify-center px-[16px] rounded-[30px] w-[40px] text-white text-[12px] leading-[16px] font-medium">
              03
            </span>
            <h2 className="text-[#142845] text-[18px] leading-[24px] font-semibold">
              Detailed Tender Analysis
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

        {/* Tender period strip */}
        <div className="grid grid-cols-3 gap-[16px]">
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
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <h3 className="text-[#142845] text-[16px] leading-[24px] font-semibold">
                1) Tender Sum Breakdown (AED)
              </h3>
              <Info className="size-[16px] text-[#142845]" />
            </div>
            <p className="text-[#555] text-[12px] leading-[16px] font-light">
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
            <div className="border border-dashed border-[#e2edf7] rounded-[12px] py-[24px] text-center text-[12px] text-[#888]">
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
      <span className="font-semibold text-[#888] text-[10px] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[#142845] text-[13px] leading-[20px]">{value}</span>
    </div>
  )
}
