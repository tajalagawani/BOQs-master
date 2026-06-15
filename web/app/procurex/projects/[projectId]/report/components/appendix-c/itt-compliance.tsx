"use client"

import { SuiteChip, CodeBadge, SubTitle, DataTable } from "@/components/suite"
import type { SuiteTone } from "@/components/suite"
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

const STATUS_STYLES: Record<ComplianceStatus, { tone: SuiteTone; label: string }> = {
  compliant: { tone: "good", label: "Compliant" },
  partial: { tone: "warn", label: "Partial" },
  non_compliant: { tone: "dang", label: "Non-compliant" },
  missing: { tone: "neut", label: "Missing" },
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
    <section id={id} className="scroll-mt-[24px] print:break-inside-avoid">
      <SubTitle count={`${rows.length} ${rows.length === 1 ? "tenderer" : "tenderers"}`}>
        ITT compliance matrix
      </SubTitle>
      <p className="mb-2 max-w-[78ch] text-[11.5px] leading-[1.6] text-suite-ink-3">
        FOT compliance status for every tenderer. Sources from the same
        verdicts the per-bidder review uses (
        <code className="px-[4px]">getProjectFotCompliance</code>).
      </p>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-suite-line-2 px-4 py-6 text-center text-[12px] text-suite-ink-4">
          No compliance data yet — run Step 4 analysis to populate.
        </div>
      ) : (
        <DataTable
          minWidth={760}
          className="max-h-[520px] overflow-auto print:max-h-none print:overflow-visible"
        >
          <thead>
            <tr>
              <th>Tenderer</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="c">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bidderId}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <CodeBadge>{row.code}</CodeBadge>
                    <span className="font-semibold text-suite-ink">{row.name}</span>
                  </div>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="c">
                    <StatusPill status={row.cells[c.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </section>
  )
}

function StatusPill({ status }: { status: ComplianceStatus }) {
  const s = STATUS_STYLES[status]
  return <SuiteChip tone={s.tone}>{s.label}</SuiteChip>
}
