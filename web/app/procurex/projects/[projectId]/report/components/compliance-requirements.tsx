"use client"

import { ChevronUp, Info } from "lucide-react"

import { DataTable, SuiteChip } from "@/components/suite"
import type { SuiteTone } from "@/components/suite"
import type { ComplianceStatus } from "@/modules/procurex/review/overview-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

/**
 * 04. Compliance Requirements — Figma 1295:87063, restyled to the 10X suite.
 *
 * Sub-block: "Compliance Summary" — a side-by-side comparison of
 * tenderer FOT submissions across 5 mandatory criteria.
 *
 * Columns: Tenderer | FOT Submission | Time for Completion |
 *          OHP % | Tender Validity | Signatures
 *
 * Compliance statuses come from `getProjectComplianceRows` which we
 * already source from the same FOT comparator the per-bidder review
 * page uses.
 */

/** Map a compliance verdict to the suite chip tone + its display label. */
const STATUS_CHIP: Record<ComplianceStatus, { tone: SuiteTone; label: string }> = {
  compliant: { tone: "good", label: "Compliant" },
  partial: { tone: "warn", label: "Partial" },
  non_compliant: { tone: "dang", label: "Non-compliant" },
  missing: { tone: "neut", label: "Missing" },
}

const CRITERIA = [
  { key: "fotSubmission", label: "FOT Submission" },
  { key: "timeForCompletion", label: "Time for Completion" },
  { key: "ohpMarkup", label: "OHP %" },
  { key: "tenderValidity", label: "Tender Validity" },
  { key: "signatures", label: "Signatures" },
] as const

export function ComplianceRequirementsSection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { compliance } = data

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="suite flex w-full flex-col gap-8 rounded-[16px] bg-suite-panel p-6">
        {/* Header — numbered section title with blue underline */}
        <div className="flex flex-col gap-2">
          <div className="mb-3.5 flex flex-wrap items-baseline gap-3 border-b-2 border-suite-blue pb-2">
            <span className="suite-num text-[14px] font-semibold text-suite-blue">04</span>
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-suite-ink">
              Compliance Requirements
            </h2>
            <button
              type="button"
              aria-label="Collapse"
              className="ml-auto grid size-8 place-items-center rounded-lg hover:bg-suite-card-soft"
            >
              <ChevronUp className="size-4 text-suite-ink-2" />
            </button>
          </div>
          <p className="text-[13px] leading-[1.65] text-suite-ink-2">
            Five mandatory criteria that determine compliance status. All 5
            compliance criterias must be met in order to be considered fully
            compliant.
          </p>
        </div>

        {/* Sub-block: Compliance Summary — award gate matrix */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-suite-ink-3">
              Compliance Summary
              <Info className="size-4 text-suite-ink-3" />
            </div>
            <p className="text-[11.5px] text-suite-ink-3">
              A side-by-side comparison of all tenderer FOT submissions.
            </p>
          </div>

          <DataTable
            minWidth={760}
            className="max-h-[520px] overflow-auto print:max-h-none print:overflow-visible"
          >
            <thead>
              <tr>
                <th>Tenderer</th>
                {CRITERIA.map((c) => (
                  <th key={c.key} className="c">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compliance.length === 0 ? (
                <tr>
                  <td
                    colSpan={CRITERIA.length + 1}
                    className="c text-suite-ink-4"
                  >
                    No compliance data yet — run Step 4 analysis to populate.
                  </td>
                </tr>
              ) : (
                compliance.map((row) => (
                  <tr key={row.bidderId}>
                    <td>
                      <span className="text-[12.5px] text-suite-ink">
                        {row.name}
                      </span>
                    </td>
                    {CRITERIA.map((c) => {
                      const chip = STATUS_CHIP[row.cells[c.key]]
                      return (
                        <td key={c.key} className="c">
                          <SuiteChip tone={chip.tone}>{chip.label}</SuiteChip>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </div>
      </div>
    </section>
  )
}
