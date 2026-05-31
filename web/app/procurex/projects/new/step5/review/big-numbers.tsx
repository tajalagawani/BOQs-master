"use client"

import type { BidderSummary } from "../types"

const formatAed = (millions: number) =>
  `${Math.round(millions * 1_000_000).toLocaleString("en-US")} AED`

/**
 * Render the bidder hero card. Every field renders as "Not
 * implemented" / "—" instead of a real value when its underlying
 * source isn't wired yet, so the page never shows fake numbers.
 *   - `rank === 0`  → "—" (no project-wide ranking yet)
 *   - `tenderSum === 0` → "Not implemented"
 *   - `ptcSum === 0`    → "Not implemented"
 */
export function BigNumbers({ bidder }: { bidder: BidderSummary }) {
  const hasRank = bidder.rank > 0
  const hasTenderSum = bidder.tenderSum > 0
  const hasPtcSum = bidder.ptcSum > 0
  return (
    <div
      className="border border-[#e2edf7] flex flex-col gap-[24px] p-[24px] rounded-[16px]"
      style={{
        background:
          "linear-gradient(to bottom, #0f2e5d 0%, #2e5fa8 48.437%, #afc5e8 100%)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="font-semibold text-white text-[20px] leading-[28px]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          {bidder.fullName}
        </h3>
        {hasRank ? (
          <span className="bg-[#92cbac] flex h-[24px] items-center justify-center px-[8px] rounded-[8px]">
            <span className="font-normal text-black text-[12px] leading-[16px] whitespace-nowrap">
              Rank #{bidder.rank}
            </span>
          </span>
        ) : (
          <NotImplementedChip label="Rank" />
        )}
      </div>
      <div className="flex gap-[40px] items-start">
        <MetricColumn
          label="Tender Sum"
          value={hasTenderSum ? bidder.tenderSum : null}
          formatBig={(m) => `${m.toFixed(2)}M`}
          formatSmall={(m) => formatAed(m)}
        />
        <MetricColumn
          label="Corrected Tender Sum"
          value={hasPtcSum ? bidder.ptcSum : null}
          formatBig={(m) => `${m.toFixed(2)}M`}
          formatSmall={(m) => formatAed(m)}
        />
      </div>
    </div>
  )
}

function MetricColumn({
  label,
  value,
  formatBig,
  formatSmall,
}: {
  label: string
  value: number | null
  formatBig: (n: number) => string
  formatSmall: (n: number) => string
}) {
  return (
    <div className="flex flex-col items-start">
      <p className="font-normal text-white text-[12px] leading-[16px]">
        {label}
      </p>
      {value === null ? (
        <div className="mt-[8px]">
          <NotImplementedChip />
        </div>
      ) : (
        <>
          <p
            className="font-bold text-white text-[40px] leading-[64px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {formatBig(value)}
          </p>
          <p className="font-medium text-white text-[14px] leading-[24px]">
            {formatSmall(value)}
          </p>
        </>
      )}
    </div>
  )
}

function NotImplementedChip({ label }: { label?: string } = {}) {
  return (
    <span
      className="inline-flex items-center gap-[6px] px-[8px] py-[2px] rounded-[8px] border border-dashed border-white/70 bg-white/15 text-white text-[11px] font-medium uppercase tracking-wider whitespace-nowrap"
      title="No real data source for this field yet"
    >
      {label ? `${label} — ` : ""}Not implemented
    </span>
  )
}
