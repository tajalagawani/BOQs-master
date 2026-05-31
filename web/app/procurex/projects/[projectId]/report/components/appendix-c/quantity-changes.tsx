"use client"

import { ChevronsUpDown, Hash } from "lucide-react"

import type { BoqChangeRow } from "@/modules/procurex/report/boq-changes"

/**
 * Appendix C — Quantity changes.
 *
 * Project-wide log of `tender_item_event(kind='quantity_changed')`
 * rows. Shows old → new qty + delta + delta % so the QS can spot
 * material scope shifts. Source label (addendum / manual) explains
 * who drove the change.
 */
export function QuantityChangesBlock({
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
            <Hash className="size-[16px] text-[#142845]" />
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px] flex-1 min-w-0">
            Quantity changes
          </h3>
          <CountChip count={rows.length} />
        </div>
        <p className="text-[#555] text-[12px] leading-[16px] font-light pl-[52px]">
          BoQ item quantities revised by addenda or manual edits. Sourced
          from <code className="px-[4px]">tender_item_event(kind=&apos;quantity_changed&apos;)</code>.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[#e2edf7] bg-[rgba(226,237,247,0.15)] rounded-[12px] py-[28px] text-center">
          <p className="text-[#888] text-[12px] leading-[16px]">
            No quantity changes recorded.
          </p>
        </div>
      ) : (
        <div className="border border-[#e2edf7] rounded-[12px] overflow-auto bg-white max-h-[520px] print:max-h-none print:overflow-visible">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
              <tr className="bg-[rgba(226,237,247,0.5)]">
                <Th>Item ref</Th>
                <Th>Section</Th>
                <Th>Item</Th>
                <Th align="right">Old qty</Th>
                <Th align="right">New qty</Th>
                <Th align="right">Δ</Th>
                <Th align="right">Δ %</Th>
                <Th>Source</Th>
                <Th>Effective</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const o = parseQty(row.oldValue)
                const n = parseQty(row.newValue)
                const delta = o !== null && n !== null ? n - o : null
                const deltaPct =
                  delta !== null && o !== null && o !== 0
                    ? (delta / o) * 100
                    : null
                const direction =
                  delta === null ? "neutral" : delta > 0 ? "up" : "down"
                return (
                  <tr key={row.id} className="border-t border-[#f0f5fa]">
                    <Td className="font-mono text-[#142845] text-[11px]">
                      {row.itemRef}
                    </Td>
                    <Td className="text-[#555] text-[12px]">
                      {row.sectionLabel}
                    </Td>
                    <Td className="text-[#262626] text-[12px] leading-[18px] max-w-[280px]">
                      <span className="line-clamp-2">{row.itemLabel}</span>
                    </Td>
                    <Td align="right" className="text-[#555] text-[12px] tabular-nums">
                      {formatQty(o)}
                    </Td>
                    <Td align="right" className="text-[#142845] text-[12px] tabular-nums font-medium">
                      {formatQty(n)}
                    </Td>
                    <Td
                      align="right"
                      className={`text-[12px] tabular-nums font-semibold ${toneClass(direction)}`}
                    >
                      {delta === null
                        ? "—"
                        : `${delta > 0 ? "+" : ""}${formatQty(delta)}`}
                    </Td>
                    <Td
                      align="right"
                      className={`text-[12px] tabular-nums ${toneClass(direction)}`}
                    >
                      {deltaPct === null
                        ? "—"
                        : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function parseQty(v: string | null): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function formatQty(n: number | null) {
  if (n === null) return "—"
  return n.toLocaleString("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function toneClass(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "text-[#8b1c1c]"
  if (direction === "down") return "text-[#1b5e20]"
  return "text-[#888]"
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
        <ChevronsUpDown className="size-[10px] text-[#9aa1ac]" />
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
      className={`py-[10px] px-[12px] align-top ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  )
}
