"use client"

import { useState } from "react"
import { ChevronsUpDown, ChevronUp } from "lucide-react"

import type { BidderDeviationRow } from "@/modules/procurex/review/sections/bidder-deviations"

/**
 * Section J sub-block — three deviation sub-tables stacked
 * (Contractual / Commercial / Technical).
 *
 * Pulled as-is from the user's screenshot. Each sub-table has its own
 * light-blue header bar (collapsible), then a 4-column table:
 *   ID · Tenderer statement · QS Response (input) · Include in PTC?
 *
 * Data source: `getBidderDeviations(bidderId)` → `tender_deviation`
 * rows attributed to this tenderer, bucketed by kind.
 */

export function BidderDeviationsBlock({
  id,
  contractual,
  commercial,
  technical,
}: {
  id?: string
  contractual: BidderDeviationRow[]
  commercial: BidderDeviationRow[]
  technical: BidderDeviationRow[]
}) {
  return (
    <section id={id} className="flex flex-col gap-[32px] w-full scroll-mt-[120px]">
      <DeviationTable
        anchorId="dev-contractual"
        title="Contractual Deviations"
        rows={contractual}
      />
      <DeviationTable
        anchorId="dev-commercial"
        title="Commercial Deviations"
        rows={commercial}
      />
      <DeviationTable
        anchorId="dev-technical"
        title="Technical Deviations"
        rows={technical}
      />
    </section>
  )
}

function DeviationTable({
  anchorId,
  title,
  rows,
}: {
  anchorId: string
  title: string
  rows: BidderDeviationRow[]
}) {
  const [open, setOpen] = useState(true)
  const [includes, setIncludes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.includeInPtc])),
  )
  const [responses, setResponses] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.qsResponse])),
  )

  return (
    <div id={anchorId} className="flex flex-col w-full scroll-mt-[120px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-[rgba(226,237,247,0.5)] flex items-center justify-between px-[16px] py-[10px] rounded-[8px] w-full hover:bg-[rgba(226,237,247,0.7)]"
      >
        <span className="flex-1 text-left font-semibold text-[#142845] text-[14px] leading-[20px]">
          {title}
        </span>
        <ChevronUp
          className={`size-[16px] text-[#142845] shrink-0 transition-transform ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>

      {open && (
        <div className="w-full mt-[8px]">
          {/* Header */}
          <div className="flex items-start w-full">
            <div className="flex flex-1 items-center gap-[16px] pb-[8px] pr-[8px] pl-[16px] pt-[12px]">
              <Th width={72}>ID</Th>
              <Th width={328}>Tenderer statement</Th>
              <Th>QS Response</Th>
            </div>
            <div className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-tl-[8px] px-[16px] w-[160px] shrink-0 h-[24px] mt-[12px]">
              <p className="font-semibold text-[#434343] text-[12px] leading-[16px]">
                Include in PTC?
              </p>
            </div>
          </div>

          {/* Body */}
          {rows.length === 0 ? (
            <div className="border-t border-[#e2edf7] py-[24px] text-center text-[12px] text-[#888]">
              No {title.toLowerCase()} flagged for this bidder.
            </div>
          ) : (
            rows.map((row) => {
              const on = includes[row.id] ?? row.includeInPtc
              return (
                <div
                  key={row.id}
                  className="border-t border-[#e2edf7] flex gap-[16px] items-center py-[16px] w-full"
                >
                  <div className="flex flex-1 items-center gap-[16px] pr-[8px] pl-[16px]">
                    <BodyCell width={72} className="text-black text-[12px] leading-[16px]">
                      {row.ref}
                    </BodyCell>
                    <BodyCell width={328} className="text-[#262626] text-[14px] leading-[20px] line-clamp-2">
                      {row.statement}
                    </BodyCell>
                    <BodyCell className="flex-1">
                      <input
                        type="text"
                        value={responses[row.id] ?? ""}
                        onChange={(e) =>
                          setResponses((m) => ({
                            ...m,
                            [row.id]: e.target.value,
                          }))
                        }
                        placeholder="Add QS response…"
                        className="w-full bg-white border border-[#d9d9d9] rounded-[16px] px-[16px] py-[8px] text-[#262626] text-[14px] leading-[24px] focus:outline-none focus:border-[#142845]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      />
                    </BodyCell>
                  </div>
                  <div className="flex items-center gap-[8px] px-[16px] w-[160px] shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() =>
                        setIncludes((m) => ({ ...m, [row.id]: !on }))
                      }
                      className={`flex items-center p-[4px] rounded-[13px] shadow-[0_4px_8px_0_rgba(0,0,0,0.1)] w-[48px] h-[26px] shrink-0 transition-colors ${
                        on
                          ? "bg-[#2a69b9] justify-end"
                          : "bg-[#c4c4c4] justify-start"
                      }`}
                    >
                      <span className="bg-white rounded-full size-[16px] block" />
                    </button>
                    <span className="text-[#262626] text-[14px] leading-[24px]">
                      {on ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function Th({
  children,
  width,
}: {
  children: React.ReactNode
  width?: number
}) {
  const widthCls = width === undefined ? "flex-1 min-w-0" : ""
  const style = width !== undefined ? { width } : undefined
  return (
    <div
      className={`flex items-center gap-[4px] shrink-0 ${widthCls}`}
      style={style}
    >
      <span className="font-semibold text-[#434343] text-[12px] leading-[16px]">
        {children}
      </span>
      <ChevronsUpDown className="size-[12px] text-[#9aa1ac] shrink-0" />
    </div>
  )
}

function BodyCell({
  children,
  width,
  className = "",
}: {
  children: React.ReactNode
  width?: number
  className?: string
}) {
  const style = width !== undefined ? { width } : undefined
  return (
    <div
      className={`flex h-full items-center shrink-0 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
