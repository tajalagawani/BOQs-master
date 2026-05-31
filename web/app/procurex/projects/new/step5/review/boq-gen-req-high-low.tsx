"use client"

import { useState } from "react"
import { ChevronsUpDown, ChevronUp, TrendingUp } from "lucide-react"

import type { BoqRateAnalysisRow } from "@/modules/procurex/review/types"

/**
 * Section D sub-block — General Requirements: High / Low rates.
 *
 * Data source: tender_flag(kind IN ('high_rate','low_rate')) JOIN
 * boq_item JOIN boq_section WHERE boq_section.pricing_mode = 'general_req'.
 * Same row shape as the main-works rate-analysis tables; just filtered.
 */

export interface BoqGeneralRequirementsHighLowBlockProps {
  id?: string
  high: BoqRateAnalysisRow[]
  low: BoqRateAnalysisRow[]
}

export function BoqGeneralRequirementsHighLowBlock({
  id,
  high,
  low,
}: BoqGeneralRequirementsHighLowBlockProps) {
  return (
    <section
      id={id}
      className="flex flex-col gap-[32px] w-full scroll-mt-[120px]"
    >
      <div className="flex items-center gap-[8px] w-full">
        <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[8px] size-[40px] shrink-0">
          <TrendingUp className="size-[16px] text-[#142845]" />
        </span>
        <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px]">
          General Requirements — High / Low rates
        </h3>
      </div>

      <RateTable
        anchorId="boq-gen-req-high"
        title="High rates (General Requirements)"
        emptyLabel="No high-rate flags on general-requirements items for this bidder."
        rows={high}
      />
      <RateTable
        anchorId="boq-gen-req-low"
        title="Low rates (General Requirements)"
        emptyLabel="No low-rate flags on general-requirements items for this bidder."
        rows={low}
      />
    </section>
  )
}

function RateTable({
  anchorId,
  title,
  emptyLabel,
  rows,
}: {
  anchorId: string
  title: string
  emptyLabel: string
  rows: BoqRateAnalysisRow[]
}) {
  const [open, setOpen] = useState(true)
  const [includes, setIncludes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.includeInPtc])),
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
          <div className="flex items-start w-full">
            <div className="flex flex-1 items-center gap-[16px] pb-[8px] pr-[8px] pl-[16px] pt-[12px]">
              <Th width={80}>Item ID</Th>
              <Th width={216}>Description</Th>
              <Th width={80}>Unit</Th>
              <Th width={104}>Rate</Th>
              <Th width={112}>Benchmark</Th>
              <Th>Variance %</Th>
            </div>
            <div className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-tl-[8px] px-[16px] w-[160px] shrink-0 h-[24px] mt-[12px]">
              <p className="font-semibold text-[#434343] text-[12px] leading-[16px]">
                Include in PTC?
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="border-t border-[#e2edf7] py-[24px] text-center text-[12px] text-[#888]">
              {emptyLabel}
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
                    <BodyCell width={80} className="text-black text-[12px] leading-[16px]">
                      {row.itemRef}
                    </BodyCell>
                    <BodyCell width={216} className="text-[#262626] text-[14px] leading-[20px] line-clamp-2">
                      {row.description}
                    </BodyCell>
                    <BodyCell width={80} className="text-[#262626] text-[14px] leading-[24px]">
                      {row.unit}
                    </BodyCell>
                    <BodyCell width={104} className="text-[#262626] text-[14px] leading-[24px] tabular-nums">
                      {formatCents(row.rateCents)}
                    </BodyCell>
                    <BodyCell width={112} className="text-[#262626] text-[14px] leading-[24px] tabular-nums">
                      {formatCents(row.baselineCents)}
                    </BodyCell>
                    <BodyCell className="flex-1 text-[#262626] text-[14px] leading-[24px] tabular-nums">
                      {formatVariance(row.variancePct)}
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
