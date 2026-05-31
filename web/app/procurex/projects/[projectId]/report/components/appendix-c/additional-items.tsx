"use client"

import { PackagePlus } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"
import type { BoqUnpricedRow } from "@/modules/procurex/review/types"

import {
  BodyTd,
  CrossBidderTableShell,
  HeaderTh,
  TenderCell,
  tagGroups,
} from "./cross-bidder-table"

/**
 * Appendix C — Additional items.
 *
 * Source: `byBidder[id].boqUnpriced.excluded` per bidder. Each row
 * is a BoQ line the bidder marked Excluded / By client / By others
 * instead of pricing — every one needs PTC clarification before
 * contract.
 */
export function AdditionalItemsBlock({
  id,
  appendixC,
}: {
  id: string
  appendixC: AppendixCData | null
}) {
  const tenderers = appendixC?.tenderers ?? []
  const flat = tenderers.flatMap((b) =>
    (appendixC?.byBidder[b.id]?.boqUnpriced?.excluded ?? []).map((r) => ({
      ...r,
      bidderId: b.id,
      bidderCode: b.code,
      bidderName: b.name,
    })),
  )
  const tagged = tagGroups(flat)

  return (
    <CrossBidderTableShell
      id={id}
      title="Additional items / Exclusions"
      hint="Lines the bidder marked Excluded / By client / By others instead of pricing — each needs PTC clarification before contract."
      icon={<PackagePlus className="size-[16px] text-[#142845]" />}
      rowCount={flat.length}
      emptyLabel="No exclusions"
    >
      <table className="w-full text-[12px] border-collapse">
        <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
          <tr className="bg-[rgba(226,237,247,0.5)]">
            <HeaderTh sticky width={200}>Tenderer</HeaderTh>
            <HeaderTh width={80}>Item ref</HeaderTh>
            <HeaderTh>BOQ item</HeaderTh>
            <HeaderTh width={64}>Unit</HeaderTh>
            <HeaderTh width={80} align="right">Qty</HeaderTh>
            <HeaderTh width={110}>Entry</HeaderTh>
            <HeaderTh width={140} align="right">Impact (AED)</HeaderTh>
            <HeaderTh width={150}>Instruction</HeaderTh>
          </tr>
        </thead>
        <tbody>
          {tagged.map((row) => (
            <tr key={`${row.bidderId}:${row.id}`}>
              <BodyTd sticky width={200} isGroupStart={row.isFirstInGroup}>
                <TenderCell
                  code={row.bidderCode}
                  name={row.bidderName}
                  firstOfGroup={row.isFirstInGroup}
                />
              </BodyTd>
              <BodyTd width={80} className="font-mono text-[#142845] text-[11px]" isGroupStart={row.isFirstInGroup}>
                {row.itemRef}
              </BodyTd>
              <BodyTd className="text-[#262626] text-[13px] leading-[18px]" isGroupStart={row.isFirstInGroup}>
                <span className="line-clamp-2">{row.boqItem}</span>
              </BodyTd>
              <BodyTd width={64} className="text-[#555] text-[12px]" isGroupStart={row.isFirstInGroup}>
                {row.unit}
              </BodyTd>
              <BodyTd width={80} align="right" className="text-[#555] text-[12px] tabular-nums" isGroupStart={row.isFirstInGroup}>
                {row.quantity}
              </BodyTd>
              <BodyTd width={110} isGroupStart={row.isFirstInGroup}>
                <EntryPill kind={row.tendererEntry} />
              </BodyTd>
              <BodyTd
                width={140}
                align="right"
                className={`text-[13px] tabular-nums font-medium ${
                  row.impactWarning ? "text-[#8b1c1c]" : "text-[#142845]"
                }`}
                isGroupStart={row.isFirstInGroup}
              >
                {row.impactAed}
              </BodyTd>
              <BodyTd width={150} className="text-[#555] text-[12px] italic" isGroupStart={row.isFirstInGroup}>
                {row.instruction ?? "—"}
              </BodyTd>
            </tr>
          ))}
        </tbody>
      </table>
    </CrossBidderTableShell>
  )
}

function EntryPill({ kind }: { kind: BoqUnpricedRow["tendererEntry"] }) {
  const styles: Record<
    BoqUnpricedRow["tendererEntry"],
    { bg: string; fg: string }
  > = {
    Included: { bg: "#e8f5e9", fg: "#1b5e20" },
    Excluded: { bg: "#fdecea", fg: "#8b1c1c" },
    "By others": { bg: "#fff4e0", fg: "#7a5d00" },
    "By client": { bg: "#e2edf7", fg: "#142845" },
  }
  const { bg, fg } = styles[kind]
  return (
    <span
      className="inline-flex items-center text-[11px] leading-[16px] px-[8px] py-[1px] rounded-[6px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {kind}
    </span>
  )
}
