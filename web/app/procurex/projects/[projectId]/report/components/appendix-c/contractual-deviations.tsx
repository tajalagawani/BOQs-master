"use client"

import { FileText } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"

import {
  CrossBidderTableShell,
  tagGroups,
} from "./cross-bidder-table"
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
    <CrossBidderTableShell
      id={id}
      title="Contractual Deviations"
      hint="Bidder qualifications affecting the contract — programme, LDs, indemnities, warranties, dispute resolution, etc."
      icon={<FileText className="size-[16px] text-[#142845]" />}
      rowCount={flat.length}
      emptyLabel="No contractual deviations"
    >
      <CrossBidderDeviationTable rows={tagged} />
    </CrossBidderTableShell>
  )
}
