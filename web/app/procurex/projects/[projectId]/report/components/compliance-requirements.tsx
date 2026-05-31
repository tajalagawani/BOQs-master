"use client"

import { ChevronUp, ChevronsUpDown, Info } from "lucide-react"

import type { ComplianceStatus } from "@/modules/procurex/review/overview-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

/**
 * 04. Compliance Requirements — Figma 1295:87063.
 *
 * Sub-block: "Compliance Summary" — a side-by-side comparison of
 * tenderer FOT submissions across 5 mandatory criteria.
 *
 * Columns: Tenderer | FOT Submission | Time for Completion |
 *          OHP % | Tender Validity | Deviations
 *
 * Compliance statuses come from `getProjectComplianceRows` which we
 * already source from the same FOT comparator the per-bidder review
 * page uses.
 */

const STATUS_STYLES: Record<
  ComplianceStatus,
  { bg: string; fg: string; label: string }
> = {
  compliant: { bg: "#e8f5e9", fg: "#1b5e20", label: "Compliant" },
  partial: { bg: "#fff8e1", fg: "#7a5d00", label: "Partial" },
  non_compliant: { bg: "#fdecea", fg: "#8b1c1c", label: "Non-compliant" },
  missing: { bg: "#f5f5f5", fg: "#666666", label: "Missing" },
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
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <div className="flex flex-col gap-[8px] w-full">
          <div className="flex gap-[32px] h-[32px] items-center w-full">
            <div className="flex flex-1 gap-[8px] items-center min-w-px">
              <span className="bg-[#142845] flex h-[24px] items-center justify-center px-[16px] rounded-[30px] w-[40px] text-white text-[12px] leading-[16px] font-medium">
                04
              </span>
              <h2 className="text-[#142845] text-[18px] leading-[24px] font-semibold">
                Compliance Requirements
              </h2>
            </div>
            <button
              type="button"
              aria-label="Collapse"
              className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-[rgba(226,237,247,0.5)]"
            >
              <ChevronUp className="size-[16px] text-[#142845]" />
            </button>
          </div>
          <p className="text-[#142845] text-[12px] leading-[16px] font-light">
            Five mandatory criteria that determine compliance status. All 5
            compliance criterias must be met in order to be considered fully
            compliant.
          </p>
        </div>

        {/* Sub-block: Compliance Summary */}
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <h3 className="text-[#142845] text-[16px] leading-[24px] font-semibold">
                Compliance Summary
              </h3>
              <Info className="size-[16px] text-[#142845]" />
            </div>
            <p className="text-[#555] text-[12px] leading-[16px] font-light">
              A side-by-side comparison of all tenderer FOT submissions.
            </p>
          </div>

          <div className="border border-[#e2edf7] rounded-[12px] overflow-auto max-h-[520px] print:max-h-none print:overflow-visible">
            <table className="w-full text-[12px] border-collapse">
              <thead className="sticky top-0 z-10 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
                <tr className="bg-[rgba(226,237,247,0.5)]">
                  <Th>Tenderer</Th>
                  {CRITERIA.map((c) => (
                    <Th key={c.key}>{c.label}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compliance.length === 0 ? (
                  <tr>
                    <td
                      colSpan={CRITERIA.length + 1}
                      className="py-[24px] text-center text-[#888]"
                    >
                      No compliance data yet — run Step 4 analysis to populate.
                    </td>
                  </tr>
                ) : (
                  compliance.map((row) => (
                    <tr
                      key={row.bidderId}
                      className="border-t border-[#f0f0f0]"
                    >
                      <Td>
                        <span className="text-black text-[12px] leading-[16px]">
                          {row.name}
                        </span>
                      </Td>
                      {CRITERIA.map((c) => (
                        <Td key={c.key}>
                          <StatusPill status={row.cells[c.key]} />
                        </Td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatusPill({ status }: { status: ComplianceStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className="inline-flex items-center px-[8px] py-[2px] rounded-[8px] text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-[10px] px-[12px] text-[#434343] text-[11px] leading-[16px] font-semibold uppercase tracking-wider text-left">
      <span className="inline-flex items-center gap-[4px]">
        {children}
        <ChevronsUpDown className="size-[12px] text-[#9aa1ac]" />
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
    <td className={`py-[12px] px-[12px] text-left ${className}`}>
      {children}
    </td>
  )
}
