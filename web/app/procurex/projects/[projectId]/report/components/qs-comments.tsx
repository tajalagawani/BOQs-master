"use client"

import { SectionTitle, QsCommentRow, Prose } from "@/components/suite"

import type { TenderReportData } from "@/modules/procurex/report/report-data"

/**
 * 05. QS Comments — Figma 1300:66562, restyled to the 10X suite.
 *
 * One row per tenderer (`QsCommentRow`), pixel-faithful to the Step-6
 * reference (`.sectitle` + per-bidder `.qsrow`: code chip + name + prose).
 * QS comments are not yet persisted — the prose body renders the design's
 * placeholder copy (kept italic to signal it is a placeholder) and is
 * read-only until the comment-saving server action lands.
 */
export function QsCommentsSection({
  id,
  data,
}: {
  id: string
  data: TenderReportData
}) {
  const { bidders } = data

  return (
    <section id={id} className="suite print:break-before-page scroll-mt-[24px]">
      <div className="suite-shadow rounded-[16px] bg-suite-panel p-6">
        <SectionTitle no="05" title="QS Comments" />
        <Prose size={12} muted>
          Per-tenderer QS commentary for each appendix.
        </Prose>

        {bidders.length === 0 ? (
          <div className="border-t border-suite-line-soft py-6 text-center text-[12px] text-suite-ink-4">
            No tenderers on this project yet.
          </div>
        ) : (
          bidders.map((b) => (
            <QsCommentRow key={b.id} code={b.code} name={b.name}>
              <em className="text-suite-ink-4">
                Add any context for the employer (e.g. pricing strategy, known
                exclusions, key risks)
              </em>
            </QsCommentRow>
          ))
        )}
      </div>
    </section>
  )
}
