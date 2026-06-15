"use client"

import { CodeBadge, SuiteChip } from "@/components/suite"

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
 *
 * Restyled to the 10X suite token system (navy/parchment). Header
 * chrome, bidder strip, count chips and the empty state read from the
 * suite palette; the per-bidder body slot is untouched. Markup mirrors
 * the App C sub-blocks of procurex-step6-10x-style.
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
          <span className="bg-suite-card-soft border border-suite-line flex items-center justify-center rounded-[10px] size-[40px] shrink-0 suite-shadow">
            {icon}
          </span>
          <h3 className="font-semibold text-suite-ink text-[18px] leading-[24px] flex-1 min-w-0 tracking-[-0.01em]">
            {title}
          </h3>
          <BidderCountChip count={perBidder.length} />
        </div>
        {hint && (
          <p className="text-suite-ink-3 text-[12px] leading-[16px] pl-[52px]">
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
    <div className="border border-suite-line rounded-[14px] bg-suite-panel overflow-hidden">
      {/* Bidder strip */}
      <div className="bg-suite-card-soft flex gap-[12px] items-center px-[16px] py-[12px]">
        <span className="bg-suite-navy-2 text-white flex items-center justify-center rounded-full size-[28px] shrink-0 text-[11px] font-semibold tracking-wide">
          {initials || "—"}
        </span>
        <div className="flex flex-col gap-[2px] flex-1 min-w-0">
          <div className="flex items-center gap-[8px]">
            <CodeBadge className="!px-[6px] !py-px !text-[10px]">
              {item.bidder.code}
            </CodeBadge>
            <span className="font-semibold text-suite-ink text-[14px] leading-[20px] truncate">
              {item.bidder.name}
            </span>
          </div>
          {item.tenderSumCents !== undefined && (
            <span className="suite-num text-suite-ink-3 text-[11px] leading-[16px]">
              Tender sum:{" "}
              <span className="text-suite-ink font-medium">
                {formatAed(item.tenderSumCents)}
              </span>
            </span>
          )}
        </div>
        <ItemCountPill
          count={item.itemCount}
          emptyLabel={item.emptyLabel}
          severity={severity}
        />
      </div>
      {/* Body — capped at ~420px with internal scroll on screen, full
         height when printing. Sticky table headers inside the body
         keep column labels visible while scrolling. */}
      {item.body && (
        <div className="border-t border-suite-line-soft px-[16px] py-[8px] max-h-[420px] overflow-auto print:max-h-none print:overflow-visible">
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
      <SuiteChip tone="good" className="shrink-0">
        {emptyLabel}
      </SuiteChip>
    )
  }
  const tone =
    severity === "danger" ? "dang" : severity === "warning" ? "warn" : "neut"
  return (
    <SuiteChip tone={tone} className="shrink-0">
      {count} {count === 1 ? "item" : "items"}
    </SuiteChip>
  )
}

function BidderCountChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center bg-suite-navy-2 text-white text-[11px] leading-[16px] font-medium px-2.5 py-[5px] rounded-full shrink-0">
      {count} {count === 1 ? "tenderer" : "tenderers"}
    </span>
  )
}

function EmptyShell() {
  return (
    <div className="border border-dashed border-suite-line bg-suite-card-soft rounded-[14px] py-[28px] text-center">
      <p className="text-suite-ink-4 text-[12px] leading-[16px]">
        No tenderers on this project yet.
      </p>
    </div>
  )
}
