"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Download, Printer } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"
import type {
  ReportRound,
  TenderReportData,
} from "@/modules/procurex/report/report-data"
import {
  CodeBadge,
  HeroGhostBtn,
  InternalBadge,
  ProcurexReportShell,
  ProcurexWizardShell,
  RecBox,
  SegControl,
  SelPill,
} from "@/components/suite"

import { ExecutiveSummarySection } from "./components/executive-summary"
import { TenderComparisonSection } from "./components/tender-comparison"
import { DetailedTenderAnalysisSection } from "./components/detailed-tender-analysis"
import { ComplianceRequirementsSection } from "./components/compliance-requirements"
import { QsCommentsSection } from "./components/qs-comments"
import { AppendixASection } from "./components/appendix-a"
import { AppendixBSection } from "./components/appendix-b"
import { AppendixCSection } from "./components/appendix-c"
import { formatAed } from "./components/section-shell"

/**
 * Tender Evaluation Report — client shell, restyled to the 10X suite library.
 *
 * The page is framed by `ProcurexWizardShell` (navy topnav + hero + the 6-step
 * rail with Step 6 active) and bodied by `ProcurexReportShell` (the floating
 * white panel carrying the meta band, AI-provenance note and section nav). The
 * round/type/export controls live in the hero; the section components keep their
 * original ordering, props and data bindings. Each section is an `id`-anchored
 * block so the section-nav `<a href="#...">` jumps work.
 *
 * Print-friendly: `@media print` hides the hero chrome and forces a page break
 * before each top-level section. The "Print / Export PDF" hero button calls
 * `window.print()` for now; server-side PDF generation comes in a later phase.
 */

const NAV_ITEMS = [
  { id: "exec-summary", label: "01. Executive Summary" },
  { id: "tender-comparison", label: "02. Tender Comparison" },
  { id: "detailed-analysis", label: "03. Detailed Tender Analysis" },
  { id: "compliance", label: "04. Compliance Requirements" },
  { id: "qs-comments", label: "05. QS Comments" },
] as const

const APPENDIX_ITEMS = [
  { id: "appendix-a", label: "APPENDIX A — Summary Comparison" },
  { id: "appendix-b", label: "APPENDIX B — PTC Schedules" },
  { id: "appendix-c", label: "APPENDIX C — Detailed Analysis" },
] as const

const ROUND_LABELS: Record<ReportRound, string> = {
  initial: "Initial",
  ptc1: "PTC 1",
  ptc2: "PTC 2",
  ptc3: "PTC 3",
}

const ROUND_ORDER: ReportRound[] = ["initial", "ptc1", "ptc2", "ptc3"]

export function ReportClient({
  data,
  appendixC,
}: {
  data: TenderReportData
  appendixC: AppendixCData | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { project, options, rankings, lowestBidderId } = data

  const setParam = (key: string, value: string) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "")
    sp.set(key, value)
    router.replace(`/procurex/projects/${project.id}/report?${sp.toString()}`)
  }

  // Award recommendation — the lowest-sum (rank 1) tenderer, bound to the
  // real ranking data. Null when nobody has submitted yet.
  const lowest = rankings.find((r) => r.bidderId === lowestBidderId)
  const lowestSum = formatAed(
    lowest?.adjustedSumCents ?? lowest?.tenderSumCents ?? null,
  )

  // Section nav — preserves the exact `#id` anchors + labels (appendices only
  // when included).
  const navLinks = [
    ...NAV_ITEMS.map((it) => ({ label: it.label, href: `#${it.id}` })),
    ...(options.appendices
      ? APPENDIX_ITEMS.map((it) => ({ label: it.label, href: `#${it.id}` }))
      : []),
  ]

  // Meta band — derived from the real report options.
  const meta = [
    {
      k: "Report type",
      v: options.type === "executive" ? "Executive Summary" : "Full Report",
    },
    { k: "Round", v: ROUND_LABELS[options.round] },
    {
      k: "Appendices",
      v: options.appendices ? "Included" : "Excluded",
    },
  ]

  return (
    <ProcurexWizardShell
      project={{ name: project.name, meta: project.currency ?? undefined }}
      step={5}
      title="Tender Report & PTC"
      subtitle={
        options.type === "executive"
          ? "Executive summary view — ranking, compliance and the award recommendation."
          : "The complete adjudication — ranking, compliance, per-bidder analysis and the award recommendation."
      }
      onStep={(index) =>
        router.push(`/procurex/projects/${project.id}/setup?step=${index + 1}`)
      }
      heroControls={
        <div className="flex flex-wrap items-center gap-2.5 @lg:justify-end">
          <HeroGhostBtn
            onClick={() =>
              router.push(`/procurex/projects/${project.id}/setup?step=6`)
            }
          >
            <ArrowLeft className="size-[14px]" />
            Back to Reports
          </HeroGhostBtn>
          <SegControl
            options={[
              { id: "full", label: "Full report" },
              { id: "executive", label: "Executive" },
            ]}
            value={options.type}
            onChange={(id) => setParam("type", id)}
          />
          <SelPill
            onClick={() => {
              const i = ROUND_ORDER.indexOf(options.round)
              const next = ROUND_ORDER[(i + 1) % ROUND_ORDER.length]
              setParam("round", next)
            }}
          >
            Round: {ROUND_LABELS[options.round]} ▾
          </SelPill>
          <HeroGhostBtn
            onClick={() => setParam("appendices", options.appendices ? "0" : "1")}
          >
            {options.appendices ? "✓ Appendices" : "Include appendices"}
          </HeroGhostBtn>
          <HeroGhostBtn onClick={() => window.print()}>
            <Printer className="size-[14px]" />
            Print / Export PDF
          </HeroGhostBtn>
          <HeroGhostBtn go>
            <Download className="size-[14px]" />
            Export to Excel
          </HeroGhostBtn>
        </div>
      }
    >
      <ProcurexReportShell
        meta={meta}
        aiNote={
          <>
            Narrative sections were{" "}
            <b className="text-suite-ink">
              drafted by the evaluation model from the computed analysis only
            </b>{" "}
            — every figure is quoted from the deterministic engine, never
            recalculated. Reviewed and approved by the QS before issue.{" "}
            <b className="text-suite-ink">
              The PTE drives this internal report and is never disclosed to
              bidders.
            </b>
          </>
        }
        nav={navLinks}
      >
        {/* Award recommendation */}
        {lowest && (
          <RecBox
            title={
              <>
                ✓ Recommended for award —{" "}
                <CodeBadge>{lowest.code}</CodeBadge> {lowest.name} ·{" "}
                <span className="suite-num font-semibold">{lowestSum}</span>
              </>
            }
            body={
              <>
                Lowest award-eligible adjusted tender, ranked first on the
                QS-adjusted sum. Subject to compliance, arithmetical and
                clarification review in the sections below.
              </>
            }
            sign={
              <>
                <InternalBadge label="QS recommendation" /> Subject to Employer
                approval
              </>
            }
          />
        )}

        <ExecutiveSummarySection id="exec-summary" data={data} />
        <TenderComparisonSection id="tender-comparison" data={data} />
        <DetailedTenderAnalysisSection id="detailed-analysis" data={data} />
        <ComplianceRequirementsSection id="compliance" data={data} />
        <QsCommentsSection id="qs-comments" data={data} />

        {options.appendices && (
          <>
            <AppendixASection id="appendix-a" data={data} />
            <AppendixBSection id="appendix-b" data={data} />
            <AppendixCSection id="appendix-c" data={data} appendixC={appendixC} />
          </>
        )}
      </ProcurexReportShell>
    </ProcurexWizardShell>
  )
}
