"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Home,
  PanelLeft,
  Search,
  Send,
  MessageSquare,
  Share2,
  Download,
  ArrowLeft,
} from "lucide-react"
import {
  APPENDIX_BIDDERS,
  TENDER_INFO,
  BREAKDOWN_ROWS,
  BREAKDOWN_TOTALS,
  ADJUSTMENT_ROWS,
  DIFFERENCE_ROWS,
  LOWEST_BIDDER_ID,
} from "./data"
import { Label, ListBox, Select } from "@heroui/react"

const PROJECT_NAME = "City Center Infrastructure Upgrade"

const APPENDIX_REVISION_OPTIONS = [
  { id: "rev-0", name: "Initial Tender Revision (Revision 0)" },
  { id: "rev-1", name: "Revision 1" },
  { id: "rev-2", name: "Revision 2" },
]

const BIDDER_COLORS: Record<string, string> = {
  orion: "#142845",
  stratus: "#7da6c9",
  helix: "#a3a3a3",
  linea: "#3aa269",
  crestline: "#d49b3b",
  axis: "#c25455",
}

const fmt = (v: number | string) =>
  typeof v === "number" ? v.toLocaleString("en-US") : v

interface Props {
  ptePresent: boolean
  onPtePresentChange: (next: boolean) => void
  onBack: () => void
}

export function AppendixAPage({
  ptePresent,
  onPtePresentChange,
  onBack,
}: Props) {
  return (
    <div className="w-[1400px] mx-auto flex items-start gap-[24px]">
      <AppendixSidebar
        ptePresent={ptePresent}
        onPtePresentChange={onPtePresentChange}
        onBack={onBack}
      />
      <main className="flex-1 flex flex-col gap-[16px]">
        <Breadcrumb onBack={onBack} />
        <PageTitle />
        <TenderInfoTable />
        <SectionAccordion id="breakdown" title="1) Tender Sum Breakdown (AED)">
          <BreakdownTable />
        </SectionAccordion>
        <SectionAccordion
          id="arith"
          title="1.1 Arithmetical errors / adjustments"
        >
          <ComparisonTable rows={ADJUSTMENT_ROWS} />
        </SectionAccordion>
        <SectionAccordion id="diff" title="Difference from lowest tender">
          <ComparisonTable rows={DIFFERENCE_ROWS} />
        </SectionAccordion>
      </main>
    </div>
  )
}

function AppendixSidebar({
  ptePresent,
  onPtePresentChange,
  onBack,
}: Props) {
  return (
    <aside className="bg-white flex flex-col items-start overflow-clip pb-[16px] px-[16px] rounded-br-[16px] w-[280px] sticky top-[80px] self-start max-h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex flex-col gap-[24px] items-start w-full">
        <div className="flex flex-col w-full">
          <div className="flex items-start pb-[16px] w-full relative">
            <div className="flex flex-1 flex-col gap-[16px] items-start justify-center min-w-0">
              <div className="flex gap-[8px] h-[96px] items-center justify-end pb-[16px] w-full">
                <div className="flex-1" />
                <button
                  type="button"
                  className="bg-white flex items-center justify-center rounded-[8px] size-[32px]"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeft className="size-[16px] text-[#142845]" />
                </button>
                <div className="absolute bg-[rgba(226,237,247,0.5)] flex flex-col items-center justify-center left-[-16px] p-[16px] rounded-br-[16px] text-black top-0 w-[166px] gap-[4px]">
                  <div className="flex gap-[4px] items-center text-[12px] w-full">
                    <p className="font-medium leading-[16px] whitespace-nowrap">
                      Mode
                    </p>
                    <p className="flex-1 font-light leading-[16px] text-right">
                      Upload
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPtePresentChange(!ptePresent)}
                    className="flex gap-[4px] items-center text-[12px] w-full hover:opacity-80"
                  >
                    <p className="flex-1 font-medium leading-[16px] text-left">
                      PTE
                    </p>
                    <p className="flex-1 font-light leading-[16px] text-right">
                      {ptePresent ? "Available" : "Not available"}
                    </p>
                  </button>
                  <div className="flex gap-[4px] items-center w-full">
                    <p className="font-medium text-[12px] leading-[16px] whitespace-nowrap">
                      Tenderers
                    </p>
                    <p className="flex-1 font-light text-[12px] leading-[16px] text-right">
                      6
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-[8px] text-[#142845] hover:opacity-80"
              >
                <ArrowLeft className="size-[14px]" />
                <span className="font-normal text-[12px] leading-[16px] underline">
                  Back to Results Overview
                </span>
              </button>
              <h1
                className="font-bold text-[#142845] text-[22px] leading-[32px]"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Tender Review
              </h1>
              <p className="font-medium text-[#142845] text-[12px] leading-[16px]">
                {PROJECT_NAME}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-[8px] items-start pb-[8px] w-full">
            <Select fullWidth defaultValue="rev-0" placeholder="Select revision">
              <Label>Select Revision</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {APPENDIX_REVISION_OPTIONS.map((o) => (
                    <ListBox.Item key={o.id} id={o.id} textValue={o.name}>
                      {o.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

        <nav className="flex flex-col gap-[2px] w-full">
          <a
            href="#breakdown"
            className="flex h-[28px] items-center px-[16px] rounded-[8px] w-full text-[#142845] font-normal text-[12px] leading-[16px]"
          >
            Tender Sum Breakdown
          </a>
          <a
            href="#arith"
            className="flex h-[28px] items-center px-[16px] rounded-[8px] w-full text-[#142845] font-light text-[12px] leading-[16px]"
          >
            Arithmetical errors / adjustments
          </a>
          <a
            href="#diff"
            className="flex h-[28px] items-center px-[16px] rounded-[8px] w-full text-[#142845] font-light text-[12px] leading-[16px]"
          >
            Difference from lowest
          </a>
        </nav>

        <div className="flex flex-col gap-[8px] items-start">
          <div className="flex gap-[4px] h-[16px] items-center w-[248px]">
            <Send className="size-[16px] text-black" />
            <p className="font-semibold text-black text-[12px] leading-[16px]">
              ACTIONS
            </p>
          </div>
          <div className="flex gap-[8px] items-start">
            <button
              type="button"
              className="bg-white flex h-[24px] items-center justify-center px-[8px] rounded-[8px] gap-[8px]"
            >
              <MessageSquare className="size-[14px] text-black" />
              <span className="font-normal text-black text-[12px] leading-[16px]">
                Comment
              </span>
              <ChevronDown className="size-[14px] text-black" />
            </button>
            <button
              type="button"
              className="bg-white flex h-[24px] items-center justify-center px-[8px] rounded-[8px] gap-[8px]"
            >
              <Share2 className="size-[14px] text-black" />
              <span className="font-normal text-black text-[12px] leading-[16px]">
                Share
              </span>
              <ChevronDown className="size-[14px] text-black" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#d9d9d9] flex h-[48px] items-center justify-between px-[16px] rounded-[16px] w-[248px]">
          <p className="italic font-normal text-[#555] text-[14px] leading-[24px]">
            Search
          </p>
          <Search className="size-[16px] text-[#555]" />
        </div>

        <div className="flex flex-col gap-[12px] items-center w-full">
          <button
            type="button"
            className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px]"
          >
            <Download className="size-[14px] text-[#142845]" />
            <span className="font-normal text-[#142845] text-[12px] leading-[16px]">
              Export Appendix A
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

function Breadcrumb({ onBack }: { onBack: () => void }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-[6px] text-[12px] text-[#142845]"
    >
      <Home className="size-[14px] text-[#142845]" />
      <ChevronRight className="size-[12px] text-[#a3a3a3]" />
      <span className="font-light">{PROJECT_NAME}</span>
      <ChevronRight className="size-[12px] text-[#a3a3a3]" />
      <button
        type="button"
        onClick={onBack}
        className="font-light underline hover:text-black"
      >
        Results Overview
      </button>
      <ChevronRight className="size-[12px] text-[#a3a3a3]" />
      <span className="font-medium">Comparison Summary Appendix A</span>
    </nav>
  )
}

function PageTitle() {
  return (
    <h2
      className="font-bold text-[#142845] text-[20px] leading-[28px]"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      Appendix A - Summary of Comparison of Revised Tenders Received
    </h2>
  )
}

function ColorChip({ id }: { id: string }) {
  return (
    <span
      className="inline-block size-[10px] rounded-[2px] shrink-0"
      style={{ background: BIDDER_COLORS[id] ?? "#a3a3a3" }}
    />
  )
}

function BidderHeaderCell({ id }: { id: string }) {
  const b = APPENDIX_BIDDERS.find((x) => x.id === id)!
  return (
    <div className="flex flex-col items-center gap-[4px] py-[8px] px-[8px] min-w-0">
      <ColorChip id={id} />
      <p className="text-center font-medium text-[#141414] text-[12px] leading-[16px] whitespace-normal break-words">
        {b.fullName}
      </p>
    </div>
  )
}

function TenderInfoTable() {
  return (
    <div className="bg-white border border-[#e9e9e9] rounded-[16px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr>
            <th className="bg-[#f8f8f8] py-[12px] px-[16px] text-left font-semibold text-[#434343] w-[160px]">
              Tenderer
            </th>
            {APPENDIX_BIDDERS.map((b) => (
              <th
                key={b.id}
                className="bg-[#f8f8f8] py-[12px] px-[8px] font-medium text-[#141414] min-w-[140px]"
              >
                <BidderHeaderCell id={b.id} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-[#e9e9e9]">
            <td className="py-[12px] px-[16px] font-normal text-[#262626]">
              Tender date Received
            </td>
            {APPENDIX_BIDDERS.map((b) => (
              <td
                key={b.id}
                className="py-[12px] px-[8px] text-center text-[#262626]"
              >
                {TENDER_INFO[b.id]?.tenderDate ?? "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-[#e9e9e9]">
            <td className="py-[12px] px-[16px] font-normal text-[#262626]">
              Round
            </td>
            {APPENDIX_BIDDERS.map((b) => (
              <td
                key={b.id}
                className="py-[12px] px-[8px] text-center text-[#262626]"
              >
                {TENDER_INFO[b.id]?.round ?? "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-[#e9e9e9]">
            <td className="py-[12px] px-[16px] font-normal text-[#262626]">
              Currency
            </td>
            {APPENDIX_BIDDERS.map((b) => (
              <td
                key={b.id}
                className="py-[12px] px-[8px] text-center text-[#262626]"
              >
                {TENDER_INFO[b.id]?.currency ?? "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SectionAccordion({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <section
      id={id}
      className="bg-white border border-[#e9e9e9] rounded-[16px] flex flex-col scroll-mt-[120px]"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between px-[24px] py-[16px] w-full"
      >
        <h3 className="font-semibold text-[#142845] text-[16px] leading-[24px]">
          {title}
        </h3>
        {open ? (
          <ChevronUp className="size-[16px] text-[#142845]" />
        ) : (
          <ChevronDown className="size-[16px] text-[#142845]" />
        )}
      </button>
      {open && (
        <div className="border-t border-[#e9e9e9] overflow-x-auto">
          {children}
        </div>
      )}
    </section>
  )
}

function BreakdownTable() {
  const [filter, setFilter] = useState("Initial PTE")
  return (
    <div className="px-[8px] py-[8px]">
      <table className="w-full text-[12px]">
        <thead>
          <tr>
            <th className="bg-[#f8f8f8] py-[8px] pl-[16px] pr-[8px] text-left font-semibold text-[#434343] w-[40px]">
              #
            </th>
            <th className="bg-[#f8f8f8] py-[8px] px-[8px] text-left font-semibold text-[#434343] w-[280px]">
              Element / Section
            </th>
            <th className="bg-[#f8f8f8] py-[8px] px-[8px] font-semibold text-[#434343] w-[140px] text-center">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-[#142845] text-white text-[11px] font-medium px-[8px] py-[4px] rounded-[6px] cursor-pointer"
              >
                <option>Initial PTE</option>
                <option>Revised PTE</option>
                <option>Final</option>
              </select>
            </th>
            {APPENDIX_BIDDERS.map((b) => (
              <th
                key={b.id}
                className="bg-[#f8f8f8] py-[8px] px-[8px] font-medium text-[#141414] min-w-[140px]"
              >
                <BidderHeaderCell id={b.id} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BREAKDOWN_ROWS.map((row) => (
            <tr key={row.no} className="border-t border-[#e9e9e9]">
              <td className="py-[10px] pl-[16px] pr-[8px] text-[#a3a3a3] tabular-nums">
                {row.no}
              </td>
              <td className="py-[10px] px-[8px] text-[#262626]">{row.label}</td>
              <td className="py-[10px] px-[8px] text-right tabular-nums text-[#262626]">
                {fmt(101_031_960)}
              </td>
              {APPENDIX_BIDDERS.map((b) => (
                <td
                  key={b.id}
                  className="py-[10px] px-[8px] text-right tabular-nums text-[#262626]"
                >
                  {fmt(row.amounts[b.id] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-[#142845] bg-[rgba(226,237,247,0.4)]">
            <td className="py-[14px] pl-[16px]" />
            <td className="py-[14px] px-[8px] font-semibold text-[#141414]">
              Total Tender Sum as Submitted
            </td>
            <td className="py-[14px] px-[8px]" />
            {APPENDIX_BIDDERS.map((b) => (
              <td
                key={b.id}
                className="py-[14px] px-[8px] text-right tabular-nums font-semibold text-[#141414]"
              >
                {fmt(BREAKDOWN_TOTALS[b.id] ?? 0)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ComparisonTable({
  rows,
}: {
  rows: Array<{ label: string; values: Record<string, number | string> }>
}) {
  return (
    <div className="px-[8px] py-[8px]">
      <table className="w-full text-[12px]">
        <thead>
          <tr>
            <th className="bg-[#f8f8f8] py-[8px] px-[16px] text-left font-semibold text-[#434343] w-[280px]" />
            {APPENDIX_BIDDERS.map((b) => (
              <th
                key={b.id}
                className="bg-[#f8f8f8] py-[8px] px-[8px] font-medium text-[#141414] min-w-[140px]"
              >
                <BidderHeaderCell id={b.id} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-[#e9e9e9]">
              <td className="py-[12px] px-[16px] text-[#262626]">{row.label}</td>
              {APPENDIX_BIDDERS.map((b) => {
                const v = row.values[b.id]
                const isLowestPct =
                  row.label === "% difference" && b.id === LOWEST_BIDDER_ID
                return (
                  <td
                    key={b.id}
                    className={`py-[12px] px-[8px] text-right tabular-nums ${
                      isLowestPct ? "text-emerald-600 font-semibold" : "text-[#262626]"
                    }`}
                  >
                    {fmt(v ?? "—")}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
