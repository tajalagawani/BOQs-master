"use client"

import { ChevronsUpDown } from "lucide-react"

/**
 * Shared shell for cross-bidder Appendix C sub-blocks.
 *
 * Replaces the per-bidder card stack: one section header + one wide
 * table where every row carries its own Tenderer column (code +
 * name). Tables share the same scrollable wrapper, sticky header,
 * and column-header styling as the matrix sub-blocks.
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
          <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[10px] size-[40px] shrink-0 shadow-[1px_1px_60px_0_rgba(0,0,0,0.04)]">
            {icon}
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px] flex-1 min-w-0">
            {title}
          </h3>
          <RowCountChip count={rowCount} emptyLabel={emptyLabel} />
        </div>
        {hint && (
          <p className="text-[#555] text-[12px] leading-[16px] font-light pl-[52px]">
            {hint}
          </p>
        )}
      </div>

      {toolbar && <div className="flex">{toolbar}</div>}

      {rowCount === 0 ? (
        <div className="border border-dashed border-[#e2edf7] bg-[rgba(226,237,247,0.15)] rounded-[12px] py-[28px] text-center">
          <p className="text-[#888] text-[12px] leading-[16px]">{emptyLabel}</p>
        </div>
      ) : (
        <div className="border border-[#e2edf7] rounded-[12px] overflow-auto bg-white max-h-[520px] print:max-h-none print:overflow-visible">
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
      <span className="font-mono text-[10px] text-[#888] bg-[#f5f5f5] px-[6px] py-[1px] rounded-[6px]">
        {code}
      </span>
      <span className="text-[#142845] text-[12px] font-medium truncate">
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
      className={`py-[10px] px-[12px] text-[#434343] text-[11px] leading-[16px] font-semibold uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 bg-[rgba(226,237,247,0.5)] z-30" : ""}`}
    >
      <span
        className={`inline-flex items-center gap-[4px] ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {children}
        <ChevronsUpDown className="size-[10px] text-[#9aa1ac]" />
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
      className={`py-[10px] px-[12px] align-top ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 bg-white z-10" : ""} ${
        isGroupStart ? "border-t-[2px] border-[#e2edf7]" : "border-t border-[#f0f5fa]"
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
      <span className="inline-flex items-center gap-[4px] bg-[#e8f5e9] text-[#1b5e20] text-[11px] leading-[16px] px-[10px] py-[3px] rounded-[12px] font-medium shrink-0">
        <span className="size-[6px] rounded-full bg-[#1b5e20]" />
        {emptyLabel}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[6px] bg-[#fdecea] text-[#8b1c1c] text-[11px] leading-[16px] px-[10px] py-[3px] rounded-[12px] font-medium shrink-0">
      <span className="size-[6px] rounded-full bg-[#8b1c1c]" />
      {count} {count === 1 ? "row" : "rows"}
    </span>
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
