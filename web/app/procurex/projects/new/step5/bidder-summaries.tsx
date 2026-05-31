"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import type { ProjectBidderOverviewRow } from "@/modules/procurex/review/overview-data"

const CARD_BG_STYLE: React.CSSProperties = {
  background:
    "linear-gradient(to bottom, #0f2e5d 0%, #2e5fa8 48.437%, #afc5e8 100%)",
}

const formatAedMillions = (cents: bigint): string => {
  // cents → AED is /100; AED → millions is /1_000_000 ⇒ /100_000_000.
  const millions = Number(cents) / 100_000_000
  return `${millions.toFixed(2)}M`
}

const formatAedFull = (cents: bigint): string => {
  const aed = Number(cents) / 100
  return `${Math.round(aed).toLocaleString("en-US")} AED`
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

interface Pill {
  count: number
  label: string
}

function pillsFor(b: ProjectBidderOverviewRow): Pill[] {
  return [
    { count: b.counts.variance, label: "Variance" },
    { count: b.counts.highRate, label: "High rates" },
    { count: b.counts.unpriced, label: "Unpriced" },
    { count: b.counts.commercial, label: "Commercial Deviation" },
    { count: b.counts.technical, label: "Technical Deviations" },
    { count: b.counts.contractual, label: "Contractual Deviation" },
    { count: b.counts.arithmeticalError, label: "Arithmetical errors" },
  ]
}

export function BidderSummaries({
  id,
  ptePresent,
  bidders,
  onPrepareReview,
}: {
  id: string
  ptePresent: boolean
  /** Real tenderers + their derived summary data. When empty/null,
   *  the section renders a single "No bidders / Not implemented"
   *  card so the layout stays consistent. */
  bidders: ProjectBidderOverviewRow[] | null
  onPrepareReview?: (bidderId: string) => void
}) {
  const [open, setOpen] = useState(true)
  const loading = bidders === null
  const empty = bidders !== null && bidders.length === 0

  return (
    <section
      id={id}
      className="bg-white rounded-[16px] p-[24px] flex flex-col gap-[16px]"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-[12px]">
          <span className="bg-[#142845] flex items-center justify-center px-[8px] py-[2px] rounded-[8px] min-w-[40px]">
            <span className="font-medium text-white text-[12px] leading-[20px]">
              04
            </span>
          </span>
          <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
            Tenderer Summaries
          </h3>
        </div>
        {open ? (
          <ChevronUp className="size-[16px] text-[#142845]" />
        ) : (
          <ChevronDown className="size-[16px] text-[#142845]" />
        )}
      </button>
      <p className="font-light text-[#555] text-[12px] leading-[16px]">
        Per-bidder snapshot for the current revision.
      </p>

      {open && (
        <div className="flex flex-col gap-[16px]">
          {loading && (
            <div className="text-[12px] text-[#888] py-[24px] text-center border border-dashed border-[#e0e0e0] rounded-[12px]">
              Loading bidders…
            </div>
          )}
          {empty && (
            <div className="text-[12px] text-[#475569] py-[16px] px-[16px] border border-dashed border-[#94a3b8] rounded-[12px] bg-[#f8fafc]">
              No tenderers on this project yet. Add bidders in Step 3 to
              populate this section.
            </div>
          )}
          {bidders?.map((b) => {
            const pills = pillsFor(b)
            const hasTenderSum = Boolean(b.tenderSumCents)
            const hasPtcSum = Boolean(b.adjustedSumCents ?? b.tenderSumCents)
            const ptcSumCents = b.adjustedSumCents ?? b.tenderSumCents
            return (
              <div
                key={b.id}
                className="border border-[#e2edf7] flex flex-col gap-[32px] p-[24px] rounded-[16px]"
                style={CARD_BG_STYLE}
              >
                {/* Header */}
                <div className="flex gap-[8px] h-[32px] items-center w-full">
                  <h4 className="flex-1 font-semibold text-white text-[18px] leading-[24px]">
                    {b.name}
                    <span className="ml-2 font-mono text-white/70 text-[12px]">
                      {b.code}
                    </span>
                  </h4>
                  {b.rank !== null && b.rank > 0 ? (
                    <span className="bg-[#92cbac] flex h-[24px] items-center justify-center px-[8px] rounded-[8px]">
                      <span className="font-normal text-black text-[12px] leading-[16px] whitespace-nowrap">
                        Rank #{b.rank}
                      </span>
                    </span>
                  ) : (
                    <NotImplementedChip label="Rank" />
                  )}
                </div>

                {/* Big numbers */}
                <div className="flex gap-[32px] items-start flex-wrap">
                  <div className="flex flex-col items-start">
                    <p className="font-normal text-white text-[12px] leading-[16px]">
                      Tender Sum
                    </p>
                    {hasTenderSum ? (
                      <>
                        <p
                          className="font-bold text-white text-[40px] leading-[64px]"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {formatAedMillions(BigInt(b.tenderSumCents!))}
                        </p>
                        <p className="font-medium text-white text-[14px] leading-[24px]">
                          {formatAedFull(BigInt(b.tenderSumCents!))}
                        </p>
                      </>
                    ) : (
                      <div className="mt-[8px]">
                        <NotImplementedChip />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <p className="font-normal text-white text-[12px] leading-[16px]">
                      {ptePresent ? "Corrected Tender Sum" : "Adjusted Sum"}
                    </p>
                    {hasPtcSum && ptcSumCents ? (
                      <>
                        <p
                          className="font-bold text-white text-[40px] leading-[64px]"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {formatAedMillions(BigInt(ptcSumCents))}
                        </p>
                        <p className="font-medium text-white text-[14px] leading-[24px]">
                          {formatAedFull(BigInt(ptcSumCents))}
                        </p>
                      </>
                    ) : (
                      <div className="mt-[8px]">
                        <NotImplementedChip />
                      </div>
                    )}
                  </div>
                </div>

                {/* Pills */}
                <div className="flex flex-wrap gap-[8px] items-start w-full">
                  {pills.map((p) => (
                    <span
                      key={p.label}
                      className="relative bg-white flex h-[24px] items-center justify-center px-[8px] rounded-[8px]"
                      style={{
                        boxShadow:
                          "inset 0 -0.5px 1px rgba(255,255,255,0.3), inset 0 -0.5px 1px rgba(255,255,255,0.25), inset 0 1.5px 4px rgba(0,0,0,0.08), inset 0 1.5px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      <span className="text-[#142845] text-[12px] leading-[16px] whitespace-nowrap">
                        <span className="font-semibold">{p.count} </span>
                        <span className="font-normal">{p.label}</span>
                      </span>
                    </span>
                  ))}
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={() => onPrepareReview?.(b.id)}
                  className="bg-white flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px] w-full hover:bg-gray-50"
                >
                  <span className="font-normal text-[#142845] text-[12px] leading-[16px] whitespace-nowrap">
                    Prepare and review PTC
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
