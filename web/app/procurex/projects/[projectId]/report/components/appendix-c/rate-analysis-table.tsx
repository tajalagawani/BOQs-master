"use client"

import type { BoqRateAnalysisRow } from "@/modules/procurex/review/types"

import { BodyTd, HeaderTh, TenderCell } from "./cross-bidder-table"

/**
 * Cross-bidder rate-analysis table used by High-rate / Low-rate / GR
 * High / GR Low sub-blocks. Each row carries its own Tenderer column
 * — only rendered on the first row of each bidder group so the
 * column reads like a row-span.
 */

export interface CrossBidderRateRow extends BoqRateAnalysisRow {
  bidderId: string
  bidderCode: string
  bidderName: string
  isFirstInGroup: boolean
}

export function CrossBidderRateTable({
  rows,
  variancePositiveIsBad,
}: {
  rows: CrossBidderRateRow[]
  /** When true (high-rates), a +variance is red. When false (low
   *  rates), -variance is the concerning direction. */
  variancePositiveIsBad: boolean
}) {
  return (
    <table className="w-full text-[12px] border-collapse">
      <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
        <tr className="bg-[rgba(226,237,247,0.5)]">
          <HeaderTh sticky width={200}>Tenderer</HeaderTh>
          <HeaderTh width={80}>Item ID</HeaderTh>
          <HeaderTh>Description</HeaderTh>
          <HeaderTh width={70}>Unit</HeaderTh>
          <HeaderTh width={130} align="right">Rate</HeaderTh>
          <HeaderTh width={130} align="right">Benchmark</HeaderTh>
          <HeaderTh width={100} align="right">Variance %</HeaderTh>
          <HeaderTh width={100} align="right">In PTC?</HeaderTh>
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
            <BodyTd width={80} className="font-mono text-[#142845] text-[11px]" isGroupStart={row.isFirstInGroup}>
              {row.itemRef}
            </BodyTd>
            <BodyTd className="text-[#262626] text-[13px] leading-[18px]" isGroupStart={row.isFirstInGroup}>
              <span className="line-clamp-2">{row.description}</span>
            </BodyTd>
            <BodyTd width={70} className="text-[#555] text-[12px]" isGroupStart={row.isFirstInGroup}>
              {row.unit}
            </BodyTd>
            <BodyTd width={130} align="right" className="text-[#262626] text-[12px] tabular-nums" isGroupStart={row.isFirstInGroup}>
              {formatCents(row.rateCents)}
            </BodyTd>
            <BodyTd width={130} align="right" className="text-[#555] text-[12px] tabular-nums" isGroupStart={row.isFirstInGroup}>
              {formatCents(row.baselineCents)}
            </BodyTd>
            <BodyTd
              width={100}
              align="right"
              className={`text-[12px] tabular-nums font-medium ${varianceToneClass(row.variancePct, variancePositiveIsBad)}`}
              isGroupStart={row.isFirstInGroup}
            >
              {formatVariance(row.variancePct)}
            </BodyTd>
            <BodyTd width={100} align="right" isGroupStart={row.isFirstInGroup}>
              <PtcPill on={row.includeInPtc} />
            </BodyTd>
          </tr>
        ))}
      </tbody>
    </table>
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

function formatCents(cents: string | null): string {
  if (!cents) return "—"
  const n = Number(cents)
  if (!Number.isFinite(n)) return "—"
  return `AED ${(n / 100).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatVariance(pct: number | null): string {
  if (typeof pct !== "number") return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)}%`
}

function varianceToneClass(
  pct: number | null,
  positiveIsBad: boolean,
): string {
  if (typeof pct !== "number") return "text-[#888]"
  if (pct === 0) return "text-[#555]"
  const isBad = positiveIsBad ? pct > 0 : pct < 0
  return isBad ? "text-[#8b1c1c]" : "text-[#1b5e20]"
}
