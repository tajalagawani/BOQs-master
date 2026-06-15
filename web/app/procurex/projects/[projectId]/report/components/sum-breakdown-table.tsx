"use client"

import { ChevronsUpDown } from "lucide-react"

import { DataTable, InternalBadge } from "@/components/suite"
import { cn } from "@/lib/cn"
import type { TenderSumBreakdown } from "@/modules/procurex/report/sum-breakdown"

import { formatAed } from "./section-shell"

/**
 * Shared sections × bidders pivot table. Used by Section 03,
 * Appendix A, and Appendix C's "Tender Sum Breakdown" sub-block.
 *
 * Restyled to the 10X suite (P0) — wraps the global `.suite-tbl`
 * chrome via <DataTable>; the Total Tender Sum + emphasized extra
 * rows read through `tr.total`, and the lowest tenderer column keeps
 * its green (`.dn`/suite-good) highlight, matching
 * procurex-step6-10x-style's section-total table.
 *
 * Variant flags:
 *  - `showPte`: render a leading PTE column (Section 03 + Appendix A)
 *  - `extraRows`: optional rows under the section totals — Appendix A
 *    adds Arithmetical adjustments, ITT adjustments, etc.
 *  - `highlightLowestId`: paint the lowest bidder's header chip green
 */
export function SumBreakdownTable({
  data,
  showPte = true,
  highlightLowestId = null,
  extraRows = [],
}: {
  data: TenderSumBreakdown
  showPte?: boolean
  highlightLowestId?: string | null
  extraRows?: ExtraRow[]
}) {
  if (data.sections.length === 0 || data.bidders.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-suite-line-2 py-[28px] text-center">
        <p className="text-[12px] leading-[16px] text-suite-ink-4">
          {data.sections.length === 0
            ? "No BoQ template loaded on this project yet."
            : "No tenderer submissions yet."}
        </p>
      </div>
    )
  }

  return (
    <DataTable
      minWidth={520}
      className="max-h-[560px] overflow-auto print:max-h-none print:overflow-visible"
    >
      <thead>
        <tr>
          <Th sticky>Section</Th>
          {showPte && (
            <Th align="right">
              <span className="inline-flex items-center gap-[6px]">
                PTE
                <InternalBadge />
              </span>
            </Th>
          )}
          {data.bidders.map((b) => (
            <Th
              key={b.id}
              align="right"
              highlight={b.id === highlightLowestId}
            >
              <div className="flex flex-col items-end gap-[2px]">
                <span className="suite-num text-[10px] text-suite-ink-4">
                  {b.code}
                </span>
                <span className="max-w-[140px] truncate text-[11px] text-suite-ink">
                  {b.name}
                </span>
              </div>
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.sections.map((sec) => (
          <tr key={sec.id}>
            <Td sticky>
              <span className="text-[13px] font-light text-suite-ink">
                {sec.label}
              </span>
            </Td>
            {showPte && (
              <Td align="right" className="suite-num text-[12px] text-suite-ink-2">
                {formatAed(data.pteBySection[sec.id] ?? null)}
              </Td>
            )}
            {data.bidders.map((b) => {
              const cell = data.perSection[sec.id]?.[b.id]
              return (
                <Td
                  key={b.id}
                  align="right"
                  className="suite-num text-[12px] text-suite-ink"
                >
                  {cell ? formatAed(cell) : "—"}
                </Td>
              )
            })}
          </tr>
        ))}

        {/* Total Tender Sum row */}
        <tr className="total">
          <Td sticky>
            <span className="text-[13px] font-semibold text-suite-ink">
              Total Tender Sum
            </span>
          </Td>
          {showPte && (
            <Td
              align="right"
              className="suite-num text-[13px] font-semibold text-suite-ink"
            >
              {formatAed(data.totals.pte)}
            </Td>
          )}
          {data.bidders.map((b) => {
            const isLowest = b.id === highlightLowestId
            return (
              <Td
                key={b.id}
                align="right"
                className={cn(
                  "suite-num text-[13px] font-semibold",
                  isLowest ? "low text-suite-good" : "text-suite-ink",
                )}
              >
                {formatAed(data.totals.perBidder[b.id] ?? null)}
              </Td>
            )
          })}
        </tr>

        {/* Extra rows (Arithmetical adjustments, ITT, Adjusted total…) */}
        {extraRows.map((row) => (
          <tr key={row.key} className={row.emphasize ? "total" : undefined}>
            <Td sticky>
              <span
                className={cn(
                  "text-[13px] text-suite-ink",
                  row.emphasize ? "font-semibold" : "font-light",
                )}
              >
                {row.label}
              </span>
            </Td>
            {showPte && (
              <Td
                align="right"
                className={cn(
                  "suite-num text-[12px]",
                  row.emphasize
                    ? "font-semibold text-suite-ink"
                    : "text-suite-ink-2",
                )}
              >
                {row.pte ?? "—"}
              </Td>
            )}
            {data.bidders.map((b) => {
              const cell = row.perBidder[b.id]
              return (
                <Td
                  key={b.id}
                  align="right"
                  className={cn(
                    "suite-num text-[12px]",
                    row.emphasize
                      ? "font-semibold text-suite-ink"
                      : "text-suite-ink-2",
                  )}
                >
                  {cell ?? "—"}
                </Td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </DataTable>
  )
}

export interface ExtraRow {
  key: string
  label: string
  emphasize?: boolean
  /** Already-formatted cell strings keyed by bidderId. Null means "—". */
  perBidder: Record<string, string | null>
  pte?: string | null
}

function Th({
  children,
  align = "left",
  sticky = false,
  highlight = false,
}: {
  children: React.ReactNode
  align?: "left" | "right"
  sticky?: boolean
  highlight?: boolean
}) {
  return (
    <th
      className={cn(
        align === "right" ? "r" : undefined,
        sticky && "sticky left-0 z-10 bg-suite-card-soft",
        highlight && "border-b-[2px] border-suite-good",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-[4px]",
          align === "right" && "flex-row-reverse",
        )}
      >
        {children}
        <ChevronsUpDown className="size-[10px] shrink-0 text-suite-ink-4" />
      </span>
    </th>
  )
}

function Td({
  children,
  align = "left",
  sticky = false,
  className = "",
}: {
  children: React.ReactNode
  align?: "left" | "right"
  sticky?: boolean
  className?: string
}) {
  return (
    <td
      className={cn(
        align === "right" && "r",
        sticky && "sticky left-0 z-10 bg-white",
        className,
      )}
    >
      {children}
    </td>
  )
}
