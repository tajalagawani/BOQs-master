"use client"

import { AlertCircle } from "lucide-react"

import { CodeInline, Ref, SuiteChip } from "@/components/suite"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"

import {
  BodyTd,
  CrossBidderTableShell,
  HeaderTh,
  TenderCell,
  tagGroups,
} from "./cross-bidder-table"

/**
 * Appendix C — Arithmetical Errors. One cross-bidder table sorted
 * by tenderer code. Source: `byBidder[id].boqReview.arithmetical`
 * (`tender_flag(kind='arithmetical_error')`).
 *
 * 10X-suite restyle: item refs use `<Ref>`, the source document uses
 * the blue `<CodeInline>`, and the in-PTC flag uses `<SuiteChip>`
 * (good / neut). The grouped sticky-tenderer shell is retained.
 */
export function ArithmeticalErrorsBlock({
  id,
  appendixC,
}: {
  id: string
  appendixC: AppendixCData | null
}) {
  const tenderers = appendixC?.tenderers ?? []
  const flat = tenderers.flatMap((b) => {
    const rows = appendixC?.byBidder[b.id]?.boqReview?.arithmetical ?? []
    return rows.map((r) => ({
      bidderId: b.id,
      bidderCode: b.code,
      bidderName: b.name,
      ...r,
    }))
  })
  const tagged = tagGroups(flat)

  return (
    <CrossBidderTableShell
      id={id}
      title="Arithmetical Errors"
      hint="Discrepancies between bidder-stated and recomputed totals. Pulled from `tender_flag(kind='arithmetical_error')`."
      icon={<AlertCircle className="size-[16px] text-[#142845]" />}
      rowCount={flat.length}
      emptyLabel="No arithmetical errors"
    >
      <table className="w-full text-[12px] border-collapse">
        <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
          <tr className="bg-[rgba(226,237,247,0.5)]">
            <HeaderTh sticky width={200}>Tenderer</HeaderTh>
            <HeaderTh width={80}>Item ref</HeaderTh>
            <HeaderTh>Description</HeaderTh>
            <HeaderTh width={120}>Document</HeaderTh>
            <HeaderTh width={120} align="right">Expected</HeaderTh>
            <HeaderTh width={120} align="right">Found</HeaderTh>
            <HeaderTh width={120} align="right">Difference</HeaderTh>
            <HeaderTh width={120} align="right">In PTC?</HeaderTh>
          </tr>
        </thead>
        <tbody>
          {tagged.map((row) => (
            <tr key={row.id}>
              <BodyTd sticky width={200} isGroupStart={row.isFirstInGroup}>
                <TenderCell
                  code={row.bidderCode}
                  name={row.bidderName}
                  firstOfGroup={row.isFirstInGroup}
                />
              </BodyTd>
              <BodyTd width={80} isGroupStart={row.isFirstInGroup}>
                <Ref>{row.itemRef}</Ref>
              </BodyTd>
              <BodyTd className="text-suite-ink text-[13px] leading-[18px]" isGroupStart={row.isFirstInGroup}>
                <span className="line-clamp-2">{row.description}</span>
              </BodyTd>
              <BodyTd width={120} isGroupStart={row.isFirstInGroup}>
                {row.document ? (
                  <CodeInline>{row.document}</CodeInline>
                ) : (
                  <span className="text-suite-ink-4">—</span>
                )}
              </BodyTd>
              <BodyTd width={120} align="right" className="suite-num text-[12px] text-suite-ink" isGroupStart={row.isFirstInGroup}>
                {row.expected}
              </BodyTd>
              <BodyTd width={120} align="right" className="suite-num text-[12px] text-suite-ink" isGroupStart={row.isFirstInGroup}>
                {row.found}
              </BodyTd>
              <BodyTd width={120} align="right" className="suite-num text-[12px] font-semibold text-suite-dang" isGroupStart={row.isFirstInGroup}>
                {row.difference}
              </BodyTd>
              <BodyTd width={120} align="right" isGroupStart={row.isFirstInGroup}>
                <PtcPill on={row.includeInPtc} />
              </BodyTd>
            </tr>
          ))}
        </tbody>
      </table>
    </CrossBidderTableShell>
  )
}

function PtcPill({ on }: { on: boolean }) {
  if (on) {
    return <SuiteChip tone="good">Yes</SuiteChip>
  }
  return (
    <SuiteChip tone="neut" dot={false}>
      No
    </SuiteChip>
  )
}
