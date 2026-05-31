"use client"

import { Banknote } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"

import {
  CrossBidderTableShell,
  tagGroups,
} from "./cross-bidder-table"
import {
  CrossBidderDeviationTable,
  type CrossBidderDeviationRow,
} from "./deviation-list"

export function CommercialDeviationsBlock({
  id,
  appendixC,
}: {
  id: string
  appendixC: AppendixCData | null
}) {
  const tenderers = appendixC?.tenderers ?? []
  const flat: CrossBidderDeviationRow[] = tenderers.flatMap((b) =>
    (appendixC?.byBidder[b.id]?.bidderDeviations?.commercial ?? []).map(
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
      title="Commercial Deviations"
      hint="Bidder qualifications affecting price — payment terms, OH&P methodology, prelims pricing, currency exposure, etc."
      icon={<Banknote className="size-[16px] text-[#142845]" />}
      rowCount={flat.length}
      emptyLabel="No commercial deviations"
    >
      <CrossBidderDeviationTable rows={tagged} />
    </CrossBidderTableShell>
  )
}
