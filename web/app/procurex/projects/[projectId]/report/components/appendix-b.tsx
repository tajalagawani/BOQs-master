"use client"

import { ChevronUp } from "lucide-react"

import { CodeInline, DataTable, SectionTitle } from "@/components/suite"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

/**
 * APPENDIX B — Post Tender Clarification Schedules.
 *
 * Figma 1295:91686. Restyled to the 10X suite (P0): the section header
 * renders through `SectionTitle no="App B"` and the clarification
 * schedule is a suite `DataTable` (Bidder · Round · Question · Response
 * · Status) with a status `Chip` per row.
 *
 * The per-tenderer PTC rows depend on the `ptc_round` + `ptc_question`
 * schema (Phase 3) — same gap as Step 5's `ptcIssued = null` sentinel —
 * so there are no real clarifications to bind yet. The table renders its
 * column scaffold with an honest empty state rather than fabricating the
 * design study's sample rows.
 */
export function AppendixBSection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  void data
  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="suite bg-white flex flex-col gap-[16px] rounded-[16px] p-[24px] w-full">
        <SectionTitle
          no="App B"
          title="Post Tender Clarification Schedules"
          right={
            <button
              type="button"
              aria-label="Collapse"
              className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-[rgba(226,237,247,0.5)]"
            >
              <ChevronUp className="size-[16px] text-suite-ink" />
            </button>
          }
        />

        <DataTable>
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Bidder</th>
              <th style={{ width: "8%" }}>Round</th>
              <th>Question</th>
              <th>Response</th>
              <th className="c" style={{ width: "14%" }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5}>
                <div className="flex flex-col gap-[8px] py-[12px]">
                  <span className="text-suite-ink-4 text-[12px] uppercase tracking-wider font-semibold">
                    Not implemented
                  </span>
                  <p className="text-suite-ink-2 text-[13px] leading-[20px] font-light">
                    Will list per-tenderer PTC questions + responses for each
                    round once <CodeInline>ptc_round</CodeInline> +{" "}
                    <CodeInline>ptc_question</CodeInline> tables land (Phase 3).
                    Same gap as Step 5&apos;s{" "}
                    <CodeInline>ptcIssued = null</CodeInline> sentinel.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </DataTable>
      </div>
    </section>
  )
}
