"use client"

import { CheckCircle, ChevronsUpDown } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"
import type { ComplianceStatus } from "@/modules/procurex/review/overview-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

/**
 * Appendix C — ITT Compliance.
 *
 * Matrix: one row per tenderer × five FOT compliance columns.
 * Data source: `data.compliance` (= `getProjectComplianceRows`) — the
 * same FOT comparator the per-bidder review page uses.
 *
 * Once the rest of Sections B–J have their verdicts persisted on
 * `BidderReviewData`, we extend this matrix with extra columns. The
 * code path already passes `appendixC` through so we can reach into
 * `byBidder[id]` for that the moment it lands.
 */

const STATUS_STYLES: Record<
  ComplianceStatus,
  { bg: string; fg: string; dot: string; label: string }
> = {
  compliant: {
    bg: "#e8f5e9",
    fg: "#1b5e20",
    dot: "#1b5e20",
    label: "Compliant",
  },
  partial: {
    bg: "#fff8e1",
    fg: "#7a5d00",
    dot: "#7a5d00",
    label: "Partial",
  },
  non_compliant: {
    bg: "#fdecea",
    fg: "#8b1c1c",
    dot: "#8b1c1c",
    label: "Non-compliant",
  },
  missing: {
    bg: "#f5f5f5",
    fg: "#666",
    dot: "#666",
    label: "Missing",
  },
}

const COLUMNS = [
  { key: "fotSubmission", label: "FOT Submission" },
  { key: "timeForCompletion", label: "Time for Completion" },
  { key: "ohpMarkup", label: "OH&P" },
  { key: "tenderValidity", label: "Tender Validity" },
  { key: "signatures", label: "Signatures" },
] as const

export function IttComplianceBlock({
  id,
  data,
  appendixC,
}: {
  id: string
  data: TenderReportData
  appendixC: AppendixCData | null
}) {
  void appendixC
  const rows = data.compliance

  return (
    <section
      id={id}
      className="flex flex-col gap-[20px] scroll-mt-[24px] print:break-inside-avoid"
    >
      <div className="flex flex-col gap-[6px]">
        <div className="flex gap-[12px] items-center w-full">
          <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[10px] size-[40px] shrink-0">
            <CheckCircle className="size-[16px] text-[#142845]" />
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px] flex-1 min-w-0">
            ITT Compliance
          </h3>
        </div>
        <p className="text-[#555] text-[12px] leading-[16px] font-light pl-[52px]">
          FOT compliance status for every tenderer. Sources from the same
          verdicts the per-bidder review uses (
          <code className="px-[4px]">getProjectFotCompliance</code>).
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[#e2edf7] rounded-[12px] py-[24px] text-center text-[12px] text-[#888]">
          No compliance data yet — run Step 4 analysis to populate.
        </div>
      ) : (
        <div className="border border-[#e2edf7] rounded-[12px] overflow-auto bg-white max-h-[520px] print:max-h-none print:overflow-visible">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
              <tr className="bg-[rgba(226,237,247,0.5)]">
                <Th sticky>Tenderer</Th>
                {COLUMNS.map((c) => (
                  <Th key={c.key}>{c.label}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bidderId} className="border-t border-[#f0f5fa]">
                  <Td sticky>
                    <div className="flex items-center gap-[8px]">
                      <span className="font-mono text-[10px] text-[#888]">
                        {row.code}
                      </span>
                      <span className="text-[#142845] text-[13px] font-medium truncate">
                        {row.name}
                      </span>
                    </div>
                  </Td>
                  {COLUMNS.map((c) => (
                    <Td key={c.key}>
                      <StatusPill status={row.cells[c.key]} />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function StatusPill({ status }: { status: ComplianceStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className="inline-flex items-center gap-[6px] px-[8px] py-[2px] rounded-[8px] text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="size-[6px] rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

function Th({
  children,
  sticky = false,
}: {
  children: React.ReactNode
  sticky?: boolean
}) {
  return (
    <th
      className={`py-[10px] px-[12px] text-[#434343] text-[11px] leading-[16px] font-semibold uppercase tracking-wider text-left ${
        sticky ? "sticky left-0 bg-[rgba(226,237,247,0.5)] z-10" : ""
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
  sticky = false,
  className = "",
}: {
  children: React.ReactNode
  sticky?: boolean
  className?: string
}) {
  return (
    <td
      className={`py-[10px] px-[12px] text-left ${
        sticky ? "sticky left-0 bg-white z-10" : ""
      } ${className}`}
    >
      {children}
    </td>
  )
}
