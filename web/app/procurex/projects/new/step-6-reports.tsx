"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  Send,
  ClipboardList,
  Eye,
  Download,
  FileText,
} from "lucide-react"

import { cn } from "@/lib/cn"
import {
  ProcurexReportShell,
  SectionTitle,
  SubTitle,
  CodeBadge,
  SuiteChip,
} from "@/components/suite"
import {
  getProjectBidderOverview,
  type ProjectBidderOverviewRow,
} from "@/modules/procurex/review/overview-data"

type Round = "initial" | "ptc1" | "ptc2" | "ptc3"

const ROUNDS: Round[] = ["initial", "ptc1", "ptc2", "ptc3"]

const ROUND_LABELS: Record<Round, string> = {
  initial: "Initial",
  ptc1: "PTC 1",
  ptc2: "PTC 2",
  ptc3: "PTC 3",
}

type ReportType = "executive" | "full"

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
    <section id="ptc-packs" className="scroll-mt-6">
      <SectionTitle
        no="01"
        title="PTC Packs"
        right={
          <SuiteChip tone="good">
            <span className="font-semibold">PTC readiness:</span> Complete
          </SuiteChip>
        }
      />
      <div className="mb-3.5 flex items-start gap-2.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-suite-line bg-suite-card-soft">
          <Send className="size-4 text-suite-navy" />
        </div>
        <div className="flex-1">
          <p className="max-w-[78ch] text-[12.5px] leading-[1.6] text-suite-ink-2">
            Tenderer specific clarification requests. PTCs will not disclose PTE
            values or internal budget assumptions to tenderers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse" : "Expand"}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-suite-ink-2 hover:bg-suite-card-soft"
        >
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      </div>

      {open && (
        <div className="rounded-[14px] border border-suite-line bg-suite-card-soft p-5">
          <SubTitle>Select tenderers</SubTitle>
          <div className="flex flex-col gap-2">
            {bidders === null ? (
              <div className="py-6 text-center text-[12px] text-suite-ink-4">
                Loading tenderers…
              </div>
            ) : bidders.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-suite-ink-4">
                No tenderers on this project yet. Add tenderers in Step 3 to
                generate PTC packs.
              </div>
            ) : (
              bidders.map((b) => {
                const on = selected[b.id] ?? false
                return (
                  <div
                    key={b.id}
                    className="flex h-14 items-center justify-between rounded-[10px] border border-suite-line bg-suite-panel px-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() =>
                          setSelected((m) => ({ ...m, [b.id]: !on }))
                        }
                        className={`grid size-4 place-items-center rounded-[4px] border ${
                          on
                            ? "border-suite-green bg-suite-green"
                            : "border-suite-ink-3 bg-suite-panel"
                        }`}
                      >
                        {on && (
                          <svg
                            className="size-2.5 text-white"
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1.5 5l2.5 2.5L8.5 2.5" />
                          </svg>
                        )}
                      </button>
                      <CodeBadge>{b.code}</CodeBadge>
                      <span className="text-[14px] text-suite-ink">
                        {b.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-6 items-center gap-2 rounded-lg bg-suite-blue-soft px-2 text-[12px] text-suite-navy-2"
                    >
                      <Eye className="size-3.5" />
                      Preview
                    </button>
                  </div>
                )
              })
            )}
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
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-suite-btn text-[14px] text-white transition-colors hover:bg-suite-navy-3 disabled:cursor-not-allowed disabled:bg-suite-line-2 disabled:text-suite-ink-4"
          >
            <Send className="size-3.5" />
            Generate PTC Packs ({count})
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
  type,
  appendices,
  onAppendicesChange,
  onGenerate,
}: {
  /** Report type, lifted to the page so the hero segment can drive it. */
  type: ReportType
  /** Whether appendices are included. */
  appendices: boolean
  onAppendicesChange: (v: boolean) => void
  /** Called with the report options when the QS clicks Generate. */
  onGenerate: () => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <section id="tender-report" className="scroll-mt-6">
      <SectionTitle
        no="02"
        title="Tender Report"
        right={
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            className="grid size-8 place-items-center rounded-lg text-suite-ink-2 hover:bg-suite-card-soft"
          >
            {open ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        }
      />
      <div className="mb-3.5 flex items-start gap-2.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-suite-line bg-suite-card-soft">
          <ClipboardList className="size-4 text-suite-navy" />
        </div>
        <p className="text-[12.5px] leading-[1.6] text-suite-ink-2">
          Client-facing evaluation report.
        </p>
      </div>

      {open && (
        <div className="rounded-[14px] border border-suite-line bg-suite-card-soft p-5">
          <SubTitle>Select report type</SubTitle>
          <div className="flex flex-col gap-2">
            <RadioRow
              label="Executive Summary Only"
              hint="High-level overview and recommendation"
              selected={type === "executive"}
            />
            <RadioRow
              label="Full Report"
              hint="Complete analysis with all details"
              selected={type === "full"}
            />
            <CheckboxRow
              label="Include appendices"
              hint="BOQ Comparison, BOQ Review list, Deviations (Contractual, Commercial, Technical)"
              selected={appendices}
              onToggle={() => onAppendicesChange(!appendices)}
            />
          </div>

          <button
            type="button"
            onClick={onGenerate}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-suite-btn text-[14px] text-white transition-colors hover:bg-suite-navy-3"
          >
            <FileText className="size-3.5" />
            Generate Tender Report
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
}: {
  label: string
  hint: string
  selected: boolean
}) {
  return (
    <div className="flex h-14 items-center rounded-[10px] border border-suite-line bg-suite-panel px-4">
      <div className="flex w-full items-center gap-3.5">
        <span
          className={`grid size-4 place-items-center rounded-full border ${
            selected ? "border-suite-navy" : "border-suite-ink-3"
          }`}
        >
          {selected && (
            <span className="block size-2 rounded-full bg-suite-navy" />
          )}
        </span>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-suite-ink">{label}</span>
          <span className="text-[12px] text-suite-ink-3">{hint}</span>
        </div>
      </div>
    </div>
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
    <div className="flex h-14 items-center rounded-[10px] border border-suite-line bg-suite-panel px-4">
      <div className="flex w-full items-center gap-3.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          onClick={onToggle}
          className={`grid size-4 place-items-center rounded-[4px] border ${
            selected
              ? "border-suite-green bg-suite-green"
              : "border-suite-ink-3 bg-suite-panel"
          }`}
        >
          {selected && (
            <svg
              className="size-2.5 text-white"
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
          <span className="text-[14px] text-suite-ink">{label}</span>
          <span className="text-[12px] text-suite-ink-3">{hint}</span>
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
  const [type, setType] = useState<ReportType>("full")
  const [appendices, setAppendices] = useState(true)
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

  const tendererCount = bidders?.length ?? null

  return (
    <ProcurexReportShell
        meta={[
          { k: "Report type", v: type === "full" ? "Full Report" : "Executive Summary" },
          { k: "Round", v: ROUND_LABELS[round] },
          { k: "Mode", v: "Upload" },
          { k: "PTE", v: "Available" },
          {
            k: "Tenderers",
            v: tendererCount === null ? "…" : String(tendererCount),
          },
        ]}
        aiNote={
          <>
            PTC packs and the tender report are{" "}
            <b>drafted from the computed analysis only</b> — every figure is
            quoted from the deterministic engine, never recalculated. Reviewed
            and approved by the QS before issue.{" "}
            <b>
              The PTE drives the internal report and is never disclosed to
              bidders.
            </b>
          </>
        }
        nav={[
          { no: "01", label: "PTC Packs", href: "#ptc-packs" },
          { no: "02", label: "Tender Report", href: "#tender-report" },
        ]}
      >
        {/* Report controls — light in-panel toolbar (the wizard owns the hero).
            Type + round are directly settable (no cyclic stepper). */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-full border border-suite-line bg-white p-0.5">
            {(
              [
                ["full", "Full report"],
                ["executive", "Executive"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setType(id as ReportType)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors",
                  type === id ? "bg-suite-navy text-white" : "text-suite-ink-2 hover:text-suite-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-suite-line bg-white p-0.5">
            {ROUNDS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRound(r)}
                className={cn(
                  "h-8 rounded-full px-3 text-[12px] font-semibold transition-colors",
                  round === r ? "bg-suite-navy text-white" : "text-suite-ink-2 hover:text-suite-ink",
                )}
              >
                {ROUND_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <PtcPacksCard
          bidders={bidders}
          onGenerate={(ids) => {
            if (!projectId) return
            const qs = new URLSearchParams({ bidders: ids.join(",") })
            router.push(`/procurex/projects/${projectId}/ptc?${qs.toString()}`)
          }}
        />
        <TenderReportCard
          type={type}
          appendices={appendices}
          onAppendicesChange={setAppendices}
          onGenerate={() => {
            if (!projectId) return
            const qs = new URLSearchParams({
              type,
              appendices: appendices ? "1" : "0",
              round,
            })
            router.push(`/procurex/projects/${projectId}/report?${qs.toString()}`)
          }}
        />
      </ProcurexReportShell>
  )
}
