"use client"

import { ChevronUp, ChevronsUpDown } from "lucide-react"

import type { ProjectBidderOverviewRow } from "@/modules/procurex/review/overview-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { formatAed, formatVariance } from "./section-shell"

/**
 * 02. Tenderer Comparison — Figma 1295:86728.
 *
 * Six columns: Tenderer | Tender Value | % from PTE | % from baseline |
 * % from lowest bidder | Key issues.
 *
 * Variance columns:
 *   - % from PTE       → `sumBreakdown.bidders[id].variancePctVsPte`
 *                        (real, from `tenderer_submissions.adjustedSumCents`
 *                        vs PTE total). "—" until PTE is loaded.
 *   - % from baseline  → baseline tender model not yet wired → "—"
 *   - % from lowest    → derived from `rankings.variancePctVsLowest`
 *
 * "Key issues" is a chip stack of non-zero flag counts (variance,
 * high-rate, unpriced, arithmetical, deviations) plus a "Lowest"
 * pill for the lowest tenderer.
 */
export function TenderComparisonSection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { rankings, lowestBidderId, bidders, sumBreakdown } = data

  const variancePctVsPteById = new Map<string, number | null>(
    (sumBreakdown?.bidders ?? []).map((b) => [b.id, b.variancePctVsPte]),
  )

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <div className="flex flex-col gap-[8px] w-full">
          <div className="flex gap-[32px] h-[32px] items-center w-full">
            <div className="flex flex-1 gap-[8px] items-center min-w-px">
              <span className="bg-[#142845] flex h-[24px] items-center justify-center px-[16px] rounded-[30px] w-[40px] text-white text-[12px] leading-[16px] font-medium">
                02
              </span>
              <h2 className="text-[#142845] text-[18px] leading-[24px] font-semibold">
                Tenderer Comparison
              </h2>
            </div>
            <button
              type="button"
              aria-label="Collapse"
              className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-[rgba(226,237,247,0.5)]"
            >
              <ChevronUp className="size-[16px] text-[#142845]" />
            </button>
          </div>
        </div>

        {/* Tender rankings table */}
        <div className="border border-[#e2edf7] rounded-[12px] overflow-auto max-h-[520px] print:max-h-none print:overflow-visible">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
              <tr className="bg-[rgba(226,237,247,0.5)]">
                <Th>Tenderer</Th>
                <Th align="right">Tender Value</Th>
                <Th align="right">% from PTE</Th>
                <Th align="right">% from baseline</Th>
                <Th align="right">% from lowest bidder</Th>
                <Th>Key issues</Th>
              </tr>
            </thead>
            <tbody>
              {rankings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-[24px] text-center text-[#888]"
                  >
                    No tenderer submissions yet.
                  </td>
                </tr>
              ) : (
                rankings.map((r) => {
                  const isLowest = r.bidderId === lowestBidderId
                  const overview = bidders.find((b) => b.id === r.bidderId)
                  const pctVsPte = variancePctVsPteById.get(r.bidderId) ?? null
                  return (
                    <tr key={r.bidderId} className="border-t border-[#f0f0f0]">
                      <Td>
                        <span className="text-[#142845] text-[14px] leading-[20px]">
                          {r.name}
                        </span>
                      </Td>
                      <Td align="right" className="tabular-nums text-[#142845] text-[14px]">
                        {formatAed(r.adjustedSumCents ?? r.tenderSumCents)}
                      </Td>
                      <Td
                        align="right"
                        className={`tabular-nums text-[12px] ${
                          pctVsPte === null
                            ? "text-[#888]"
                            : pctVsPte > 0
                              ? "text-[#8b1c1c]"
                              : pctVsPte < 0
                                ? "text-[#1b5e20]"
                                : "text-[#555]"
                        }`}
                      >
                        {formatVariance(pctVsPte)}
                      </Td>
                      <Td align="right" className="tabular-nums text-[#555] text-[12px]">
                        —
                      </Td>
                      <Td align="right" className="tabular-nums text-[#555] text-[12px]">
                        {isLowest ? "0%" : formatVariance(r.variancePctVsLowest)}
                      </Td>
                      <Td>
                        <KeyIssuesStack
                          isLowest={isLowest}
                          counts={overview?.counts}
                        />
                      </Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* QS Recommendation */}
        <div className="flex flex-col gap-[8px] w-full">
          <label className="text-[#434343] text-[12px] leading-[16px] font-normal">
            QS Recommendation
          </label>
          <div className="bg-white border border-[#d9d9d9] rounded-[16px] px-[16px] py-[8px] min-h-[64px] flex items-center w-full">
            <span className="text-[#555] text-[14px] leading-[24px] italic">
              Add any context for the employer (e.g. pricing strategy, known
              exclusions, key risks)
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function KeyIssuesStack({
  isLowest,
  counts,
}: {
  isLowest: boolean
  counts?: ProjectBidderOverviewRow["counts"]
}) {
  const chips: { label: string; tone: "danger" | "warning" | "info" | "ok" }[] = []
  if (isLowest) chips.push({ label: "Lowest", tone: "ok" })
  if (counts) {
    if (counts.arithmeticalError > 0)
      chips.push({
        label: `${counts.arithmeticalError} arith.`,
        tone: "danger",
      })
    if (counts.highRate > 0)
      chips.push({ label: `${counts.highRate} high-rate`, tone: "danger" })
    if (counts.unpriced > 0)
      chips.push({ label: `${counts.unpriced} unpriced`, tone: "warning" })
    if (counts.variance > 0)
      chips.push({ label: `${counts.variance} variance`, tone: "warning" })
    const deviations =
      counts.commercial + counts.contractual + counts.technical
    if (deviations > 0)
      chips.push({ label: `${deviations} deviations`, tone: "info" })
  }
  if (chips.length === 0)
    return <span className="text-[#888] text-[11px]">—</span>
  return (
    <div className="flex flex-wrap gap-[4px]">
      {chips.map((c) => (
        <Chip key={c.label} tone={c.tone}>
          {c.label}
        </Chip>
      ))}
    </div>
  )
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: "danger" | "warning" | "info" | "ok"
}) {
  const styles = {
    danger: "bg-[#fdecea] text-[#8b1c1c]",
    warning: "bg-[#fff4e0] text-[#7a5d00]",
    info: "bg-[#e2edf7] text-[#142845]",
    ok: "bg-[#e8f5e9] text-[#1b5e20]",
  }[tone]
  return (
    <span
      className={`inline-flex items-center text-[10px] leading-[14px] font-medium px-[6px] py-[1px] rounded-[6px] ${styles}`}
    >
      {children}
    </span>
  )
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <th
      className={`py-[10px] px-[12px] text-[#434343] text-[11px] leading-[16px] font-semibold uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className="inline-flex items-center gap-[4px]">
        {children}
        <ChevronsUpDown className="size-[12px] text-[#9aa1ac]" />
      </span>
    </th>
  )
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode
  align?: "left" | "right"
  className?: string
}) {
  return (
    <td
      className={`py-[12px] px-[12px] ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  )
}
