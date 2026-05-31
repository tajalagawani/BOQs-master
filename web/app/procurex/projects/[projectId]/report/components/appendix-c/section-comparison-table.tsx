"use client"

import type { TenderSumBreakdown } from "@/modules/procurex/report/sum-breakdown"

import {
  BodyTd,
  HeaderTh,
  TenderCell,
  tagGroups,
} from "./cross-bidder-table"

/**
 * Section-level rate comparison. Aggregates each bidder's BoQ
 * section total against the PTE's section total — drives the "Per
 * section" view of the High-rate / Low-rate Appendix C sub-blocks.
 */
export interface CrossBidderSectionRow {
  id: string
  bidderId: string
  bidderCode: string
  bidderName: string
  sectionRef: string
  sectionLabel: string
  amountCents: string
  /** Baseline used for the comparison — PTE total when loaded, else
   *  the cross-bidder mean for the section. */
  pteAmountCents: string
  /** Where the baseline came from. Drives the "vs PTE" / "vs avg"
   *  badge in the table. */
  baselineSource: "pte" | "bidder_mean"
  variancePct: number
}

/**
 * Compute per-section comparisons from a `TenderSumBreakdown`
 * payload. Section totals smooth out per-item variance, so we DON'T
 * apply the threshold here — instead we filter by sign:
 *
 *   bucket='high' → every section where bidder total > PTE total
 *   bucket='low'  → every section where bidder total < PTE total
 *   bucket='all'  → every section with a computable variance
 *
 * Skips sections with no PTE total (variance is undefined there).
 * The previous threshold-filtered version hid everything because
 * section totals very rarely cross ±20% — only individual items do.
 */
export function buildSectionComparisons(
  sumBreakdown: TenderSumBreakdown | null,
  bucket: "high" | "low" | "all",
  /** Kept for API stability — currently unused; section view no
   *  longer threshold-gates because totals smooth out variance. */
  _thresholdPct?: number,
): CrossBidderSectionRow[] {
  void _thresholdPct
  if (!sumBreakdown) return []
  const rows: CrossBidderSectionRow[] = []

  for (const section of sumBreakdown.sections) {
    // Collect bidder totals for this section first — we need them
    // both as table rows AND (when no PTE) as the baseline source.
    const bidderTotals: Array<{
      bidder: (typeof sumBreakdown.bidders)[number]
      cents: bigint
    }> = []
    for (const bidder of sumBreakdown.bidders) {
      const bidderStr = sumBreakdown.perSection[section.id]?.[bidder.id]
      if (!bidderStr) continue
      try {
        bidderTotals.push({ bidder, cents: BigInt(bidderStr) })
      } catch {
        // skip non-numeric values
      }
    }
    if (bidderTotals.length === 0) continue

    // Baseline = PTE total when loaded, else the cross-bidder mean.
    let baselineCents: bigint | null = null
    let baselineSource: "pte" | "bidder_mean" = "pte"
    const pteStr = sumBreakdown.pteBySection[section.id]
    if (pteStr) {
      try {
        const pteCents = BigInt(pteStr)
        if (pteCents > 0n) baselineCents = pteCents
      } catch {
        // fall through to bidder-mean
      }
    }
    if (baselineCents === null) {
      // Bidder-mean fallback.
      let sum = 0n
      for (const x of bidderTotals) sum += x.cents
      const mean = sum / BigInt(bidderTotals.length)
      if (mean > 0n) {
        baselineCents = mean
        baselineSource = "bidder_mean"
      }
    }
    if (baselineCents === null) continue

    for (const { bidder, cents: bidderCents } of bidderTotals) {
      const variancePct =
        (Number(bidderCents - baselineCents) / Number(baselineCents)) * 100
      if (!Number.isFinite(variancePct)) continue

      const include =
        bucket === "all"
          ? true
          : bucket === "high"
            ? variancePct > 0
            : variancePct < 0
      if (!include) continue

      rows.push({
        id: `${bidder.id}:${section.id}`,
        bidderId: bidder.id,
        bidderCode: bidder.code,
        bidderName: bidder.name,
        sectionRef: section.no,
        sectionLabel: section.label,
        amountCents: bidderCents.toString(),
        pteAmountCents: baselineCents.toString(),
        baselineSource,
        variancePct,
      })
    }
  }

  // Sort by bidder code (groups stay contiguous), then by |variance|
  // descending — worst sections surface first per bidder.
  rows.sort((a, b) => {
    const c = a.bidderCode.localeCompare(b.bidderCode, undefined, {
      numeric: true,
    })
    if (c !== 0) return c
    return Math.abs(b.variancePct) - Math.abs(a.variancePct)
  })
  return rows
}

export function CrossBidderSectionRateTable({
  rows,
  variancePositiveIsBad,
}: {
  rows: CrossBidderSectionRow[]
  variancePositiveIsBad: boolean
}) {
  const tagged = tagGroups(rows)
  return (
    <table className="w-full text-[12px] border-collapse">
      <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
        <tr className="bg-[rgba(226,237,247,0.5)]">
          <HeaderTh sticky width={200}>Tenderer</HeaderTh>
          <HeaderTh width={80}>Sec. ref</HeaderTh>
          <HeaderTh>Section</HeaderTh>
          <HeaderTh width={150} align="right">Bidder total</HeaderTh>
          <HeaderTh width={180} align="right">Baseline</HeaderTh>
          <HeaderTh width={150} align="right">Δ</HeaderTh>
          <HeaderTh width={120} align="right">Variance %</HeaderTh>
        </tr>
      </thead>
      <tbody>
        {tagged.map((row) => {
          const delta =
            BigInt(row.amountCents) - BigInt(row.pteAmountCents)
          return (
            <tr key={row.id}>
              <BodyTd sticky width={200} isGroupStart={row.isFirstInGroup}>
                <TenderCell
                  code={row.bidderCode}
                  name={row.bidderName}
                  firstOfGroup={row.isFirstInGroup}
                />
              </BodyTd>
              <BodyTd width={80} className="font-mono text-[#142845] text-[11px]" isGroupStart={row.isFirstInGroup}>
                {row.sectionRef}
              </BodyTd>
              <BodyTd className="text-[#262626] text-[13px] leading-[18px]" isGroupStart={row.isFirstInGroup}>
                <span className="line-clamp-2">{row.sectionLabel}</span>
              </BodyTd>
              <BodyTd
                width={150}
                align="right"
                className="text-[#262626] text-[12px] tabular-nums"
                isGroupStart={row.isFirstInGroup}
              >
                {formatAed(row.amountCents)}
              </BodyTd>
              <BodyTd
                width={180}
                align="right"
                isGroupStart={row.isFirstInGroup}
              >
                <span className="inline-flex items-center gap-[6px] justify-end">
                  <BaselineBadge source={row.baselineSource} />
                  <span className="text-[#555] text-[12px] tabular-nums">
                    {formatAed(row.pteAmountCents)}
                  </span>
                </span>
              </BodyTd>
              <BodyTd
                width={150}
                align="right"
                className={`text-[12px] tabular-nums font-medium ${signedToneClass(
                  Number(delta),
                  variancePositiveIsBad,
                )}`}
                isGroupStart={row.isFirstInGroup}
              >
                {formatSignedAed(delta)}
              </BodyTd>
              <BodyTd
                width={120}
                align="right"
                className={`text-[12px] tabular-nums font-semibold ${signedToneClass(
                  row.variancePct,
                  variancePositiveIsBad,
                )}`}
                isGroupStart={row.isFirstInGroup}
              >
                {formatVariance(row.variancePct)}
              </BodyTd>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function BaselineBadge({ source }: { source: "pte" | "bidder_mean" }) {
  if (source === "pte") {
    return (
      <span className="bg-[#e2edf7] text-[#142845] text-[9px] font-semibold tracking-wider uppercase px-[5px] py-[1px] rounded-[4px]">
        PTE
      </span>
    )
  }
  return (
    <span
      className="bg-[#fff4e0] text-[#7a5d00] text-[9px] font-semibold tracking-wider uppercase px-[5px] py-[1px] rounded-[4px]"
      title="No PTE loaded — using the cross-bidder mean as the baseline."
    >
      Avg
    </span>
  )
}

function formatAed(cents: string | null): string {
  if (!cents) return "—"
  try {
    const n = Number(BigInt(cents)) / 100
    return `AED ${n.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  } catch {
    return "—"
  }
}

function formatSignedAed(cents: bigint): string {
  const n = Number(cents) / 100
  const sign = n > 0 ? "+" : ""
  return `${sign}AED ${Math.abs(n).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.replace("+AED -", "−AED ").replace("AED -", "−AED ")
}

function formatVariance(pct: number): string {
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)}%`
}

function signedToneClass(n: number, positiveIsBad: boolean): string {
  if (!Number.isFinite(n) || n === 0) return "text-[#555]"
  const isBad = positiveIsBad ? n > 0 : n < 0
  return isBad ? "text-[#8b1c1c]" : "text-[#1b5e20]"
}
