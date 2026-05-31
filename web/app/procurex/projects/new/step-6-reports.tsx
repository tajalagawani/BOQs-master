"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Share2,
  Search,
  Send,
  ClipboardList,
  Eye,
  Info,
  Download,
  FileText,
  History,
} from "lucide-react"
import { Label, ListBox, Select } from "@heroui/react"

import {
  getProjectBidderOverview,
  type ProjectBidderOverviewRow,
} from "@/modules/procurex/review/overview-data"

type Round = "initial" | "ptc1" | "ptc2" | "ptc3"

const ROUND_LABELS: Record<Round, string> = {
  initial: "Initial",
  ptc1: "PTC 1",
  ptc2: "PTC 2",
  ptc3: "PTC 3",
}

type ReportType = "executive" | "full"

// ──────────────────────────────────────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────────────────────────────────────

function StatusChips({ tendererCount }: { tendererCount: number | null }) {
  const rows = [
    { label: "Mode", value: "Upload" },
    { label: "PTE", value: "Available" },
    {
      label: "Tenderers",
      value: tendererCount === null ? "…" : String(tendererCount),
    },
  ]
  return (
    <div className="flex flex-col gap-[8px] pt-[16px]">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-[4px] items-center text-[12px] leading-[16px]">
          <span className="font-semibold text-[#142845] w-[80px]">{r.label}</span>
          <span className="font-light text-[#142845]">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function SidebarDropdown({ label, value }: { label: string; value: string }) {
  const options: { id: Round; name: string }[] = [
    { id: "initial", name: "Round 1 — Initial" },
    { id: "ptc1", name: "Round 2 — PTC 1" },
    { id: "ptc2", name: "Round 3 — PTC 2" },
    { id: "ptc3", name: "Round 4 — PTC 3" },
  ]
  return (
    <Select fullWidth defaultValue="initial" placeholder={value}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item key={o.id} id={o.id} textValue={o.name}>
              {o.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

interface NavItemProps {
  label: string
  active?: boolean
  indent?: number
}

function NavItem({ label, active, indent = 0 }: NavItemProps) {
  return (
    <button
      type="button"
      className={`flex h-[28px] items-center px-[12px] rounded-[8px] w-full text-left ${
        active ? "bg-[rgba(226,237,247,0.5)]" : ""
      }`}
      style={{ paddingLeft: 12 + indent * 12 }}
    >
      <span
        className={`text-[#142845] text-[12px] leading-[16px] ${
          active ? "font-medium" : "font-light"
        }`}
      >
        {label}
      </span>
    </button>
  )
}

function NavGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[28px] items-center justify-between px-[12px] rounded-[8px] w-full"
      >
        <span className="font-normal text-[#142845] text-[12px] leading-[16px]">{label}</span>
        {open ? (
          <ChevronUp className="size-[14px] text-[#142845]" />
        ) : (
          <ChevronDown className="size-[14px] text-[#142845]" />
        )}
      </button>
      {open && <div className="flex flex-col">{children}</div>}
    </div>
  )
}

function Step6Sidebar({ tendererCount }: { tendererCount: number | null }) {
  return (
    <aside className="flex flex-col gap-[24px] w-[280px] py-[16px] px-[8px] shrink-0">
      <StatusChips tendererCount={tendererCount} />

      <div className="flex flex-col gap-[8px]">
        <h2
          className="font-medium text-[#142845] text-[32px] leading-[40px]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Reports
        </h2>
        <p className="font-light text-[#142845] text-[12px] leading-[16px]">
          Generate PTC packs and tender reports from analysis results.
        </p>
      </div>

      <SidebarDropdown label="Select Tender Revision/Round" value="Round 1 — Initial" />

      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center justify-between px-[12px]">
          <span className="font-semibold text-[#434343] text-[10px] leading-[14px] tracking-wider uppercase">
            Contents
          </span>
        </div>
        <div className="flex flex-col gap-[2px]">
          <NavItem label="Reports Overview" active />
          <NavGroup label="PTC Reports">
            <NavItem label="Initial" indent={1} />
            <NavItem label="PTC 1" indent={1} />
            <NavItem label="PTC 2" indent={1} />
            <NavItem label="PTC 3" indent={1} />
          </NavGroup>
          <NavGroup label="Tender Reports">
            <NavItem label="Initial" indent={1} />
            <NavItem label="PTC 1" indent={1} />
            <NavItem label="PTC 2" indent={1} />
            <NavItem label="PTC 3" indent={1} />
          </NavGroup>
          <NavItem label="Export History" />
        </div>
      </div>

      <div className="flex flex-col gap-[8px] px-[12px]">
        <div className="flex gap-[4px] items-center">
          <Send className="size-[12px] text-[#142845]" />
          <span className="font-semibold text-[#434343] text-[10px] leading-[14px] tracking-wider uppercase">
            Actions
          </span>
        </div>
        <div className="flex gap-[8px]">
          <button
            type="button"
            className="bg-[#e2edf7] flex gap-[4px] h-[24px] items-center px-[8px] rounded-[8px]"
          >
            <MessageSquare className="size-[12px] text-[#142845]" />
            <span className="text-[#142845] text-[12px] leading-[16px]">Comment</span>
          </button>
          <button
            type="button"
            className="bg-[#e2edf7] flex gap-[4px] h-[24px] items-center px-[8px] rounded-[8px]"
          >
            <Share2 className="size-[12px] text-[#142845]" />
            <span className="text-[#142845] text-[12px] leading-[16px]">Share</span>
          </button>
        </div>
      </div>

      <div className="px-[12px]">
        <div className="bg-white border border-[#e2edf7] flex gap-[8px] h-[40px] items-center px-[12px] rounded-[8px]">
          <Search className="size-[14px] text-[#555]" />
          <input
            type="text"
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-[12px] text-[#142845] placeholder:text-[#888]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-[8px] px-[12px]">
        <button
          type="button"
          className="font-light text-[#142845] text-[12px] leading-[16px] underline underline-offset-2 self-start"
        >
          Collapse all accordions
        </button>
        <button
          type="button"
          className="bg-white border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center rounded-[16px] w-full"
        >
          <Download className="size-[14px] text-[#142845]" />
          <span className="font-normal text-[#142845] text-[14px] leading-[20px]">Export PDF</span>
        </button>
        <button
          type="button"
          className="bg-white border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center rounded-[16px] w-full"
        >
          <Download className="size-[14px] text-[#142845]" />
          <span className="font-normal text-[#142845] text-[14px] leading-[20px]">
            Export to Excel
          </span>
        </button>
      </div>
    </aside>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Round pill tabs
// ──────────────────────────────────────────────────────────────────────────

function RoundPillTabs({ active, onChange }: { active: Round; onChange: (r: Round) => void }) {
  const rounds: Round[] = ["initial", "ptc1", "ptc2", "ptc3"]
  return (
    <div className="bg-white border border-[#e2edf7] flex h-[32px] items-center p-[4px] rounded-[8px] w-fit">
      {rounds.map((r) => {
        const isActive = r === active
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`flex h-[24px] items-center justify-center px-[16px] rounded-[4px] text-[12px] leading-[16px] ${
              isActive
                ? "bg-[#142845] font-medium text-white"
                : "font-normal text-[#142845]"
            }`}
          >
            {ROUND_LABELS[r]}
          </button>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Project title row
// ──────────────────────────────────────────────────────────────────────────

function ProjectTitleRow({ projectName }: { projectName: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <h1
        className="font-bold text-[#142845] text-[28px] leading-[40px]"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {projectName ?? "Untitled tender"}
      </h1>
      <div className="flex gap-[8px]">
        <button
          type="button"
          aria-label="Edit"
          className="bg-white border border-[#e2edf7] flex items-center justify-center rounded-[8px] size-[32px]"
        >
          <Info className="size-[14px] text-[#142845]" />
        </button>
        <button
          type="button"
          aria-label="More"
          className="bg-white border border-[#e2edf7] flex items-center justify-center rounded-[8px] size-[32px]"
        >
          <ChevronDown className="size-[14px] text-[#142845]" />
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// PTC Packs card
// ──────────────────────────────────────────────────────────────────────────

function PtcPacksCard({
  bidders,
  onGenerate,
}: {
  /** Real tenderers on the project. `null` = still loading. */
  bidders: ProjectBidderOverviewRow[] | null
  /** Called with the selected bidder IDs when the QS clicks Generate. */
  onGenerate: (bidderIds: string[]) => void
}) {
  const [open, setOpen] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  // Default every fetched bidder to selected the first time the list
  // arrives. Subsequent renders preserve the QS's current toggle state.
  useEffect(() => {
    if (!bidders) return
    setSelected((prev) => {
      const next = { ...prev }
      for (const b of bidders) {
        if (!(b.id in next)) next[b.id] = true
      }
      return next
    })
  }, [bidders])
  const count = bidders
    ? bidders.filter((b) => selected[b.id]).length
    : 0

  return (
    <section className="bg-white border border-[rgba(226,237,247,0.5)] flex flex-col gap-[32px] p-[24px] rounded-[16px] w-full">
      <div className="flex flex-col gap-[16px]">
        <div className="flex items-center justify-between gap-[32px]">
          <div className="flex gap-[8px] items-center">
            <div className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[8px] size-[40px]">
              <Send className="size-[16px] text-[#142845]" />
            </div>
            <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">PTC Packs</h3>
            <Info className="size-[16px] text-[#142845]" />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
          >
            {open ? (
              <ChevronUp className="size-[16px] text-[#142845]" />
            ) : (
              <ChevronDown className="size-[16px] text-[#142845]" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-[8px] pl-[48px]">
          <p className="flex-1 font-light text-[#142845] text-[12px] leading-[16px]">
            Tenderer specific clarification requests. PTCs will not disclose PTE values or internal
            budget assumptions to tenderers.
          </p>
          <span className="bg-[#408435] flex h-[24px] items-center gap-[4px] px-[8px] rounded-[8px] shrink-0">
            <span className="text-white text-[12px] leading-[16px]">
              <span className="font-semibold">PTC readiness:</span>
              <span className="font-normal"> Complete</span>
            </span>
            <Info className="size-[12px] text-white" />
          </span>
        </div>
      </div>

      {open && (
        <div className="border border-[rgba(226,237,247,0.5)] flex flex-col gap-[32px] justify-center p-[24px] rounded-[16px]">
          <div className="flex flex-col gap-[16px]">
            <h4 className="font-semibold text-black text-[16px] leading-[24px]">Select tenderers</h4>
            <div className="flex flex-col gap-[8px]">
              {bidders === null ? (
                <div className="py-[24px] text-center text-[12px] text-[#888]">
                  Loading tenderers…
                </div>
              ) : bidders.length === 0 ? (
                <div className="py-[24px] text-center text-[12px] text-[#888]">
                  No tenderers on this project yet. Add tenderers in Step 3 to
                  generate PTC packs.
                </div>
              ) : (
                bidders.map((b) => {
                  const on = selected[b.id] ?? false
                  return (
                    <div
                      key={b.id}
                      className="bg-white border-[0.5px] border-[#e2edf7] flex h-[56px] items-center justify-between px-[16px] rounded-[8px]"
                    >
                      <div className="flex gap-[16px] items-center">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() =>
                            setSelected((m) => ({ ...m, [b.id]: !on }))
                          }
                          className={`flex items-center justify-center rounded-[4px] size-[16px] border ${
                            on
                              ? "bg-[#408435] border-[#408435]"
                              : "bg-white border-[#212121]"
                          }`}
                        >
                          {on && (
                            <svg
                              className="size-[10px] text-white"
                              viewBox="0 0 10 10"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M1.5 5l2.5 2.5L8.5 2.5" />
                            </svg>
                          )}
                        </button>
                        <span className="text-black text-[14px] leading-[24px]">
                          {b.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="bg-[#e2edf7] flex gap-[8px] h-[24px] items-center px-[8px] rounded-[8px]"
                      >
                        <Eye className="size-[14px] text-black" />
                        <span className="text-black text-[12px] leading-[16px]">Preview</span>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={count === 0}
            onClick={() => {
              if (!bidders) return
              const selectedIds = bidders
                .filter((b) => selected[b.id])
                .map((b) => b.id)
              if (selectedIds.length === 0) return
              onGenerate(selectedIds)
            }}
            className="bg-[#142845] disabled:bg-[#c4c4c4] flex gap-[8px] h-[40px] items-center justify-center px-[24px] py-[8px] rounded-[16px] w-full"
          >
            <Send className="size-[14px] text-white" />
            <span className="text-white text-[14px] leading-[24px]">
              Generate PTC Packs ({count})
            </span>
          </button>
        </div>
      )}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Tender Report card
// ──────────────────────────────────────────────────────────────────────────

function TenderReportCard({
  onGenerate,
}: {
  /** Called with the report options when the QS clicks Generate. */
  onGenerate: (opts: { type: ReportType; appendices: boolean }) => void
}) {
  const [open, setOpen] = useState(true)
  const [type, setType] = useState<ReportType>("full")
  const [appendices, setAppendices] = useState(true)

  return (
    <section className="bg-white border border-[rgba(226,237,247,0.5)] flex flex-col gap-[32px] p-[24px] rounded-[16px] w-full">
      <div className="flex flex-col gap-[16px]">
        <div className="flex items-center justify-between gap-[32px]">
          <div className="flex gap-[8px] items-center">
            <div className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[8px] size-[40px]">
              <ClipboardList className="size-[16px] text-[#142845]" />
            </div>
            <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
              Tender Report
            </h3>
            <Info className="size-[16px] text-[#142845]" />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
          >
            {open ? (
              <ChevronUp className="size-[16px] text-[#142845]" />
            ) : (
              <ChevronDown className="size-[16px] text-[#142845]" />
            )}
          </button>
        </div>
        <p className="pl-[48px] font-light text-[#142845] text-[12px] leading-[16px]">
          Client-facing evaluation report.
        </p>
      </div>

      {open && (
        <div className="border border-[rgba(226,237,247,0.5)] flex flex-col gap-[32px] justify-center p-[24px] rounded-[16px]">
          <div className="flex flex-col gap-[16px]">
            <h4 className="font-semibold text-black text-[16px] leading-[24px]">
              Select report type:
            </h4>
            <div className="flex flex-col gap-[8px]">
              <RadioRow
                label="Executive Summary Only"
                hint="High-level overview and recommendation"
                selected={type === "executive"}
                onSelect={() => setType("executive")}
              />
              <RadioRow
                label="Full Report"
                hint="Complete analysis with all details"
                selected={type === "full"}
                onSelect={() => setType("full")}
              />
              <CheckboxRow
                label="Include appendices"
                hint="BOQ Comparison, BOQ Review list, Deviations (Contractual, Commercial, Technical)"
                selected={appendices}
                onToggle={() => setAppendices((v) => !v)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onGenerate({ type, appendices })}
            className="bg-[#142845] flex gap-[8px] h-[40px] items-center justify-center px-[24px] py-[8px] rounded-[16px] w-full"
          >
            <FileText className="size-[14px] text-white" />
            <span className="text-white text-[14px] leading-[24px]">Generate Tender Report</span>
          </button>
        </div>
      )}
    </section>
  )
}

function RadioRow({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string
  hint: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="bg-white border-[0.5px] border-[#e2edf7] flex h-[56px] items-center px-[16px] rounded-[8px] text-left w-full"
    >
      <div className="flex gap-[16px] items-center w-full">
        <span
          className={`flex items-center justify-center rounded-full size-[16px] border ${
            selected ? "border-[#142845]" : "border-[#888]"
          }`}
        >
          {selected && <span className="bg-[#142845] block rounded-full size-[8px]" />}
        </span>
        <div className="flex flex-col">
          <span className="font-medium text-black text-[14px] leading-[24px]">{label}</span>
          <span className="font-light text-[#555] text-[12px] leading-[16px]">{hint}</span>
        </div>
      </div>
    </button>
  )
}

function CheckboxRow({
  label,
  hint,
  selected,
  onToggle,
}: {
  label: string
  hint: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white border-[0.5px] border-[#e2edf7] flex h-[56px] items-center px-[16px] rounded-[8px]">
      <div className="flex gap-[16px] items-center w-full">
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          onClick={onToggle}
          className={`flex items-center justify-center rounded-[4px] size-[16px] border ${
            selected
              ? "bg-[#408435] border-[#408435]"
              : "bg-white border-[#212121]"
          }`}
        >
          {selected && (
            <svg
              className="size-[10px] text-white"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1.5 5l2.5 2.5L8.5 2.5" />
            </svg>
          )}
        </button>
        <div className="flex flex-col">
          <span className="font-normal text-black text-[14px] leading-[24px]">{label}</span>
          <span className="font-light text-[#555] text-[12px] leading-[16px]">{hint}</span>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

export function Step6Reports({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string | null
}) {
  const router = useRouter()
  const [round, setRound] = useState<Round>("initial")
  /** Real tenderers fetched from the server. `null` = loading; never
   *  a mock fallback. */
  const [bidders, setBidders] = useState<ProjectBidderOverviewRow[] | null>(
    null,
  )

  useEffect(() => {
    if (!projectId) {
      setBidders([])
      return
    }
    let cancelled = false
    void (async () => {
      const rows = await getProjectBidderOverview(projectId)
      if (!cancelled) setBidders(rows)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  return (
    <div className="w-[1400px] mx-auto flex items-start gap-[24px]">
      <Step6Sidebar tendererCount={bidders?.length ?? null} />
      <main className="flex-1 flex flex-col gap-[24px]">
        <RoundPillTabs active={round} onChange={setRound} />
        <ProjectTitleRow projectName={projectName} />
        <PtcPacksCard
          bidders={bidders}
          onGenerate={(ids) => {
            if (!projectId) return
            const qs = new URLSearchParams({ bidders: ids.join(",") })
            router.push(`/procurex/projects/${projectId}/ptc?${qs.toString()}`)
          }}
        />
        <TenderReportCard
          onGenerate={({ type, appendices }) => {
            if (!projectId) return
            const qs = new URLSearchParams({
              type,
              appendices: appendices ? "1" : "0",
              round,
            })
            router.push(`/procurex/projects/${projectId}/report?${qs.toString()}`)
          }}
        />
      </main>
    </div>
  )
}
