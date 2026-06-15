"use client"

import type { ProjectBidderOverviewRow } from "@/modules/procurex/review/overview-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"
import {
  CodeBadge,
  DataTable,
  Delta,
  InternalBadge,
  Legend,
  Prose,
  Rank,
  SectionTitle,
  SuiteChip,
} from "@/components/suite"
import type { SuiteTone } from "@/components/suite"

import { formatAed, formatVariance } from "./section-shell"

/**
 * 02. Tenderer Comparison — Figma 1295:86728, restyled to the 10X suite.
 *
 * Six columns: Tenderer | Tender Value | % from PTE | % from baseline |
 * % from lowest bidder | Key issues (a leading Rank cell carries the real
 * `ranking.rank`). The PTE `tr.total` row is bound to the real
 * `sumBreakdown.totals.pte`.
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
  const pteTotalCents = sumBreakdown?.totals.pte ?? null

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <SectionTitle no="02" title="Tenderer Comparison" />

      {/* Tender rankings table */}
      <DataTable
        minWidth={760}
        className="max-h-[520px] overflow-auto print:max-h-none print:overflow-visible"
      >
        <thead>
          <tr>
            <th style={{ width: "6%" }}>Rank</th>
            <th>Tenderer</th>
            <th className="r">Tender Value</th>
            <th className="r">% from PTE</th>
            <th className="r">% from baseline</th>
            <th className="r">% from lowest bidder</th>
            <th>Key issues</th>
          </tr>
        </thead>
        <tbody>
          {rankings.length === 0 ? (
            <tr>
              <td colSpan={7} className="c text-suite-ink-3">
                No tenderer submissions yet.
              </td>
            </tr>
          ) : (
            <>
              {rankings.map((r) => {
                const isLowest = r.bidderId === lowestBidderId
                const overview = bidders.find((b) => b.id === r.bidderId)
                const pctVsPte = variancePctVsPteById.get(r.bidderId) ?? null
                return (
                  <tr key={r.bidderId} className={isLowest ? "low" : undefined}>
                    <td>
                      <Rank>{r.rank}</Rank>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <CodeBadge>{r.code}</CodeBadge>
                        <span className="text-[13.5px] text-suite-ink">
                          {r.name}
                        </span>
                      </span>
                    </td>
                    <td className="r suite-num text-suite-ink">
                      {formatAed(r.adjustedSumCents ?? r.tenderSumCents)}
                    </td>
                    <td className="r suite-num">
                      {pctVsPte === null ? (
                        <span className="text-suite-ink-4">—</span>
                      ) : (
                        <Delta
                          dir={
                            pctVsPte > 0 ? "up" : pctVsPte < 0 ? "down" : "flat"
                          }
                        >
                          {formatVariance(pctVsPte)}
                        </Delta>
                      )}
                    </td>
                    <td className="r suite-num text-suite-ink-4">—</td>
                    <td className="r suite-num">
                      {isLowest ? (
                        <span className="text-suite-ink-3">0%</span>
                      ) : (
                        <Delta
                          dir={
                            (r.variancePctVsLowest ?? 0) > 0
                              ? "up"
                              : (r.variancePctVsLowest ?? 0) < 0
                                ? "down"
                                : "flat"
                          }
                        >
                          {formatVariance(r.variancePctVsLowest)}
                        </Delta>
                      )}
                    </td>
                    <td>
                      <KeyIssuesStack
                        isLowest={isLowest}
                        counts={overview?.counts}
                      />
                    </td>
                  </tr>
                )
              })}
              <tr className="total">
                <td />
                <td>
                  <span className="inline-flex items-center gap-2">
                    Pre-Tender Estimate
                    <InternalBadge />
                  </span>
                </td>
                <td className="r suite-num text-suite-ink">
                  {formatAed(pteTotalCents)}
                </td>
                <td className="r suite-num text-suite-ink-4">—</td>
                <td className="r suite-num text-suite-ink-4">—</td>
                <td className="r suite-num text-suite-ink-4">—</td>
                <td />
              </tr>
            </>
          )}
        </tbody>
      </DataTable>

      <Legend>
        <span>
          Issues key: arithmetical · high-rate · unpriced · variance ·
          deviations. Ranking uses the QS-adjusted sum, lowest first.
        </span>
      </Legend>

      {/* QS Recommendation */}
      <div className="mt-6 flex flex-col gap-2">
        <label className="text-[12px] text-suite-ink-2">QS Recommendation</label>
        <div className="flex min-h-[64px] w-full items-center rounded-[14px] border border-suite-line-2 bg-suite-panel px-4 py-2">
          <span className="text-[13.5px] italic leading-[1.6] text-suite-ink-3">
            Add any context for the employer (e.g. pricing strategy, known
            exclusions, key risks)
          </span>
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
  const chips: { label: string; tone: SuiteTone }[] = []
  if (isLowest) chips.push({ label: "Lowest", tone: "good" })
  if (counts) {
    if (counts.arithmeticalError > 0)
      chips.push({
        label: `${counts.arithmeticalError} arith.`,
        tone: "dang",
      })
    if (counts.highRate > 0)
      chips.push({ label: `${counts.highRate} high-rate`, tone: "dang" })
    if (counts.unpriced > 0)
      chips.push({ label: `${counts.unpriced} unpriced`, tone: "warn" })
    if (counts.variance > 0)
      chips.push({ label: `${counts.variance} variance`, tone: "warn" })
    const deviations =
      counts.commercial + counts.contractual + counts.technical
    if (deviations > 0)
      chips.push({ label: `${deviations} deviations`, tone: "neut" })
  }
  if (chips.length === 0)
    return <span className="text-[11px] text-suite-ink-4">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <SuiteChip key={c.label} tone={c.tone} dot={false} className="px-1.5 py-px text-[10px]">
          {c.label}
        </SuiteChip>
      ))}
    </div>
  )
}
