"use client"

import { ChevronUp, ChevronsUpDown } from "lucide-react"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

/**
 * 05. QS Comments — Figma 1300:66562.
 *
 * One row per tenderer × 3 textareas (Appendix A / B / C QS Comment).
 * QS comments are not yet persisted — textareas render the design's
 * placeholder copy and are read-only until the comment-saving server
 * action lands.
 */
export function QsCommentsSection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { bidders } = data

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <div className="flex flex-col gap-[8px] w-full">
          <div className="flex gap-[32px] h-[32px] items-center w-full">
            <div className="flex flex-1 gap-[8px] items-center min-w-px">
              <span className="bg-[#142845] flex h-[24px] items-center justify-center px-[16px] rounded-[30px] w-[40px] text-white text-[12px] leading-[16px] font-medium">
                05
              </span>
              <h2 className="text-[#141414] text-[18px] leading-[24px] font-semibold">
                QS Comments
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
            Per-tenderer QS commentary for each appendix.
          </p>
        </div>

        {/* Table */}
        <div className="flex flex-col w-full">
          <div className="flex gap-[16px] items-center pb-[8px] pr-[8px] w-full">
            <ColHeader width={184}>Tenderer</ColHeader>
            <ColHeader width={339}>Appendix A QS Comment</ColHeader>
            <ColHeader width={339}>Appendix B QS Comment</ColHeader>
            <ColHeader flex>Appendix C QS Comment</ColHeader>
          </div>

          {bidders.length === 0 ? (
            <div className="border-t border-[#e2edf7] py-[24px] text-center text-[12px] text-[#888]">
              No tenderers on this project yet.
            </div>
          ) : (
            bidders.map((b) => (
              <div
                key={b.id}
                className="border-t border-[#e2edf7] flex gap-[16px] items-center py-[16px] w-full"
              >
                <div className="w-[184px] shrink-0">
                  <span className="text-black text-[12px] leading-[16px]">
                    {b.name}
                  </span>
                </div>
                <CommentBox width={339} />
                <CommentBox width={339} />
                <CommentBox flex />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function ColHeader({
  children,
  width,
  flex,
}: {
  children: React.ReactNode
  width?: number
  flex?: boolean
}) {
  return (
    <div
      className={`flex gap-[4px] items-center ${
        flex ? "flex-1 min-w-px" : "shrink-0"
      }`}
      style={width !== undefined ? { width } : undefined}
    >
      <span className="text-[#434343] text-[12px] leading-[16px] font-semibold">
        {children}
      </span>
      <ChevronsUpDown className="size-[12px] text-[#9aa1ac]" />
    </div>
  )
}

function CommentBox({ width, flex }: { width?: number; flex?: boolean }) {
  return (
    <div
      className={`h-[64px] ${flex ? "flex-1 min-w-px" : "shrink-0"}`}
      style={width !== undefined ? { width } : undefined}
    >
      <div className="bg-white border border-[#d9d9d9] rounded-[16px] px-[16px] py-[8px] h-[64px] flex items-center w-full">
        <span className="text-[#555] text-[14px] leading-[24px] italic">
          Add any context for the employer (e.g. pricing strategy, known
          exclusions, key risks)
        </span>
      </div>
    </div>
  )
}
