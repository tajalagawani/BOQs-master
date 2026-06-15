"use client"

import { SectionTitle, HeadlineCards, Prose, SuiteChip } from "@/components/suite"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { formatAed } from "./section-shell"

/**
 * 01. Executive Summary — restyled to the 10X suite (procurex-step6-10x-style).
 *
 * Layout (pixel-faithful to the reference's section 01):
 *  - <SectionTitle no="01"> "Executive Summary"
 *  - <HeadlineCards> — 4 cards, lead (green) = lowest adjusted tender:
 *      Lowest tender (adjusted) · Most commercially compliant ·
 *      Most technically compliant · Award-eligible
 *  - <Prose> narrative carrying the same sentences as the prior PTE
 *    callout (lowest vs PTE, most commercial, most technical).
 *
 * Every value stays bound to the component's existing real exec data
 * (rankings / sumBreakdown.variancePctVsPte / bidder flag counts /
 * compliance cells). The PTE drives this internal report and is never
 * disclosed to bidders.
 */
export function ExecutiveSummarySection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { rankings, lowestBidderId, bidders, sumBreakdown, compliance } = data
  const lowest = rankings.find((r) => r.bidderId === lowestBidderId)
  const lowestName = lowest?.name ?? "—"
  const lowestCode = lowest?.code ?? "—"
  const lowestSum = formatAed(
    lowest?.adjustedSumCents ?? lowest?.tenderSumCents ?? null,
  )

  // Real variance vs PTE — sourced from `summary.variancePctVsPte`
  // (which `getProjectBoq` computes per bidder against the PTE total).
  // Positive = above the PTE, negative = below.
  const lowestVariancePct =
    sumBreakdown?.bidders.find((b) => b.id === lowestBidderId)?.variancePctVsPte ??
    null
  const varianceVsPte =
    lowestVariancePct === null
      ? "—"
      : `${Math.abs(lowestVariancePct).toFixed(1)}%`
  const direction =
    lowestVariancePct === null
      ? "vs"
      : lowestVariancePct > 0
        ? "above"
        : lowestVariancePct < 0
          ? "below"
          : "matching"

  // Commercial / technical compliance leaders — for now we pick the
  // bidder with the *fewest* commercial / technical deviations from
  // `flagCounts` (a real signal once the deviation extractor runs).
  // Ties broken by bidder code for a deterministic readout.
  const sortByLowest = (key: "commercial" | "technical") =>
    [...bidders].sort((a, b) => {
      const av = a.counts[key]
      const bv = b.counts[key]
      if (av !== bv) return av - bv
      return a.code.localeCompare(b.code, undefined, { numeric: true })
    })[0]
  const commercialLeader = sortByLowest("commercial")
  const mostCommercial = commercialLeader?.name ?? "—"
  const commercialCode = commercialLeader?.code ?? "—"
  const commercialPct =
    bidders.length > 0
      ? `${((1 - (commercialLeader?.counts.commercial ?? 0) / Math.max(1, Math.max(...bidders.map((b) => b.counts.commercial)))) * 100).toFixed(0)}%`
      : "—"
  const technicalLeader = sortByLowest("technical")
  const mostTechnical = technicalLeader?.name ?? "—"
  const technicalCode = technicalLeader?.code ?? "—"
  const technicalPct =
    bidders.length > 0
      ? `${((1 - (technicalLeader?.counts.technical ?? 0) / Math.max(1, Math.max(...bidders.map((b) => b.counts.technical)))) * 100).toFixed(0)}%`
      : "—"

  // Award-eligible — a bidder passes the gate when all five compliance
  // cells are compliant (same cells the Compliance Requirements section
  // renders). Real count, no hardcoded reference numbers.
  const totalBidders = compliance.length
  const eligibleCount = compliance.filter((row) =>
    Object.values(row.cells).every((c) => c === "compliant"),
  ).length
  const allEligible = totalBidders > 0 && eligibleCount === totalBidders

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="suite">
        <SectionTitle no="01" title="Executive Summary" />

        <Prose size={12} muted>
          This is a commercial evaluation summary and should be read alongside
          technical and contractual review.
        </Prose>

        <HeadlineCards
          cards={[
            {
              k: "Lowest tender (adjusted)",
              who: { code: lowestCode, name: lowestName },
              v: lowestSum,
              vs: `${varianceVsPte} ${direction} PTE`,
              lead: true,
            },
            {
              k: "Most commercially compliant",
              who: { code: commercialCode, name: mostCommercial },
              vs: `most compliant by ${commercialPct}`,
            },
            {
              k: "Most technically compliant",
              who: { code: technicalCode, name: mostTechnical },
              vs: `most compliant by ${technicalPct}`,
            },
            {
              k: "Award-eligible",
              v:
                totalBidders > 0 ? (
                  <SuiteChip tone={allEligible ? "good" : "warn"}>
                    {eligibleCount} of {totalBidders} pass
                  </SuiteChip>
                ) : (
                  <SuiteChip tone="neut" dot={false}>
                    No data
                  </SuiteChip>
                ),
              vs: "all five criteria satisfied",
            },
          ]}
        />

        <Prose>
          <b>{lowestName}</b> is the lowest tenderer at <b>{lowestSum}</b>, which
          is <b>{varianceVsPte} {direction}</b> the PTE.
        </Prose>
        <Prose>
          <b>{mostCommercial}</b> is the most compliant commercial by{" "}
          <b>{commercialPct}</b>. <b>{mostTechnical}</b> is the most compliant
          technical by <b>{technicalPct}</b>.
        </Prose>

        {/* QS Recommendation input */}
        <div className="mt-2 flex flex-col gap-[8px] w-full">
          <label className="text-suite-ink-3 text-[12px] leading-[16px] font-medium">
            QS Recommendation
          </label>
          <div className="bg-white border border-suite-line-2 rounded-[14px] px-[16px] py-[10px] min-h-[64px] flex items-center w-full">
            <span className="text-suite-ink-4 text-[13px] leading-[1.6] italic">
              Add any context for the employer (e.g. pricing strategy, known
              exclusions, key risks)
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
