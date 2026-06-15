"use client"

import { FileText } from "lucide-react"

import { Prose, SubTitle } from "@/components/suite"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"

import { tagGroups } from "./cross-bidder-table"
import {
  CrossBidderDeviationTable,
  type CrossBidderDeviationRow,
} from "./deviation-list"

export function ContractualDeviationsBlock({
  id,
  appendixC,
}: {
  id: string
  appendixC: AppendixCData | null
}) {
  const tenderers = appendixC?.tenderers ?? []
  const flat: CrossBidderDeviationRow[] = tenderers.flatMap((b) =>
    (appendixC?.byBidder[b.id]?.bidderDeviations?.contractual ?? []).map(
      (r) => ({
        ...r,
        bidderId: b.id,
        bidderCode: b.code,
        bidderName: b.name,
        isFirstInGroup: false,
      }),
    ),
  )
  const tagged = tagGroups(flat)

  return (
    <section id={id} className="scroll-mt-[24px] print:break-inside-avoid">
      <SubTitle
        count={
          flat.length === 0
            ? "No contractual deviations"
            : `${flat.length} ${flat.length === 1 ? "row" : "rows"}`
        }
      >
        <FileText className="size-[16px] text-suite-navy-2" />
        Contractual Deviations
      </SubTitle>
      <Prose size={12} muted>
        Bidder qualifications affecting the contract — programme, LDs,
        indemnities, warranties, dispute resolution, etc.
      </Prose>
      {flat.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-suite-line bg-suite-card-soft py-7 text-center text-[12px] text-suite-ink-4">
          No contractual deviations
        </div>
      ) : (
        <div className="rounded-[14px] border border-suite-line bg-suite-panel">
          <CrossBidderDeviationTable rows={tagged} />
        </div>
      )}
    </section>
  )
}
