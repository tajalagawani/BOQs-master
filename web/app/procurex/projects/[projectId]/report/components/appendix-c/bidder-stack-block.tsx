"use client"

import type { AppendixCTendererHeader } from "@/modules/procurex/report/appendix-c-data"

import { formatAed } from "../section-shell"

/**
 * Shared shell for stack-style Appendix C sub-blocks.
 *
 * Each sub-block (Arithmetical Errors, High-rate, Deviations, …) is
 * repeated once per tenderer. Each repetition starts with a polished
 * bidder strip (initial avatar · code · name · tender sum · count
 * chip), and the body table is offset slightly inside the card so
 * the visual hierarchy reads: section title → bidder → details.
 */

export interface PerBidderItem {
  bidder: AppendixCTendererHeader
  tenderSumCents?: string | null
  itemCount: number
  /** Verbal pill when the bidder has zero items in this block. */
  emptyLabel: string
  /** When `null` the bidder card collapses to just the strip. */
  body: React.ReactNode | null
}

export function BidderStackBlock({
  id,
  title,
  hint,
  icon,
  perBidder,
  /** Optional override: the count chip can read "severity" colors
   *  ("danger" = red, "warning" = amber, "info" = neutral blue).
   *  Defaults to "danger" — flagged items are always something the
   *  QS should look at. */
  severity = "danger",
}: {
  id: string
  title: string
  hint?: string
  icon: React.ReactNode
  perBidder: PerBidderItem[]
  severity?: "danger" | "warning" | "info"
}) {
  return (
    <section
      id={id}
      className="flex flex-col gap-[20px] scroll-mt-[24px] print:break-inside-avoid"
    >
      {/* Sub-block header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex gap-[12px] items-center w-full">
          <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[10px] size-[40px] shrink-0 shadow-[1px_1px_60px_0_rgba(0,0,0,0.04)]">
            {icon}
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px] flex-1 min-w-0">
            {title}
          </h3>
          <BidderCountChip count={perBidder.length} />
        </div>
        {hint && (
          <p className="text-[#555] text-[12px] leading-[16px] font-light pl-[52px]">
            {hint}
          </p>
        )}
      </div>

      {/* Per-bidder stack */}
      {perBidder.length === 0 ? (
        <EmptyShell />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {perBidder.map((p) => (
            <BidderCard
              key={p.bidder.id}
              item={p}
              severity={severity}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function BidderCard({
  item,
  severity,
}: {
  item: PerBidderItem
  severity: "danger" | "warning" | "info"
}) {
  const initials = item.bidder.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
  return (
    <div className="border border-[#e2edf7] rounded-[12px] bg-white overflow-hidden">
      {/* Bidder strip */}
      <div className="bg-gradient-to-r from-[rgba(226,237,247,0.55)] to-[rgba(226,237,247,0.2)] flex gap-[12px] items-center px-[16px] py-[12px]">
        <span className="bg-[#142845] text-white flex items-center justify-center rounded-full size-[28px] shrink-0 text-[11px] font-semibold tracking-wide">
          {initials || "—"}
        </span>
        <div className="flex flex-col gap-[2px] flex-1 min-w-0">
          <div className="flex items-center gap-[8px]">
            <span className="font-mono text-[#142845] bg-white border border-[#e2edf7] text-[10px] leading-[14px] font-medium px-[6px] py-[1px] rounded-[6px]">
              {item.bidder.code}
            </span>
            <span className="font-semibold text-[#142845] text-[14px] leading-[20px] truncate">
              {item.bidder.name}
            </span>
          </div>
          {item.tenderSumCents !== undefined && (
            <span className="tabular-nums text-[#555] text-[11px] leading-[16px]">
              Tender sum: <span className="text-[#142845] font-medium">{formatAed(item.tenderSumCents)}</span>
            </span>
          )}
        </div>
        <ItemCountPill
          count={item.itemCount}
          emptyLabel={item.emptyLabel}
          severity={severity}
        />
      </div>
      {/* Body — capped at ~400px with internal scroll on screen, full
         height when printing. Sticky table headers inside the body
         keep column labels visible while scrolling. */}
      {item.body && (
        <div className="border-t border-[#f0f5fa] px-[16px] py-[8px] max-h-[420px] overflow-auto print:max-h-none print:overflow-visible">
          {item.body}
        </div>
      )}
    </div>
  )
}

function ItemCountPill({
  count,
  emptyLabel,
  severity,
}: {
  count: number
  emptyLabel: string
  severity: "danger" | "warning" | "info"
}) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-[4px] bg-[#e8f5e9] text-[#1b5e20] text-[11px] leading-[16px] px-[10px] py-[3px] rounded-[12px] font-medium shrink-0">
        <span className="size-[6px] rounded-full bg-[#1b5e20]" />
        {emptyLabel}
      </span>
    )
  }
  const styles = {
    danger: "bg-[#fdecea] text-[#8b1c1c] dot-[#8b1c1c]",
    warning: "bg-[#fff4e0] text-[#7a5d00] dot-[#7a5d00]",
    info: "bg-[#e2edf7] text-[#142845] dot-[#142845]",
  }[severity]
  const dotColor =
    severity === "danger"
      ? "#8b1c1c"
      : severity === "warning"
        ? "#7a5d00"
        : "#142845"
  return (
    <span
      className={`inline-flex items-center gap-[6px] text-[11px] leading-[16px] px-[10px] py-[3px] rounded-[12px] font-medium shrink-0 ${styles}`}
    >
      <span className="size-[6px] rounded-full" style={{ background: dotColor }} />
      {count} {count === 1 ? "item" : "items"}
    </span>
  )
}

function BidderCountChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center bg-[#142845] text-white text-[11px] leading-[16px] font-medium px-[10px] py-[3px] rounded-[12px] shrink-0">
      {count} {count === 1 ? "tenderer" : "tenderers"}
    </span>
  )
}

function EmptyShell() {
  return (
    <div className="border border-dashed border-[#e2edf7] bg-[rgba(226,237,247,0.15)] rounded-[12px] py-[28px] text-center">
      <p className="text-[#888] text-[12px] leading-[16px]">
        No tenderers on this project yet.
      </p>
    </div>
  )
}
