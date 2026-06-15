"use client"

import { ChevronsUpDown } from "lucide-react"

import { CodeBadge, SuiteChip } from "@/components/suite"

/**
 * Shared shell for cross-bidder Appendix C sub-blocks.
 *
 * Replaces the per-bidder card stack: one section header + one wide
 * table where every row carries its own Tenderer column (code +
 * name). Tables share the same scrollable wrapper, sticky header,
 * and column-header styling as the matrix sub-blocks.
 *
 * Restyled to the 10X suite token system (navy/parchment) — header
 * chrome, chips and table cells read from the suite palette. Markup
 * mirrors the App C sub-blocks of procurex-step6-10x-style.
 */

export function CrossBidderTableShell({
  id,
  title,
  hint,
  icon,
  rowCount,
  emptyLabel,
  toolbar,
  children,
}: {
  id: string
  title: string
  hint?: string
  icon: React.ReactNode
  rowCount: number
  emptyLabel: string
  /** Optional control strip (e.g. view toggle) rendered between the
   *  header and the table. */
  toolbar?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="flex flex-col gap-[20px] scroll-mt-[24px] print:break-inside-avoid"
    >
      <div className="flex flex-col gap-[6px]">
        <div className="flex gap-[12px] items-center w-full">
          <span className="bg-suite-card-soft border border-suite-line flex items-center justify-center rounded-[10px] size-[40px] shrink-0 suite-shadow">
            {icon}
          </span>
          <h3 className="font-semibold text-suite-ink text-[18px] leading-[24px] flex-1 min-w-0 tracking-[-0.01em]">
            {title}
          </h3>
          <RowCountChip count={rowCount} emptyLabel={emptyLabel} />
        </div>
        {hint && (
          <p className="text-suite-ink-3 text-[12px] leading-[16px] pl-[52px]">
            {hint}
          </p>
        )}
      </div>

      {toolbar && <div className="flex">{toolbar}</div>}

      {rowCount === 0 ? (
        <div className="border border-dashed border-suite-line bg-suite-card-soft rounded-[14px] py-[28px] text-center">
          <p className="text-suite-ink-4 text-[12px] leading-[16px]">{emptyLabel}</p>
        </div>
      ) : (
        <div className="border border-suite-line rounded-[14px] overflow-auto bg-suite-panel max-h-[520px] print:max-h-none print:overflow-visible">
          {children}
        </div>
      )}
    </section>
  )
}

export function TenderCell({
  code,
  name,
  firstOfGroup,
}: {
  code: string
  name: string
  /** When `false` (later rows in the same bidder group), the code +
   *  name are hidden so the column reads like a row-span without
   *  forcing actual <td rowspan> markup. */
  firstOfGroup: boolean
}) {
  if (!firstOfGroup) {
    return <span className="block size-full" aria-hidden />
  }
  return (
    <div className="flex items-center gap-[8px]">
      <CodeBadge>{code}</CodeBadge>
      <span className="text-suite-ink text-[12px] font-medium truncate">
        {name}
      </span>
    </div>
  )
}

export function HeaderTh({
  children,
  align = "left",
  sticky = false,
  width,
}: {
  children: React.ReactNode
  align?: "left" | "right"
  sticky?: boolean
  width?: number
}) {
  const style = width !== undefined ? { width } : undefined
  return (
    <th
      style={style}
      className={`py-[11px] px-[14px] bg-suite-card-soft text-suite-ink-3 text-[10px] leading-[16px] font-semibold uppercase tracking-[0.05em] border-b border-suite-line ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 z-30" : ""}`}
    >
      <span
        className={`inline-flex items-center gap-[4px] ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {children}
        <ChevronsUpDown className="size-[10px] text-suite-ink-4" />
      </span>
    </th>
  )
}

export function BodyTd({
  children,
  align = "left",
  sticky = false,
  className = "",
  width,
  isGroupStart = false,
}: {
  children: React.ReactNode
  align?: "left" | "right"
  sticky?: boolean
  className?: string
  width?: number
  /** First row of a bidder's group → render a thin top border to
   *  visually separate from the previous bidder's rows. */
  isGroupStart?: boolean
}) {
  const style = width !== undefined ? { width } : undefined
  return (
    <td
      style={style}
      className={`py-[13px] px-[14px] align-top ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 bg-suite-panel z-10" : ""} ${
        isGroupStart ? "border-t-[2px] border-suite-line" : "border-t border-suite-line-soft"
      } ${className}`}
    >
      {children}
    </td>
  )
}

function RowCountChip({
  count,
  emptyLabel,
}: {
  count: number
  emptyLabel: string
}) {
  if (count === 0) {
    return (
      <SuiteChip tone="good" className="shrink-0">
        {emptyLabel}
      </SuiteChip>
    )
  }
  return (
    <SuiteChip tone="dang" className="shrink-0">
      {count} {count === 1 ? "row" : "rows"}
    </SuiteChip>
  )
}

/**
 * Walk a list of `{ bidderId, ... }` rows already sorted by bidder
 * (then by whatever the sub-block prefers). Returns each row tagged
 * with `isFirstInGroup` so the Tenderer cell only renders once per
 * bidder.
 */
export function tagGroups<T extends { bidderId: string }>(
  rows: T[],
): Array<T & { isFirstInGroup: boolean }> {
  let prev: string | null = null
  return rows.map((row) => {
    const isFirst = row.bidderId !== prev
    prev = row.bidderId
    return { ...row, isFirstInGroup: isFirst }
  })
}
