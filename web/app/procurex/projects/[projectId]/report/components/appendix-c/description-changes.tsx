"use client"

import { ChevronsUpDown, FileEdit } from "lucide-react"

import type { BoqChangeRow } from "@/modules/procurex/report/boq-changes"

/**
 * Appendix C — BOQ description changes.
 *
 * Project-wide log of `tender_item_event(kind='description_changed')`
 * rows. Each event = an addendum or manual edit that changed a BoQ
 * line item's description after first issue. Not per-bidder — every
 * bidder is pricing against the same evolving BoQ, so this table
 * lives once at the report level.
 */
export function DescriptionChangesBlock({
  id,
  rows,
}: {
  id: string
  rows: BoqChangeRow[]
}) {
  return (
    <section
      id={id}
      className="flex flex-col gap-[20px] scroll-mt-[24px] print:break-inside-avoid"
    >
      <div className="flex flex-col gap-[6px]">
        <div className="flex gap-[12px] items-center w-full">
          <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[10px] size-[40px] shrink-0">
            <FileEdit className="size-[16px] text-[#142845]" />
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px] flex-1 min-w-0">
            BOQ description changes
          </h3>
          <CountChip count={rows.length} />
        </div>
        <p className="text-[#555] text-[12px] leading-[16px] font-light pl-[52px]">
          Item description edits recorded as
          <code className="px-[4px]">tender_item_event(kind=&apos;description_changed&apos;)</code>
          — usually from addenda issued after first BoQ release.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[#e2edf7] bg-[rgba(226,237,247,0.15)] rounded-[12px] py-[28px] text-center">
          <p className="text-[#888] text-[12px] leading-[16px]">
            No description changes recorded.
          </p>
        </div>
      ) : (
        <div className="border border-[#e2edf7] rounded-[12px] overflow-auto bg-white max-h-[520px] print:max-h-none print:overflow-visible">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
              <tr className="bg-[rgba(226,237,247,0.5)]">
                <Th>Item ref</Th>
                <Th>Section</Th>
                <Th>Original description</Th>
                <Th>Revised description</Th>
                <Th>Source</Th>
                <Th>Effective</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#f0f5fa]">
                  <Td className="font-mono text-[#142845] text-[11px]">
                    {row.itemRef}
                  </Td>
                  <Td className="text-[#555] text-[12px]">
                    {row.sectionLabel}
                  </Td>
                  <Td className="text-[#8b1c1c] text-[12px] leading-[18px] max-w-[280px]">
                    <span className="line-clamp-3">
                      {row.oldValue ?? "—"}
                    </span>
                  </Td>
                  <Td className="text-[#1b5e20] text-[12px] leading-[18px] max-w-[280px]">
                    <span className="line-clamp-3">
                      {row.newValue ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center text-[11px] bg-[#e2edf7] text-[#142845] px-[8px] py-[2px] rounded-[8px]">
                      {row.sourceLabel ?? "—"}
                    </span>
                  </Td>
                  <Td className="text-[#555] text-[11px] tabular-nums">
                    {formatDate(row.effectiveAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function CountChip({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-[4px] bg-[#e8f5e9] text-[#1b5e20] text-[11px] leading-[16px] px-[10px] py-[3px] rounded-[12px] font-medium shrink-0">
        <span className="size-[6px] rounded-full bg-[#1b5e20]" />
        No changes
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[6px] bg-[#fff4e0] text-[#7a5d00] text-[11px] leading-[16px] px-[10px] py-[3px] rounded-[12px] font-medium shrink-0">
      <span className="size-[6px] rounded-full bg-[#7a5d00]" />
      {count} {count === 1 ? "change" : "changes"}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-[10px] px-[12px] text-[#434343] text-[11px] leading-[16px] font-semibold uppercase tracking-wider text-left">
      <span className="inline-flex items-center gap-[4px]">
        {children}
        <ChevronsUpDown className="size-[10px] text-[#9aa1ac]" />
      </span>
    </th>
  )
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`py-[10px] px-[12px] align-top ${className}`}>{children}</td>
  )
}
