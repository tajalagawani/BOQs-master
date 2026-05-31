"use client"

import { ChevronUp } from "lucide-react"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

/**
 * APPENDIX B — Post Tender Clarification Schedules.
 *
 * Figma 1295:91686. The Figma frame is just the section header (red
 * "APPENDIX B - " + blue "Post Tender Clarification Schedules") —
 * the actual body lives in sub-frames that depend on the PTC schema
 * we haven't modelled yet.
 */
export function AppendixBSection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  void data
  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header — exact colors from Figma 1295:91688 */}
        <div className="flex gap-[32px] items-center w-full">
          <h2 className="flex-1 text-[18px] leading-[24px] font-semibold">
            <span className="text-[#c32a4f]">APPENDIX B - </span>
            <span className="text-[#142845]">
              Post Tender Clarification Schedules
            </span>
          </h2>
          <button
            type="button"
            aria-label="Collapse"
            className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-[rgba(226,237,247,0.5)]"
          >
            <ChevronUp className="size-[16px] text-[#142845]" />
          </button>
        </div>

        <div className="flex flex-col gap-[8px] py-[12px]">
          <span className="text-[#888] text-[12px] uppercase tracking-wider font-semibold">
            Not implemented
          </span>
          <p className="text-[#555] text-[13px] leading-[20px] font-light">
            Will list per-tenderer PTC questions + responses for each round
            once <code>ptc_round</code> + <code>ptc_question</code> tables
            land (Phase 3). Same gap as Step 5&apos;s{" "}
            <code>ptcIssued = null</code> sentinel.
          </p>
        </div>
      </div>
    </section>
  )
}
