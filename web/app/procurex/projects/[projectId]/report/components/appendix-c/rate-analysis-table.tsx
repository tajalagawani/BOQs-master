"use client"

import { Delta } from "@/components/suite"
import type { BoqRateAnalysisRow } from "@/modules/procurex/review/types"

import { BodyTd, HeaderTh, TenderCell } from "./cross-bidder-table"

/**
 * Cross-bidder rate-analysis table used by High-rate / Low-rate / GR
 * High / GR Low sub-blocks. Each row carries its own Tenderer column
 * — only rendered on the first row of each bidder group so the
 * column reads like a row-span.
 *
 * Restyled to the 10X suite tokens — variance reads through <Delta>
 * (up=red / down=green) exactly like the App C rate tables in
 * procurex-step6-10x-style.
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
      <thead className="sticky top-0 z-20 bg-suite-card-soft print:static">
        <tr>
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
            <BodyTd width={80} className="suite-num text-suite-ink-2 text-[11px]" isGroupStart={row.isFirstInGroup}>
              {row.itemRef}
            </BodyTd>
            <BodyTd className="text-suite-ink text-[13px] leading-[18px]" isGroupStart={row.isFirstInGroup}>
              <span className="line-clamp-2">{row.description}</span>
            </BodyTd>
            <BodyTd width={70} className="text-suite-ink-3 text-[12px]" isGroupStart={row.isFirstInGroup}>
              {row.unit}
            </BodyTd>
            <BodyTd width={130} align="right" className="suite-num text-suite-ink text-[12px]" isGroupStart={row.isFirstInGroup}>
              {formatCents(row.rateCents)}
            </BodyTd>
            <BodyTd width={130} align="right" className="suite-num text-suite-ink-3 text-[12px]" isGroupStart={row.isFirstInGroup}>
              {formatCents(row.baselineCents)}
            </BodyTd>
            <BodyTd
              width={100}
              align="right"
              className="suite-num text-[12px]"
              isGroupStart={row.isFirstInGroup}
            >
              <Delta dir={varianceDir(row.variancePct, variancePositiveIsBad)}>
                {formatVariance(row.variancePct)}
              </Delta>
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
      <span className="inline-flex items-center gap-[4px] bg-suite-good-bg text-suite-good text-[11px] px-[8px] py-[1px] rounded-full font-semibold">
        <span className="size-[6px] rounded-full bg-suite-green" />
        Yes
      </span>
    )
  }
  return (
    <span className="inline-flex items-center bg-suite-neut-bg text-suite-neut text-[11px] px-[8px] py-[1px] rounded-full font-semibold">
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

function varianceDir(
  pct: number | null,
  positiveIsBad: boolean,
): "up" | "down" | "flat" {
  if (typeof pct !== "number" || pct === 0) return "flat"
  const isBad = positiveIsBad ? pct > 0 : pct < 0
  return isBad ? "up" : "down"
}
