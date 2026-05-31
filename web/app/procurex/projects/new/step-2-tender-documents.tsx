"use client"

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  LayoutList,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { AgentQueueWidget } from "@/components/procurex/docs/agent-queue-widget"
import { BulkUploadZone } from "@/components/procurex/docs/bulk-upload-zone"
import { DocAccordion } from "@/components/procurex/docs/doc-accordion"
import { useProjectExtractionStream } from "@/components/procurex/docs/use-extraction-stream"
import {
  STEP2_OPTIONAL_DOCS,
  STEP2_REQUIRED_DOCS,
  type DocSpec,
  type DocSpecId,
} from "@/modules/ai-extraction"
import { saveDocForm } from "@/modules/ai-extraction/actions"
import {
  getCategoryStatuses,
  type CategoryStatusEntry,
} from "@/modules/ai-extraction/queue"

interface SidebarItem {
  label: string
  required?: boolean
  checked?: boolean
  selected?: boolean
  /** Spec id ("fot", "coc", …) — used to look up live status in statusMap. */
  categoryId?: string
}

interface SidebarGroup {
  title: string
  emphasized?: boolean
  items: SidebarItem[]
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: "Required Documents",
    items: [
      { label: "Blank BOQ / Pricing Schedule", required: true, categoryId: "boq-template" },
      { label: "Form of Tender (FOT)", required: true, categoryId: "fot" },
      { label: "Instructions to Tenderer (ITT)", required: true, categoryId: "itt" },
      { label: "Conditions of Contract", required: true, categoryId: "coc" },
      { label: "Drawings", required: true, categoryId: "drawings-register" },
    ],
  },
  {
    title: "Applicable Tender Documents",
    items: [
      { label: "Expression of Interest (EOI)" },
      { label: "Non-disclosure agreement (NDA)" },
      { label: "Specifications", categoryId: "specification" },
      { label: "Reports" },
      { label: "Schedule of Project Requirements", categoryId: "sopr" },
      { label: "Miscellaneous Documents" },
    ],
  },
  {
    title: "Post Tender Estimate (PTE)",
    items: [{ label: "Post Tender Estimate", required: true }],
  },
  {
    title: "Tender Addenda (TA)",
    items: [{ label: "Tender Addenda" }, { label: "Post Tender Addenda" }],
  },
  {
    title: "Post Tender Clarifications (PTCs)",
    emphasized: true,
    items: [{ label: "Post Tender Clarifications", selected: true }],
  },
]

function SidebarGroupBlock({
  group,
  statusMap = {},
}: {
  group: SidebarGroup
  statusMap?: Record<string, CategoryStatusEntry>
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex flex-col items-start rounded-[16px] w-[248px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[32px] items-center pl-[16px] w-full"
      >
        <div className="flex flex-1 items-center min-w-0">
          <p
            className={`text-[#142845] text-[12px] leading-[16px] text-left ${
              group.emphasized ? "font-semibold" : "font-medium"
            }`}
          >
            {group.title}
          </p>
        </div>
        <div className="flex items-center justify-center rounded-[8px] size-[32px]">
          {open ? (
            <ChevronUp className="size-[16px] text-[#142845]" />
          ) : (
            <ChevronDown className="size-[16px] text-[#142845]" />
          )}
        </div>
      </button>
      {open && (
        <div className="flex flex-col gap-[8px] items-start w-full">
          {group.items.map((item) => {
            // Live "checked" — true when:
            //  - the spec has been saved (audit_log entry), OR
            //  - the user fell back to hard-coded `checked` (groups without
            //    a categoryId, e.g. "Tender Addenda").
            const liveStatus = item.categoryId
              ? statusMap[item.categoryId]
              : undefined
            const checked = item.categoryId
              ? Boolean(liveStatus?.isSaved)
              : Boolean(item.checked)
            return (
              <div
                key={item.label}
                className={`flex gap-[8px] h-[32px] items-center px-[16px] py-[8px] rounded-[8px] w-full ${
                  item.selected ? "bg-[#e2edf7]" : ""
                }`}
              >
                <div className="flex flex-1 gap-[4px] items-center min-w-0">
                  <p
                    className={`text-[12px] leading-[16px] text-black w-[207px] truncate ${
                      item.selected ? "font-medium" : "font-light"
                    }`}
                  >
                    {item.required && (
                      <span className="font-bold text-[#c32a4f]">* </span>
                    )}
                    {item.label}
                  </p>
                </div>
                {checked && (
                  <CheckCircle2 className="size-[16px] text-emerald-500 fill-emerald-500 stroke-white shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


interface Step2TenderDocumentsProps {
  workspaceId?: string
  projectId?: string
  roundId?: string
}

export function Step2TenderDocuments({
  workspaceId = "",
  projectId = "",
  roundId = "",
}: Step2TenderDocumentsProps = {}) {
  const step2CategoryIds: DocSpecId[] = [
    ...STEP2_REQUIRED_DOCS.map((s) => s.id as DocSpecId),
    ...STEP2_OPTIONAL_DOCS.map((s) => s.id as DocSpecId),
  ]

  // Per-category status comes from two sources:
  //   1. An initial server fetch on mount (gets the persisted state).
  //   2. A single SSE channel for the whole project that pushes
  //      progress + terminal events. SSE keeps the map fresh without
  //      2-second polling.
  //   3. A safety-net 30-second poll catches edge cases where SSE drops.
  const [statusMap, setStatusMap] = useState<Record<string, CategoryStatusEntry>>({})
  /** Page-level view toggle. The "grid" tab renders every doc category
   *  as an icon card (same boxed look as the addenda wizard); clicking
   *  a card snaps back to the drop-zone layout at that doc. */
  const [layout, setLayout] = useState<"dropzone" | "grid">("dropzone")
  const sse = useProjectExtractionStream(projectId || null)

  // Initial fetch + 30 s heartbeat refresh.
  useEffect(() => {
    if (!projectId) return
    let stopped = false

    const refresh = async () => {
      try {
        const entries = await getCategoryStatuses(projectId)
        if (stopped) return
        const map: Record<string, CategoryStatusEntry> = {}
        for (const e of entries) map[e.categoryId] = e
        setStatusMap(map)
      } catch (err) {
        if (!stopped) console.error("[step2.statuses] refresh failed", err)
      }
    }

    void refresh()
    const id = window.setInterval(refresh, 30_000)
    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [projectId])

  // Layer SSE updates over the polled snapshot. On a `done` event we
  // also re-fetch so the verdict (which only lives in workflow_run.output,
  // not in the SSE event) lands in statusMap.
  // We track `doneCount` so the post-done re-fetch only fires when a NEW
  // done event arrives — previously this useEffect re-ran on every SSE
  // tick (i.e. every progress event) once any done event had landed,
  // hammering the Server Action for the rest of the session.
  const doneCount = sse.doneByDoc.size
  useEffect(() => {
    if (!projectId || sse.tick === 0) return
    // Update progress + jobStatus from live events. Verdicts are
    // re-fetched on `done`.
    setStatusMap((prev) => {
      const next = { ...prev }
      let changed = false
      for (const [categoryId, entry] of Object.entries(prev)) {
        if (!entry.documentId) continue
        const live = sse.liveByDoc.get(entry.documentId)
        const done = sse.doneByDoc.get(entry.documentId)
        if (live || done) {
          changed = true
          const newStatus = done
            ? done.status
            : entry.jobStatus === "none"
              ? "claimed"
              : entry.jobStatus
          next[categoryId] = {
            ...entry,
            jobStatus: newStatus as typeof entry.jobStatus,
            progress: live
              ? {
                  iteration: live.iteration,
                  maxIterations: live.maxIterations,
                  lastAction: live.lastAction,
                  tools: live.tools ?? [],
                  stopReason: live.stopReason ?? null,
                  at: live.at ?? new Date().toISOString(),
                  inputTokens: live.inputTokens,
                  outputTokens: live.outputTokens,
                  cacheReadTokens: live.cacheReadTokens,
                  cacheCreateTokens: live.cacheCreateTokens,
                }
              : entry.progress,
          }
        }
      }
      return changed ? next : prev
    })
    // post-done re-fetch lives in the dedicated effect below.
  }, [projectId, sse.tick, sse.liveByDoc, sse.doneByDoc])

  // Separate effect dedicated to "a new done event landed — re-fetch the
  // verdict from the server". Keying on doneCount means we re-fetch
  // exactly once per finished extraction, not on every progress tick.
  useEffect(() => {
    if (!projectId || doneCount === 0) return
    void (async () => {
      try {
        const entries = await getCategoryStatuses(projectId)
        const map: Record<string, CategoryStatusEntry> = {}
        for (const e of entries) map[e.categoryId] = e
        setStatusMap(map)
      } catch (err) {
        console.warn("[step2.statuses] post-done refresh failed", err)
      }
    })()
  }, [projectId, doneCount])

  function mapJobToAccordionStatus(
    s: CategoryStatusEntry | undefined,
  ): {
    status:
      | "empty"
      | "manually_filled"
      | "uploading"
      | "extracted"
      | "review_required"
      | "mismatched"
    /** Pass-through prefill — e.g. previously-saved values. NOT used for
     *  AI verdicts (those go through `extractedValue` + modal confirm). */
    initialValue: Record<string, unknown> | undefined
    /** AI-extracted verdict surfaced to the user via the Review modal. */
    extractedValue: Record<string, unknown> | null
    progress: {
      iteration: number
      maxIterations: number
      lastAction: string
      inputTokens?: number
      outputTokens?: number
      cacheReadTokens?: number
      cacheCreateTokens?: number
    } | null
  } {
    const progress = s?.progress
      ? {
          iteration: s.progress.iteration,
          maxIterations: s.progress.maxIterations,
          lastAction: s.progress.lastAction,
          inputTokens: s.progress.inputTokens,
          outputTokens: s.progress.outputTokens,
          cacheReadTokens: s.progress.cacheReadTokens,
          cacheCreateTokens: s.progress.cacheCreateTokens,
        }
      : null
    if (!s || s.jobStatus === "none") {
      return { status: "empty", initialValue: undefined, extractedValue: null, progress: null }
    }
    if (
      s.jobStatus === "queued" ||
      s.jobStatus === "claimed" ||
      s.jobStatus === "running"
    ) {
      return { status: "uploading", initialValue: undefined, extractedValue: null, progress }
    }
    if (s.jobStatus === "failed") {
      if (s.lastError?.startsWith("Wrong slot")) {
        return { status: "mismatched", initialValue: undefined, extractedValue: null, progress: null }
      }
      return { status: "review_required", initialValue: undefined, extractedValue: null, progress: null }
    }
    if (s.jobStatus === "succeeded") {
      // After Save, audit_log carries `doc.save:<id>` → isSaved=true.
      // Drop extractedValue so the Review pill disappears on refresh.
      return {
        status: "extracted",
        initialValue: undefined,
        extractedValue: s.isSaved
          ? null
          : ((s.verdict as Record<string, unknown>) ?? null),
        progress: null,
      }
    }
    return { status: "empty", initialValue: undefined, extractedValue: null, progress: null }
  }

  // Stable across renders — memoised so DocAccordion's React.memo wrapper
  // doesn't see a fresh prop identity every tick and re-render every row.
  const handleAccordionSave = useCallback(
    async (categoryId: string, value: unknown) => {
      const safeValue = JSON.parse(
        JSON.stringify(value, (_k, v) =>
          typeof v === "bigint" ? `${v.toString()}n` : v,
        ),
      )
      const result = await saveDocForm({
        category: categoryId,
        projectId,
        roundId,
        formData: safeValue,
      })
      if (!result.ok) throw new Error(result.error ?? "Save failed")
    },
    [projectId, roundId],
  )

  return (
    <>
    <AgentQueueWidget projectId={projectId ?? null} />
    <div className="flex items-start gap-0 w-[1360px] mx-auto">
      <aside className="bg-white flex flex-col items-start overflow-y-auto px-[16px] py-[32px] rounded-tr-[16px] rounded-br-[16px] w-[280px] gap-[24px] shrink-0 sticky top-[80px] self-start max-h-[calc(100vh-96px)]">
        <div className="flex flex-col gap-[8px] items-start px-[8px]">
          <h2 className="font-semibold text-black text-[18px] leading-[24px]">
            Tender Documents
          </h2>
          <p className="font-normal text-[#555] text-[12px] leading-[16px]">
            Upload the documents that is specific to the{" "}
            <span className="font-semibold">build only</span> project type.
          </p>
        </div>
        <div className="flex flex-col gap-[16px] items-start w-full">
          {SIDEBAR_GROUPS.map((group) => (
            <SidebarGroupBlock
              key={group.title}
              group={group}
              statusMap={statusMap}
            />
          ))}
        </div>
      </aside>

      <div className="flex flex-col gap-[32px] items-start w-[1096px] pl-[24px]">
        {/* Layout toggle — switch between the per-doc drop zones and a
            compact icon-card grid (same style as the addenda wizard) */}
        <div className="w-full flex items-center justify-between px-[8px]">
          <div className="inline-flex items-center bg-[#f3f4f5] rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setLayout("dropzone")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded ${
                layout === "dropzone"
                  ? "bg-white text-[#142845] shadow-sm"
                  : "text-[#666] hover:text-[#142845]"
              }`}
            >
              <LayoutList className="size-3.5" />
              Drop zones
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded ${
                layout === "grid"
                  ? "bg-white text-[#142845] shadow-sm"
                  : "text-[#666] hover:text-[#142845]"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              Quick add
            </button>
          </div>
        </div>

        {layout === "grid" && (
          <DocGridView
            requiredDocs={STEP2_REQUIRED_DOCS}
            optionalDocs={STEP2_OPTIONAL_DOCS}
            statusMap={statusMap}
            onSelectDoc={(specId) => {
              // Scroll to the doc's accordion in the drop-zone view —
              // user can do the actual upload there. Switch tabs first.
              setLayout("dropzone")
              setTimeout(() => {
                document
                  .getElementById(`doc-row-${specId}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }, 50)
            }}
          />
        )}

        {layout === "dropzone" && (
          <>
        {/* Bulk drop zone — accepts many files at once, auto-classifies each */}
        <BulkUploadZone
          workspaceId={workspaceId}
          projectId={projectId}
          allowedCategoryIds={step2CategoryIds}
        />

        {/* Required Documents — one accordion per category */}
        <div className="flex flex-col gap-[16px] w-full">
          <div className="flex items-end justify-between w-full px-[8px]">
            <div className="flex flex-col gap-[4px]">
              <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
                Required Documents
              </h3>
              <p className="text-[12px] text-[#555]">
                Fill in manually or upload — the AI agent extracts the same fields either way.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-[12px] w-full">
            {STEP2_REQUIRED_DOCS.map((spec) => {
              const mapped = mapJobToAccordionStatus(statusMap[spec.id])
              return (
                <div key={spec.id} id={`doc-row-${spec.id}`}>
                  <DocAccordion
                    spec={spec}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    roundId={roundId}
                    status={mapped.status}
                    initialValue={mapped.initialValue}
                    extractedValue={mapped.extractedValue}
                    progress={mapped.progress}
                    documentId={statusMap[spec.id]?.documentId ?? null}
                    runTotals={statusMap[spec.id]?.runTotals ?? null}
                    boqImport={statusMap[spec.id]?.boqImport ?? null}
                    onSave={handleAccordionSave}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Optional / context-dependent documents */}
        {STEP2_OPTIONAL_DOCS.length > 0 ? (
          <div className="flex flex-col gap-[16px] w-full">
            <div className="px-[8px]">
              <h3 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
                Optional Documents
              </h3>
              <p className="text-[12px] text-[#555]">
                Add when issued or available.
              </p>
            </div>
            <div className="flex flex-col gap-[12px] w-full">
              {STEP2_OPTIONAL_DOCS.map((spec) => {
                const mapped = mapJobToAccordionStatus(statusMap[spec.id])
                return (
                  <div key={spec.id} id={`doc-row-${spec.id}`}>
                    <DocAccordion
                      spec={spec}
                      workspaceId={workspaceId}
                      projectId={projectId}
                      roundId={roundId}
                      status={mapped.status}
                      initialValue={mapped.initialValue}
                      extractedValue={mapped.extractedValue}
                      progress={mapped.progress}
                      documentId={statusMap[spec.id]?.documentId ?? null}
                      runTotals={statusMap[spec.id]?.runTotals ?? null}
                      boqImport={statusMap[spec.id]?.boqImport ?? null}
                      addendaSummary={statusMap[spec.id]?.addendaSummary ?? null}
                      onSave={handleAccordionSave}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
          </>
        )}
      </div>
    </div>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Grid view — every doc category rendered as an icon card. Click a
// card to jump back to the drop-zone view scrolled to that doc.
// ──────────────────────────────────────────────────────────────────────

function DocGridView({
  requiredDocs,
  optionalDocs,
  statusMap,
  onSelectDoc,
}: {
  requiredDocs: DocSpec<unknown>[]
  optionalDocs: DocSpec<unknown>[]
  statusMap: Record<string, CategoryStatusEntry>
  onSelectDoc: (specId: string) => void
}) {
  return (
    <div className="flex flex-col gap-[16px] w-full">
      <div className="px-[8px]">
        <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
          Required Documents
        </h3>
        <p className="text-[12px] text-[#555]">
          Click a card to jump to its upload area.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full px-[8px]">
        {requiredDocs.map((spec) => (
          <DocGridCard
            key={spec.id}
            spec={spec}
            status={statusMap[spec.id]}
            onClick={() => onSelectDoc(spec.id)}
          />
        ))}
      </div>

      {optionalDocs.length > 0 && (
        <>
          <div className="px-[8px] mt-4">
            <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
              Optional Documents
            </h3>
            <p className="text-[12px] text-[#555]">
              Add when issued or available.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full px-[8px]">
            {optionalDocs.map((spec) => (
              <DocGridCard
                key={spec.id}
                spec={spec}
                status={statusMap[spec.id]}
                onClick={() => onSelectDoc(spec.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DocGridCard({
  spec,
  status,
  onClick,
}: {
  spec: DocSpec<unknown>
  status: CategoryStatusEntry | undefined
  onClick: () => void
}) {
  const isXlsx = spec.id === "boq-template" || spec.id === "pte"
  const Icon = isXlsx ? FileSpreadsheet : FileText
  const hasData =
    status?.jobStatus === "succeeded" || status?.isSaved || !!status?.boqImport
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-left rounded-xl border p-4 transition-colors ${
        hasData
          ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
          : "border-[#e0e0e0] bg-white hover:border-[#142845]/40 hover:bg-[#fafbfc]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
            hasData
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#142845]/5 text-[#142845]"
          }`}
        >
          {hasData ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Icon className="size-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-[#142845]">
              {spec.label}
            </p>
            <span className="text-[10px] uppercase tracking-wider text-[#888] bg-[#f3f4f5] px-1.5 py-0.5 rounded">
              {spec.shortLabel}
            </span>
          </div>
          <p className="text-[11px] text-[#888] mt-0.5">
            {hasData
              ? status?.boqImport
                ? `${status.boqImport.itemsCreated.toLocaleString()} items imported`
                : status?.addendaSummary
                  ? `${status.addendaSummary.addendaApplied} addenda · ${status.addendaSummary.eventsApplied} events`
                  : "Uploaded"
              : spec.required
                ? "Required · click to upload"
                : "Optional · click when issued"}
          </p>
        </div>
      </div>
    </button>
  )
}
