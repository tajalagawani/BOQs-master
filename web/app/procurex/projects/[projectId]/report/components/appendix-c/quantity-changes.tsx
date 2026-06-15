"use client"

import {
  CodeInline,
  DataTable,
  Prose,
  Ref,
  SubTitle,
  SuiteChip,
} from "@/components/suite"

import type { BoqChangeRow } from "@/modules/procurex/report/boq-changes"

/**
 * Appendix C — Quantity changes.
 *
 * Project-wide log of `tender_item_event(kind='quantity_changed')`
 * rows. Shows old → new qty + delta + delta % so the QS can spot
 * material scope shifts. Source label (addendum / manual) explains
 * who drove the change.
 *
 * 10X-suite restyle: `.subt` sub-title + `.suite-tbl` DataTable. Numeric
 * columns are right-aligned (`td.r` + `suite-num`); deltas reuse the
 * shared `td.up` / `td.dn` variance tones; addenda sources render as
 * the blue `<CodeInline>`.
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
      className="scroll-mt-[24px] print:break-inside-avoid"
    >
      <SubTitle
        count={
          rows.length === 0
            ? undefined
            : `— ${rows.length} ${rows.length === 1 ? "change" : "changes"}`
        }
        right={
          rows.length === 0 ? (
            <SuiteChip tone="good">No changes</SuiteChip>
          ) : (
            <SuiteChip tone="warn">
              {rows.length} {rows.length === 1 ? "change" : "changes"}
            </SuiteChip>
          )
        }
      >
        Quantity changes
      </SubTitle>

      <Prose size={11.5} muted>
        BoQ item quantities revised by addenda or manual edits. Sourced from{" "}
        <CodeInline>tender_item_event(kind=&apos;quantity_changed&apos;)</CodeInline>.
      </Prose>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-suite-line-2 bg-suite-card-soft py-[28px] text-center text-[12px] text-suite-ink-4">
          No quantity changes recorded.
        </div>
      ) : (
        <DataTable minWidth={860}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Item ref</th>
              <th>Section</th>
              <th>Item</th>
              <th className="r">Old qty</th>
              <th className="r">New qty</th>
              <th className="r">Δ</th>
              <th className="r">Δ %</th>
              <th>Source</th>
              <th>Effective</th>
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
                <tr key={row.id}>
                  <td>
                    <Ref>{row.itemRef}</Ref>
                  </td>
                  <td className="text-suite-ink-2">{row.sectionLabel}</td>
                  <td className="max-w-[280px] text-suite-ink">
                    <span className="line-clamp-2 leading-[1.5]">
                      {row.itemLabel}
                    </span>
                  </td>
                  <td className="r suite-num text-suite-ink-2">
                    {formatQty(o)}
                  </td>
                  <td className="r suite-num font-medium text-suite-ink">
                    {formatQty(n)}
                  </td>
                  <td className={`r suite-num font-semibold ${toneClass(direction)}`}>
                    {delta === null
                      ? "—"
                      : `${delta > 0 ? "+" : ""}${formatQty(delta)}`}
                  </td>
                  <td className={`r suite-num ${toneClass(direction)}`}>
                    {deltaPct === null
                      ? "—"
                      : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
                  </td>
                  <td>
                    {row.sourceLabel ? (
                      <CodeInline>{row.sourceLabel}</CodeInline>
                    ) : (
                      <span className="text-suite-ink-4">—</span>
                    )}
                  </td>
                  <td className="suite-num text-[11px] text-suite-ink-3">
                    {formatDate(row.effectiveAt)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
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

/** Up (qty increased) = worse/red, down = better/green — matches the
 *  shared `td.up` / `td.dn` variance tones. */
function toneClass(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "text-suite-dang"
  if (direction === "down") return "text-suite-good"
  return "text-suite-ink-4"
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
