"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Cog,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { BIDDERS, TENDER_RETURNS } from "./mock-data"

/**
 * Tender Returns — section 02 of the Step 5 PTC Summary.
 *
 * Mirrors Figma node 1097:240221 ("Executive Overview Accordion"): a
 * white card with a 40×24 navy pill badge, the section title, a
 * left-justified description in project navy, and a primary "View
 * Appendix A — Comparison Summary" CTA on the right. Below the header
 * sits a right-aligned "Variance baseline" dropdown, then the bidder
 * comparison table with these columns:
 *
 *   Tenderer · Original Tender Sum · Corrected Tender Sum
 *   · % from baseline · % from lowest bidder
 *   · Arithmetical errors · Excluded / By others / By client
 *   · Unpriced · High rates · Low rates · Key issues
 *
 * Variance cells carry a trending-down / trending-up icon. The 5 count
 * columns use the warm amber pill (#faebd3) the design uses for
 * "needs-review" QS counts. Key issues is plain wrap text.
 */

const FORMAT_CURRENCY = (cents: number) =>
  `AED ${Math.round(cents).toLocaleString("en-US")}`

const FORMAT_PCT = (n: number) => {
  if (!Number.isFinite(n)) return "—"
  const rounded = Math.round(n * 10) / 10
  const fixed = Math.abs(rounded).toFixed(1)
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : ""
  return `${sign}${fixed}%`
}

type BaselineMode =
  | "avg_lowest_three"
  | "median"
  | "avg_all"
  | "pte"

const BASELINE_LABEL: Record<BaselineMode, string> = {
  avg_lowest_three: "Average of lowest 3",
  median: "Median of tenderer rates",
  avg_all: "Average of all tenderers",
  pte: "Pre-Tender Estimate (PTE)",
}

export function TenderReturns({
  id,
  revision = 0,
}: {
  id: string
  revision?: number
  /** Kept for backwards compatibility with the existing call sites —
   *  no longer affects layout. */
  ptePresent?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [baselineOpen, setBaselineOpen] = useState(false)
  const [baseline, setBaseline] = useState<BaselineMode>("avg_lowest_three")

  return (
    <section
      id={id}
      className="bg-white border border-[rgba(226,237,247,0.5)] flex flex-col gap-[24px] p-[24px] rounded-[16px] scroll-mt-[120px] min-w-0 w-full"
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-[8px]">
        <div className="flex h-[32px] items-center justify-between gap-[8px]">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex flex-1 items-center gap-[8px] min-w-0 text-left"
          >
            <span className="bg-[#142845] flex h-[24px] items-center justify-center px-[16px] rounded-[30px] w-[40px] shrink-0">
              <span className="font-medium text-white text-[12px] leading-[16px]">
                02
              </span>
            </span>
            <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px] truncate">
              Tender Returns (Revision {revision})
            </h3>
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-[#f5f7fb]"
          >
            {open ? (
              <ChevronUp className="size-[16px] text-[#142845]" />
            ) : (
              <ChevronDown className="size-[16px] text-[#142845]" />
            )}
          </button>
        </div>

        <div className="flex items-end gap-[16px] w-full">
          <p className="font-light text-[#142845] text-[12px] leading-[16px] flex-1 min-w-0 max-w-[680px]">
            Procurex extracts information from Form of Tender, Cover letter,
            and BOQ to highlight any key issues. Other sources like 3D files
            or drawings are not considered at this moment.
          </p>
          <button
            type="button"
            className="bg-[#142845] flex h-[32px] items-center justify-center gap-[8px] px-[16px] py-[8px] rounded-[16px] hover:bg-[#0e1d34] shrink-0"
          >
            <span className="font-normal text-white text-[12px] leading-[16px] whitespace-nowrap">
              View Appendix A — Comparison Summary
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-[16px]">
          {/* Variance baseline picker — outlined dropdown on the right */}
          <div className="flex h-[32px] items-center justify-end relative">
            <button
              type="button"
              onClick={() => setBaselineOpen((v) => !v)}
              className="border border-[#142845] flex h-[32px] items-center gap-[8px] px-[16px] py-[8px] rounded-[16px] hover:bg-[#f5f7fb]"
            >
              <Cog className="size-[16px] text-[#142845]" />
              <span className="font-normal text-[#142845] text-[12px] leading-[16px] whitespace-nowrap">
                Variance baseline · {BASELINE_LABEL[baseline]}
              </span>
              <ChevronDown className="size-[16px] text-[#142845]" />
            </button>
            {baselineOpen && (
              <div className="absolute right-0 top-[36px] z-10 bg-white border border-[#e9e9e9] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-[4px] w-[260px]">
                {(Object.keys(BASELINE_LABEL) as BaselineMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setBaseline(m)
                      setBaselineOpen(false)
                    }}
                    className={`w-full text-left px-[12px] py-[8px] text-[12px] hover:bg-[#f5f7fb] ${
                      baseline === m
                        ? "text-[#142845] font-medium"
                        : "text-[#262626]"
                    }`}
                  >
                    {BASELINE_LABEL[m]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bidder comparison table — compact column widths so the
              section fits the Step-5 main pane (~1050 px after sidebar
              + gutters). Overflows to horizontal scroll on narrower
              widths instead of pushing the page wider. */}
          <div className="overflow-x-auto -mx-[24px] px-[24px]">
            <div className="min-w-fit">
              {/* Header row */}
              <div className="flex gap-[8px] items-center pb-[8px] w-full">
                <Th width={140}>Tenderer</Th>
                <Th width={120}>Original Sum</Th>
                <Th width={120}>Corrected Sum</Th>
                <Th width={92} info>% baseline</Th>
                <Th width={92} info>% lowest</Th>
                <Th width={64}>Arith.</Th>
                <Th width={72}>Excluded</Th>
                <Th width={72}>Unpriced</Th>
                <Th width={64}>High</Th>
                <Th width={64}>Low</Th>
                <Th flex>Key issues</Th>
              </div>

              {/* Body rows */}
              {TENDER_RETURNS.map((row) => {
                const bidder = BIDDERS.find((b) => b.id === row.bidderId)!
                return (
                  <div
                    key={row.bidderId}
                    className="border-t border-[#e2edf7] flex gap-[8px] items-center py-[12px] w-full"
                  >
                    <Cell width={140}>
                      <p className="font-normal text-black text-[12px] leading-[16px] truncate">
                        {bidder.fullName}
                      </p>
                    </Cell>
                    <Cell width={120} align="left">
                      <span className="text-[12px] text-[#262626] leading-[16px] tabular-nums truncate">
                        {FORMAT_CURRENCY(row.tenderSum)}
                      </span>
                    </Cell>
                    <Cell width={120} align="left">
                      <VarianceValue
                        value={row.variancePct}
                        text={FORMAT_CURRENCY(row.adjustedSum)}
                        showIcon
                      />
                    </Cell>
                    <Cell width={92} align="left">
                      <VarianceValue
                        value={row.variancePct}
                        text={FORMAT_PCT(row.variancePct)}
                        showIcon
                      />
                    </Cell>
                    <Cell width={92} align="left">
                      <VarianceValue
                        value={row.pctFromLowest}
                        text={FORMAT_PCT(row.pctFromLowest)}
                        showIcon
                      />
                    </Cell>
                    <Cell width={64} align="left">
                      <AmberPill value={row.arithmeticalErrors} />
                    </Cell>
                    <Cell width={72} align="left">
                      <AmberPill value={row.excludedCount} />
                    </Cell>
                    <Cell width={72} align="left">
                      <AmberPill value={row.unpricedItems} />
                    </Cell>
                    <Cell width={64} align="left">
                      <AmberPill value={row.highRates} />
                    </Cell>
                    <Cell width={64} align="left">
                      <AmberPill value={row.lowRates} />
                    </Cell>
                    <Cell flex align="left">
                      <p className="font-normal text-[#262626] text-[12px] leading-[16px] line-clamp-2">
                        {row.keyIssues || (
                          <span className="text-[#a3a3a3]">—</span>
                        )}
                      </p>
                    </Cell>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/** Header cell with the design's sort chevron + optional info icon. */
function Th({
  children,
  width,
  flex,
  info,
}: {
  children: React.ReactNode
  width?: number
  flex?: boolean
  info?: boolean
}) {
  const widthCls = flex ? "flex-1 min-w-0" : ""
  const style = width !== undefined ? { width } : undefined
  return (
    <div
      className={`flex items-center gap-[4px] shrink-0 ${widthCls}`}
      style={style}
    >
      <span className="font-semibold text-[#434343] text-[12px] leading-[16px]">
        {children}
      </span>
      {info && (
        <Info className="size-[14px] text-[#9aa1ac]" aria-hidden="true" />
      )}
      <ChevronsUpDown className="size-[14px] text-[#9aa1ac]" aria-hidden="true" />
    </div>
  )
}

function Cell({
  children,
  width,
  flex,
  align = "left",
}: {
  children: React.ReactNode
  width?: number
  flex?: boolean
  align?: "left" | "right"
}) {
  const widthCls = flex ? "flex-1 min-w-0" : ""
  const alignCls = align === "right" ? "justify-end text-right" : ""
  const style = width !== undefined ? { width } : undefined
  return (
    <div
      className={`flex items-center gap-[4px] shrink-0 ${widthCls} ${alignCls}`}
      style={style}
    >
      {children}
    </div>
  )
}

/** Number+text variance display with the trending arrow. Negative
 *  variance reads as "below baseline" (good). */
function VarianceValue({
  value,
  text,
  showIcon,
}: {
  value: number
  text: string
  showIcon?: boolean
}) {
  const Icon =
    value < 0 ? TrendingDown : value > 0 ? TrendingUp : null
  return (
    <span className="inline-flex items-center gap-[4px] min-w-0">
      {showIcon && Icon && (
        <Icon
          className={`size-[14px] shrink-0 ${
            value < 0 ? "text-emerald-600" : "text-rose-600"
          }`}
          aria-hidden="true"
        />
      )}
      <span className="text-[12px] text-[#262626] leading-[16px] tabular-nums truncate">
        {text}
      </span>
    </span>
  )
}

/** The amber "needs review" pill (#faebd3) used for QS-count columns. */
function AmberPill({ value }: { value: number }) {
  return (
    <span className="bg-[#faebd3] flex h-[24px] items-center justify-center px-[8px] rounded-[8px]">
      <span className="text-black text-[12px] leading-[16px] tabular-nums">
        {value}
      </span>
    </span>
  )
}
