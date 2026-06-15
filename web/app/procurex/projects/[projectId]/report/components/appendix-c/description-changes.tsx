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
 * Appendix C — BOQ description changes.
 *
 * Project-wide log of `tender_item_event(kind='description_changed')`
 * rows. Each event = an addendum or manual edit that changed a BoQ
 * line item's description after first issue. Not per-bidder — every
 * bidder is pricing against the same evolving BoQ, so this table
 * lives once at the report level.
 *
 * 10X-suite restyle: `.subt` sub-title + `.suite-tbl` DataTable. Mono
 * item refs use `<Ref>`; addenda sources use the blue `<CodeInline>`.
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
      className="scroll-mt-[24px] print:break-inside-avoid"
    >
      <SubTitle
        count={
          rows.length === 0
            ? "— addenda replayed"
            : `— ${rows.length} ${rows.length === 1 ? "change" : "changes"} · addenda replayed`
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
        BOQ description changes
      </SubTitle>

      <Prose size={11.5} muted>
        Item description edits recorded as{" "}
        <CodeInline>tender_item_event(kind=&apos;description_changed&apos;)</CodeInline>{" "}
        — usually from addenda issued after first BoQ release.
      </Prose>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-suite-line-2 bg-suite-card-soft py-[28px] text-center text-[12px] text-suite-ink-4">
          No description changes recorded.
        </div>
      ) : (
        <DataTable minWidth={720}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Item ref</th>
              <th>Section</th>
              <th>Original description</th>
              <th>Revised description</th>
              <th>Source</th>
              <th>Effective</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Ref>{row.itemRef}</Ref>
                </td>
                <td className="text-suite-ink-2">{row.sectionLabel}</td>
                <td className="max-w-[280px] text-suite-dang">
                  <span className="line-clamp-3 leading-[1.5]">
                    {row.oldValue ?? "—"}
                  </span>
                </td>
                <td className="max-w-[280px] text-suite-good">
                  <span className="line-clamp-3 leading-[1.5]">
                    {row.newValue ?? "—"}
                  </span>
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
            ))}
          </tbody>
        </DataTable>
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
