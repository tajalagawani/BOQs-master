"use client"

import type { BidderDeviation } from "@/modules/procurex/review/types"

import {
  BodyTd,
  HeaderTh,
  TenderCell,
} from "./cross-bidder-table"

/**
 * Cross-bidder deviation table used by Commercial / Contractual
 * sub-blocks. Same column shape across all three kinds; only the
 * title / icon / source bucket vary at the call site.
 */
export interface CrossBidderDeviationRow extends BidderDeviation {
  bidderId: string
  bidderCode: string
  bidderName: string
  isFirstInGroup: boolean
}

export function CrossBidderDeviationTable({
  rows,
}: {
  rows: CrossBidderDeviationRow[]
}) {
  return (
    <table className="w-full text-[12px] border-collapse">
      <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
        <tr className="bg-[rgba(226,237,247,0.5)]">
          <HeaderTh sticky width={200}>Tenderer</HeaderTh>
          <HeaderTh width={70}>Ref</HeaderTh>
          <HeaderTh>Bidder statement</HeaderTh>
          <HeaderTh>QS response</HeaderTh>
          <HeaderTh width={90}>Severity</HeaderTh>
          <HeaderTh width={90} align="right">In PTC?</HeaderTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.bidderId}:${row.id}`}>
            <BodyTd sticky width={200} isGroupStart={row.isFirstInGroup}>
              <TenderCell
                code={row.bidderCode}
                name={row.bidderName}
                firstOfGroup={row.isFirstInGroup}
              />
            </BodyTd>
            <BodyTd width={70} className="font-mono text-[#142845] text-[11px]" isGroupStart={row.isFirstInGroup}>
              {row.ref}
            </BodyTd>
            <BodyTd className="text-[#262626] text-[13px] leading-[20px]" isGroupStart={row.isFirstInGroup}>
              <span className="line-clamp-3">{row.statement}</span>
            </BodyTd>
            <BodyTd className="text-[#555] text-[12px] leading-[18px] italic" isGroupStart={row.isFirstInGroup}>
              {row.qsResponse ? (
                <span className="line-clamp-3">{row.qsResponse}</span>
              ) : (
                <span className="not-italic text-[#888]">—</span>
              )}
            </BodyTd>
            <BodyTd width={90} isGroupStart={row.isFirstInGroup}>
              <SeverityPill severity={row.severity} />
            </BodyTd>
            <BodyTd width={90} align="right" isGroupStart={row.isFirstInGroup}>
              <PtcPill on={row.includeInPtc} />
            </BodyTd>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SeverityPill({ severity }: { severity: BidderDeviation["severity"] }) {
  if (severity === "major") {
    return (
      <span className="inline-flex items-center gap-[4px] bg-[#fdecea] text-[#8b1c1c] text-[10px] leading-[14px] uppercase tracking-wider font-semibold px-[6px] py-[1px] rounded-[6px]">
        Major
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[4px] bg-[#fff4e0] text-[#7a5d00] text-[10px] leading-[14px] uppercase tracking-wider font-semibold px-[6px] py-[1px] rounded-[6px]">
      Minor
    </span>
  )
}

function PtcPill({ on }: { on: boolean }) {
  if (on) {
    return (
      <span className="inline-flex items-center gap-[4px] bg-[#e8f5e9] text-[#1b5e20] text-[11px] px-[8px] py-[1px] rounded-[8px] font-medium">
        <span className="size-[6px] rounded-full bg-[#1b5e20]" />
        Yes
      </span>
    )
  }
  return (
    <span className="inline-flex items-center bg-[#f5f5f5] text-[#666] text-[11px] px-[8px] py-[1px] rounded-[8px] font-medium">
      No
    </span>
  )
}
