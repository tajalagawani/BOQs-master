"use client"

import { ReviewRoundTabs, type ReviewRoundKey } from "./round-tabs"

interface PageHeaderRowProps {
  round: ReviewRoundKey
  onRoundChange: (k: ReviewRoundKey) => void
  ptcIssued: boolean
  /** Date string e.g. "08/May/2026" */
  issuedDate?: string
  /** True after the tenderer uploads a PTC 1 response — unlocks PTC 1 tab. */
  ptcResponseUploaded?: boolean
  onAppendixAClick: () => void
}

export function PageHeaderRow({
  round,
  onRoundChange,
  ptcIssued,
  issuedDate,
  ptcResponseUploaded = false,
  onAppendixAClick,
}: PageHeaderRowProps) {
  // Tab visibility transitions:
  //  - PTC not issued → all rounds visible
  //  - PTC issued, no response → only Initial visible
  //  - PTC issued, response uploaded → Initial + PTC 1 visible (PTC 2/3/Summary still hidden)
  let hiddenRounds: ReviewRoundKey[] = []
  if (ptcIssued && !ptcResponseUploaded) {
    hiddenRounds = ["ptc1", "ptc2", "ptc3", "summary"]
  } else if (ptcIssued && ptcResponseUploaded) {
    hiddenRounds = ["ptc2", "ptc3", "summary"]
  }

  return (
    <div className="flex items-start justify-between w-full">
      <div className="flex flex-col gap-[24px] items-start">
        <ReviewRoundTabs
          active={round}
          onChange={onRoundChange}
          hiddenRounds={hiddenRounds}
        />
        {ptcIssued && (
          <span className="bg-[#408435] inline-flex items-center justify-center px-[8px] rounded-[8px] h-[24px] w-fit">
            <span className="text-white text-[12px] leading-[16px] whitespace-nowrap">
              <span className="font-semibold">PTC Issued:</span>
              <span className="font-normal"> Yes {issuedDate ?? "08/May/2026"}</span>
            </span>
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onAppendixAClick}
        className="flex items-center justify-center p-[8px] rounded-[16px]"
      >
        <span className="border-b border-black text-[#142845] text-[14px] leading-[24px] whitespace-nowrap">
          View Comparison Summary Appendix A
        </span>
      </button>
    </div>
  )
}
