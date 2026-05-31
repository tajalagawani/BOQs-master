"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Download, FileText, Printer } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"
import type {
  ReportRound,
  TenderReportData,
} from "@/modules/procurex/report/report-data"

import { ExecutiveSummarySection } from "./components/executive-summary"
import { TenderComparisonSection } from "./components/tender-comparison"
import { DetailedTenderAnalysisSection } from "./components/detailed-tender-analysis"
import { ComplianceRequirementsSection } from "./components/compliance-requirements"
import { QsCommentsSection } from "./components/qs-comments"
import { AppendixASection } from "./components/appendix-a"
import { AppendixBSection } from "./components/appendix-b"
import { AppendixCSection } from "./components/appendix-c"

/**
 * Tender Evaluation Report — client shell.
 *
 * Layout matches Figma 1295:86592: left rail nav, main column with
 * numbered sections (01–04) and appendices (A/B/C). Each section is
 * an `id`-anchored block so the sidebar `<a href="#...">` jumps work.
 *
 * Print-friendly: `@media print` hides the sidebar + controls and
 * forces a page break before each top-level section. Toolbar's
 * "Print / Export PDF" button calls `window.print()` for now;
 * server-side PDF generation comes in a later phase.
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

export function ReportClient({
  data,
  appendixC,
}: {
  data: TenderReportData
  appendixC: AppendixCData | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { project, options } = data

  const setParam = (key: string, value: string) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "")
    sp.set(key, value)
    router.replace(`/procurex/projects/${project.id}/report?${sp.toString()}`)
  }

  return (
    <div className="bg-[#f8f8f8] min-h-screen pb-[96px] print:bg-white print:pb-0">
      <div className="max-w-[1400px] mx-auto px-[16px] pt-[24px] flex items-start gap-[24px]">
        {/* ─── Sidebar (hidden in print) ──────────────────────────── */}
        <aside className="w-[260px] shrink-0 flex flex-col gap-[24px] sticky top-[24px] print:hidden">
          <button
            type="button"
            onClick={() =>
              router.push(`/procurex/projects/${project.id}/setup?step=6`)
            }
            className="flex items-center gap-[6px] text-[#142845] text-[12px] leading-[16px] w-fit hover:underline"
          >
            <ArrowLeft className="size-[14px]" />
            Back to Reports
          </button>

          <div className="flex flex-col gap-[8px]">
            <h2
              className="font-medium text-[#142845] text-[24px] leading-[32px]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Tender Report
            </h2>
            <p className="font-light text-[#142845] text-[12px] leading-[16px]">
              {options.type === "executive"
                ? "Executive summary view."
                : "Full report with all sections."}
            </p>
          </div>

          {/* Round selector */}
          <div className="flex flex-col gap-[6px]">
            <span className="font-semibold text-[#434343] text-[10px] leading-[14px] tracking-wider uppercase">
              Round
            </span>
            <div className="bg-white border border-[#e2edf7] flex p-[4px] rounded-[8px]">
              {(Object.keys(ROUND_LABELS) as ReportRound[]).map((r) => {
                const active = r === options.round
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setParam("round", r)}
                    className={`flex-1 h-[24px] rounded-[4px] text-[11px] ${
                      active
                        ? "bg-[#142845] font-medium text-white"
                        : "font-normal text-[#142845]"
                    }`}
                  >
                    {ROUND_LABELS[r]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type selector */}
          <div className="flex flex-col gap-[6px]">
            <span className="font-semibold text-[#434343] text-[10px] leading-[14px] tracking-wider uppercase">
              Type
            </span>
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => setParam("type", "executive")}
                className={`text-left px-[12px] h-[28px] rounded-[8px] text-[12px] ${
                  options.type === "executive"
                    ? "bg-[rgba(226,237,247,0.5)] font-medium text-[#142845]"
                    : "font-light text-[#142845]"
                }`}
              >
                Executive Summary
              </button>
              <button
                type="button"
                onClick={() => setParam("type", "full")}
                className={`text-left px-[12px] h-[28px] rounded-[8px] text-[12px] ${
                  options.type === "full"
                    ? "bg-[rgba(226,237,247,0.5)] font-medium text-[#142845]"
                    : "font-light text-[#142845]"
                }`}
              >
                Full Report
              </button>
              <button
                type="button"
                onClick={() =>
                  setParam("appendices", options.appendices ? "0" : "1")
                }
                className={`text-left px-[12px] h-[28px] rounded-[8px] text-[12px] ${
                  options.appendices
                    ? "bg-[rgba(226,237,247,0.5)] font-medium text-[#142845]"
                    : "font-light text-[#142845]"
                }`}
              >
                {options.appendices ? "✓ " : ""}Include appendices
              </button>
            </div>
          </div>

          {/* Contents */}
          <div className="flex flex-col gap-[6px]">
            <span className="font-semibold text-[#434343] text-[10px] leading-[14px] tracking-wider uppercase">
              Contents
            </span>
            <nav className="flex flex-col gap-[2px]">
              {NAV_ITEMS.map((it) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  className="px-[12px] h-[28px] flex items-center rounded-[8px] text-[12px] font-light text-[#142845] hover:bg-[rgba(226,237,247,0.5)]"
                >
                  {it.label}
                </a>
              ))}
              {options.appendices &&
                APPENDIX_ITEMS.map((it) => (
                  <a
                    key={it.id}
                    href={`#${it.id}`}
                    className="px-[12px] h-[28px] flex items-center rounded-[8px] text-[12px] font-light text-[#142845] hover:bg-[rgba(226,237,247,0.5)]"
                  >
                    {it.label}
                  </a>
                ))}
            </nav>
          </div>

          {/* Export actions */}
          <div className="flex flex-col gap-[8px]">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-white border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center rounded-[16px] w-full"
            >
              <Printer className="size-[14px] text-[#142845]" />
              <span className="font-normal text-[#142845] text-[14px] leading-[20px]">
                Print / Export PDF
              </span>
            </button>
            <button
              type="button"
              disabled
              title="Excel export not implemented yet"
              className="bg-white border border-[#c4c4c4] flex gap-[8px] h-[32px] items-center justify-center rounded-[16px] w-full opacity-50 cursor-not-allowed"
            >
              <Download className="size-[14px] text-[#888]" />
              <span className="font-normal text-[#888] text-[14px] leading-[20px]">
                Export to Excel
              </span>
            </button>
          </div>
        </aside>

        {/* ─── Main column ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-[32px] print:gap-[0]">
          <header className="flex flex-col gap-[8px] print:break-after-avoid">
            <div className="flex items-center gap-[8px]">
              <FileText className="size-[20px] text-[#142845]" />
              <span className="font-medium text-[#142845] text-[12px] leading-[16px] uppercase tracking-wider">
                Tender Evaluation Report
              </span>
            </div>
            <h1
              className="font-bold text-[#142845] text-[32px] leading-[40px]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {project.name}
            </h1>
            <p className="font-light text-[#555] text-[13px] leading-[20px]">
              Round: {ROUND_LABELS[options.round]} · Type:{" "}
              {options.type === "executive" ? "Executive Summary" : "Full"}
              {options.appendices ? " · Appendices included" : ""}
            </p>
          </header>

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
        </main>
      </div>
    </div>
  )
}
