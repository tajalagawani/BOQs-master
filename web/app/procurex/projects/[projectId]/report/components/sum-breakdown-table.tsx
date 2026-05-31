"use client"

import { ChevronsUpDown } from "lucide-react"

import type { TenderSumBreakdown } from "@/modules/procurex/report/sum-breakdown"

import { formatAed } from "./section-shell"

/**
 * Shared sections × bidders pivot table. Used by Section 03,
 * Appendix A, and Appendix C's "Tender Sum Breakdown" sub-block.
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
      <div className="border border-dashed border-[#e2edf7] rounded-[12px] py-[28px] text-center">
        <p className="text-[#888] text-[12px] leading-[16px]">
          {data.sections.length === 0
            ? "No BoQ template loaded on this project yet."
            : "No tenderer submissions yet."}
        </p>
      </div>
    )
  }

  return (
    <div className="border border-[#e2edf7] rounded-[12px] overflow-auto bg-white max-h-[560px] print:max-h-none print:overflow-visible">
      <table className="w-full text-[12px] border-collapse">
        <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
          <tr className="bg-[rgba(226,237,247,0.5)]">
            <Th sticky>Section</Th>
            {showPte && <Th align="right">PTE</Th>}
            {data.bidders.map((b) => (
              <Th
                key={b.id}
                align="right"
                highlight={b.id === highlightLowestId}
              >
                <div className="flex flex-col items-end gap-[2px]">
                  <span className="font-mono text-[10px] text-[#888]">
                    {b.code}
                  </span>
                  <span className="text-[#142845] text-[11px] truncate max-w-[140px]">
                    {b.name}
                  </span>
                </div>
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.sections.map((sec) => (
            <tr key={sec.id} className="border-t border-[#f0f5fa]">
              <Td sticky>
                <span className="text-[#142845] text-[13px] font-light">
                  {sec.label}
                </span>
              </Td>
              {showPte && (
                <Td align="right" className="text-[#555] text-[12px] tabular-nums">
                  {formatAed(data.pteBySection[sec.id] ?? null)}
                </Td>
              )}
              {data.bidders.map((b) => {
                const cell = data.perSection[sec.id]?.[b.id]
                return (
                  <Td
                    key={b.id}
                    align="right"
                    className="text-[#262626] text-[12px] tabular-nums"
                  >
                    {cell ? formatAed(cell) : "—"}
                  </Td>
                )
              })}
            </tr>
          ))}

          {/* Total Tender Sum row */}
          <tr className="border-t-[2px] border-[#142845] bg-[rgba(226,237,247,0.3)]">
            <Td sticky>
              <span className="text-[#142845] text-[13px] font-semibold">
                Total Tender Sum
              </span>
            </Td>
            {showPte && (
              <Td
                align="right"
                className="text-[#142845] text-[13px] font-semibold tabular-nums"
              >
                {formatAed(data.totals.pte)}
              </Td>
            )}
            {data.bidders.map((b) => (
              <Td
                key={b.id}
                align="right"
                className={`text-[13px] font-semibold tabular-nums ${
                  b.id === highlightLowestId
                    ? "text-[#1b5e20]"
                    : "text-[#142845]"
                }`}
              >
                {formatAed(data.totals.perBidder[b.id] ?? null)}
              </Td>
            ))}
          </tr>

          {/* Extra rows (Arithmetical adjustments, ITT, Adjusted total…) */}
          {extraRows.map((row) => (
            <tr
              key={row.key}
              className={`border-t border-[#f0f5fa] ${
                row.emphasize
                  ? "bg-[rgba(226,237,247,0.3)] border-t-[2px] border-[#142845]"
                  : ""
              }`}
            >
              <Td sticky>
                <span
                  className={`text-[#142845] text-[13px] ${
                    row.emphasize ? "font-semibold" : "font-light"
                  }`}
                >
                  {row.label}
                </span>
              </Td>
              {showPte && (
                <Td
                  align="right"
                  className={`text-[12px] tabular-nums ${
                    row.emphasize
                      ? "text-[#142845] font-semibold"
                      : "text-[#555]"
                  }`}
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
                    className={`text-[12px] tabular-nums ${
                      row.emphasize
                        ? "text-[#142845] font-semibold"
                        : "text-[#555]"
                    }`}
                  >
                    {cell ?? "—"}
                  </Td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      className={`py-[10px] px-[12px] text-[#434343] text-[11px] leading-[16px] font-semibold uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 bg-[rgba(226,237,247,0.5)] z-10" : ""} ${
        highlight ? "border-b-[2px] border-[#1b5e20]" : ""
      }`}
    >
      <span className="inline-flex items-center gap-[4px]">
        {children}
        <ChevronsUpDown className="size-[10px] text-[#9aa1ac] shrink-0" />
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
      className={`py-[10px] px-[12px] ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 bg-white z-10" : ""} ${className}`}
    >
      {children}
    </td>
  )
}
