"use client"

import { SuiteChip, ReportDeviationRow } from "@/components/suite"

import type { BidderDeviation } from "@/modules/procurex/review/types"

/**
 * Cross-bidder deviation table used by Commercial / Contractual
 * sub-blocks. Same column shape across all three kinds; only the
 * title / icon / source bucket vary at the call site.
 *
 * 10X restyle: each deviation renders as a `ReportDeviationRow`
 * (category · statement+ref · status · resolved) instead of a wide
 * table column. The bidder code/name still paints once per bidder
 * group (via `isFirstInGroup`); statement, ref, QS response,
 * severity and include-in-PTC are all preserved.
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
    <div>
      {rows.map((row) => (
        <ReportDeviationRow
          key={`${row.bidderId}:${row.id}`}
          category={row.isFirstInGroup ? row.bidderCode : ""}
          statement={
            <>
              {row.isFirstInGroup && (
                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.04em] text-suite-ink-3">
                  {row.bidderName}
                </span>
              )}
              <span className="line-clamp-3">{row.statement}</span>
              {row.qsResponse ? (
                <span className="mt-1 block text-suite-ink-3 italic line-clamp-3">
                  {row.qsResponse}
                </span>
              ) : null}
            </>
          }
          statementRef={row.ref}
          status={<SeverityPill severity={row.severity} />}
          resolved={<PtcPill on={row.includeInPtc} />}
        />
      ))}
    </div>
  )
}

function SeverityPill({ severity }: { severity: BidderDeviation["severity"] }) {
  if (severity === "major") {
    return <SuiteChip tone="dang">Major</SuiteChip>
  }
  return <SuiteChip tone="warn">Minor</SuiteChip>
}

function PtcPill({ on }: { on: boolean }) {
  if (on) {
    return <SuiteChip tone="good">Yes</SuiteChip>
  }
  return (
    <SuiteChip tone="neut" dot={false}>
      No
    </SuiteChip>
  )
}
