"use client"

import type { Selection } from "react-aria-components"

import { Button, Chip, Separator, Tooltip } from "@heroui/react"
import { ActionBar, ListView } from "@heroui-pro/react"
import {
  Activity,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  killAllJobsForProject,
  killJobsForCategory,
  resetCategoryForProject,
} from "@/modules/ai-extraction/queue/actions"
import {
  type CategoryStatusEntry,
  type LiveStatusEntry,
  getCategoryStatuses,
  getLiveStatuses,
} from "@/modules/ai-extraction/queue"

import { useProjectExtractionStream } from "./use-extraction-stream"

interface AgentQueueWidgetProps {
  projectId: string | null
}

const LIVE_STATUSES = new Set(["queued", "claimed", "running"])

/**
 * Floating extraction-agent widget. Closed = pill button; open = full-height
 * right-side panel built on HeroUI Pro ListView + ActionBar:
 *
 *   - ListView selectionMode="multiple" — user picks rows.
 *   - ActionBar appears at the bottom when ≥1 row selected, exposing
 *     Kill / Reset / Clear.
 *   - Header has a global "Kill all" that targets every live job.
 */
export function AgentQueueWidget({ projectId }: AgentQueueWidgetProps) {
  const [open, setOpen] = useState(false)
  const [statuses, setStatuses] = useState<CategoryStatusEntry[]>([])
  const [live, setLive] = useState<LiveStatusEntry[]>([])
  const [selected, setSelected] = useState<Selection>(new Set())
  const sse = useProjectExtractionStream(projectId)

  // Cheap, always-on poll — drives the closed-pill badge + status counts
  // without the heavy getCategoryStatuses hit. Fast (3s) while work is live.
  useEffect(() => {
    if (!projectId) return
    let stopped = false
    let timer: number | undefined
    const poll = async () => {
      try {
        const l = await getLiveStatuses(projectId)
        if (stopped) return
        setLive(l)
        const active = l.some((e) => LIVE_STATUSES.has(e.jobStatus))
        timer = window.setTimeout(poll, active ? 3000 : 15000)
      } catch {
        if (!stopped) timer = window.setTimeout(poll, 15000)
      }
    }
    void poll()
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [projectId])

  // Heavy fetch (filenames + cost totals) only while the panel is open.
  useEffect(() => {
    if (!projectId || !open) return
    let stopped = false
    const fetchOnce = async () => {
      try {
        const entries = await getCategoryStatuses(projectId)
        if (!stopped) setStatuses(entries)
      } catch {
        /* ignore */
      }
    }
    void fetchOnce()
    const interval = window.setInterval(fetchOnce, 6000)
    return () => {
      stopped = true
      window.clearInterval(interval)
    }
  }, [projectId, open])

  // Merge: cheap live status is the source of truth for state/progress; the
  // heavy snapshot enriches with filename + cost when the panel is open.
  const byCat = useMemo(() => {
    const m = new Map<string, CategoryStatusEntry>()
    for (const s of statuses) m.set(s.categoryId, s)
    return m
  }, [statuses])

  const rows = useMemo(() => {
    return live
      .filter((e) => e.jobStatus !== "none")
      .map((e) => {
        const full = byCat.get(e.categoryId)
        const entry: CategoryStatusEntry = {
          categoryId: e.categoryId,
          documentId: e.documentId,
          filename: full?.filename ?? null,
          jobStatus: e.jobStatus,
          lastError: e.lastError,
          workflowRunId: e.workflowRunId,
          verdict: full?.verdict ?? null,
          isSaved: full?.isSaved ?? false,
          runTotals: full?.runTotals ?? null,
          progress: e.progress ?? full?.progress ?? null,
          boqImport: full?.boqImport ?? null,
          addendaSummary: full?.addendaSummary ?? null,
        }
        const sseLive = e.documentId ? sse.liveByDoc.get(e.documentId) : undefined
        return { entry, live: sseLive }
      })
  }, [live, byCat, sse.tick, sse.liveByDoc])

  const inFlight = live.filter((e) => LIVE_STATUSES.has(e.jobStatus))
  // Queue summary counts for the footer.
  const counts = useMemo(() => {
    const c = { queued: 0, running: 0, succeeded: 0, failed: 0 }
    for (const e of live) {
      if (e.jobStatus === "queued") c.queued++
      else if (e.jobStatus === "claimed" || e.jobStatus === "running") c.running++
      else if (e.jobStatus === "succeeded") c.succeeded++
      else if (e.jobStatus === "failed") c.failed++
    }
    return c
  }, [live])

  // Selection-aware action handlers
  const selectedRows = useMemo(() => {
    if (selected === "all") return rows
    if (selected instanceof Set) {
      return rows.filter((r) => selected.has(r.entry.categoryId))
    }
    return []
  }, [rows, selected])
  const selectionCount = selectedRows.length

  async function bulkKill() {
    if (!projectId) return
    if (!window.confirm(`Kill ${selectionCount} job(s)?`)) return
    await Promise.all(
      selectedRows
        .filter((r) => LIVE_STATUSES.has(r.entry.jobStatus))
        .map((r) =>
          killJobsForCategory({
            projectId,
            category: r.entry.categoryId,
          }),
        ),
    )
    setSelected(new Set())
  }

  async function bulkReset() {
    if (!projectId) return
    if (!window.confirm(`Reset & re-extract ${selectionCount} doc(s)?`)) return
    await Promise.all(
      selectedRows.map((r) =>
        resetCategoryForProject({
          projectId,
          category: r.entry.categoryId,
        }),
      ),
    )
    setSelected(new Set())
  }

  async function killAll() {
    if (!projectId) return
    if (
      !window.confirm(
        `Kill all ${inFlight.length} running job(s) in this project?`,
      )
    )
      return
    await killAllJobsForProject({ projectId })
  }

  if (!projectId) return null

  // ───── Closed pill ─────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-full bg-[#142845] text-white px-4 py-2.5 shadow-lg hover:bg-[#0a1426] transition-shadow hover:shadow-xl"
        title="Show agent queue"
      >
        <Activity className="size-4" />
        <span className="text-[12px] font-medium">Agent</span>
        {inFlight.length > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-semibold">
            {inFlight.length}
          </span>
        ) : null}
      </button>
    )
  }

  // ───── Open panel ─────
  return (
    <div className="fixed top-[4px] right-[4px] bottom-[4px] z-[100] w-[400px] bg-white rounded-[16px] shadow-2xl border border-[#e9e9e9] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[#142845]" />
          <h3 className="font-semibold text-[14px] text-[#142845]">
            Extraction Agent
          </h3>
          {inFlight.length > 0 ? (
            <Chip className="shrink-0 tabular-nums" size="sm" color="success">
              {inFlight.length} live
            </Chip>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            isDisabled={inFlight.length === 0}
            size="sm"
            variant="ghost"
            className="text-danger"
            onPress={killAll}
            aria-label="Kill all running jobs"
          >
            <Trash2 className="size-3.5" />
            <span>Kill all</span>
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => setOpen(false)}
            aria-label="Minimise"
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </div>

      {/* List + ActionBar — single container. The `transform: translateZ(0)`
          turns this div into the containing block for any descendant
          `position: fixed` element (CSS spec) — so HeroUI ActionBar's
          default `position:fixed; bottom:24px` anchors to THIS panel
          instead of the viewport. No other positioning hacks needed. */}
      <div
        className="flex-1 overflow-auto px-2 py-2"
        style={{ transform: "translateZ(0)" }}
      >
        {rows.length === 0 ? (
          <div className="text-[12px] text-[#888] italic text-center py-8">
            No agent activity yet. Drop a document to start.
          </div>
        ) : (
          <ListView
            aria-label="Extraction agent jobs"
            items={rows.map((r) => ({
              id: r.entry.categoryId,
              entry: r.entry,
              live: r.live,
            }))}
            selectedKeys={selected}
            selectionMode="multiple"
            onSelectionChange={setSelected}
            className="!bg-transparent !p-0 !border-0 [&_[data-slot=item]]:!border-0"
          >
            {(item) => {
              const e = (item as { entry: CategoryStatusEntry }).entry
              const live = (
                item as {
                  live?: {
                    iteration: number
                    maxIterations: number
                    lastAction: string
                  }
                }
              ).live
              const isLive = LIVE_STATUSES.has(e.jobStatus)
              const lastAction = live?.lastAction ?? e.progress?.lastAction ?? null
              const iter = live?.iteration ?? e.progress?.iteration ?? 0
              const maxIter = live?.maxIterations ?? e.progress?.maxIterations ?? 1
              const pct =
                maxIter > 0 ? Math.min(100, Math.round((iter / maxIter) * 100)) : 0
              const cost = e.runTotals?.estimated_cost_usd ?? null
              const Icon =
                e.filename?.toLowerCase().endsWith(".xlsx") ||
                e.categoryId === "boq-template"
                  ? FileSpreadsheet
                  : FileText
              return (
                <ListView.Item id={e.categoryId} textValue={e.filename ?? e.categoryId}>
                  <ListView.ItemContent>
                    <Icon className="size-4 text-[#888]" />
                    <div className="flex min-w-0 flex-col">
                      <ListView.Title
                        className="!text-[11px] !whitespace-normal !overflow-visible !leading-tight break-words"
                        style={{ textOverflow: "clip" }}
                      >
                        {e.filename ?? e.categoryId}
                      </ListView.Title>
                      <ListView.Description className="!text-[10px]">
                        <span className="font-mono">{e.categoryId}</span>
                        {" · "}
                        <span
                          className={
                            e.jobStatus === "succeeded"
                              ? "text-emerald-600 font-medium"
                              : e.jobStatus === "failed"
                                ? "text-[#c32a4f] font-medium"
                                : "text-[#142845] font-medium"
                          }
                        >
                          {e.jobStatus}
                        </span>
                        {lastAction ? <> · {lastAction}</> : null}
                        {e.jobStatus === "failed" && e.lastError ? (
                          <span
                            className="mt-0.5 block truncate text-[10px] text-[#c32a4f]"
                            title={e.lastError}
                          >
                            ⚠ {e.lastError}
                          </span>
                        ) : null}
                        {isLive ? (
                          <span className="mt-1 flex items-center gap-2">
                            <span className="flex-1 h-1 bg-[#e9e9e9] rounded-full overflow-hidden">
                              <span
                                className="block h-full bg-[#142845] transition-[width]"
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="text-[10px] font-mono text-[#888] shrink-0">
                              {iter}/{maxIter}
                            </span>
                          </span>
                        ) : null}
                        {cost !== null ? (
                          <span className="text-[10px] font-mono text-[#888] mt-0.5 block">
                            {e.runTotals?.cached
                              ? "cached · $0.00"
                              : `$${cost.toFixed(3)}`}
                          </span>
                        ) : null}
                      </ListView.Description>
                    </div>
                  </ListView.ItemContent>
                </ListView.Item>
              )
            }}
          </ListView>
        )}

        {/* Selection-driven ActionBar — overridden to absolute so it stays
            inside this scroll container rather than floating to the viewport
            bottom (HeroUI default = position:fixed). */}
        <ActionBar aria-label="Agent actions" isOpen={selectionCount > 0}>
          <ActionBar.Prefix>
            <Chip className="shrink-0 tabular-nums" size="sm">
              {selectionCount}
            </Chip>
          </ActionBar.Prefix>
          <Separator />
          <ActionBar.Content>
            <Button
              aria-label="Reset & re-extract"
              size="sm"
              variant="ghost"
              onPress={bulkReset}
            >
              <RotateCcw />
              <span className="action-bar__label">Reset</span>
            </Button>
            <Separator orientation="vertical" />
            <Button
              aria-label="Kill"
              className="text-danger bg-danger/10"
              size="sm"
              variant="ghost"
              isDisabled={
                !selectedRows.some((r) => LIVE_STATUSES.has(r.entry.jobStatus))
              }
              onPress={bulkKill}
            >
              <Trash2 />
              <span className="action-bar__label">Kill</span>
            </Button>
          </ActionBar.Content>
          <Separator />
          <ActionBar.Suffix>
            <Tooltip>
              <Button
                isIconOnly
                aria-label="Clear selection"
                size="sm"
                variant="ghost"
                onPress={() => setSelected(new Set())}
              >
                <X />
              </Button>
              <Tooltip.Content>Clear selection</Tooltip.Content>
            </Tooltip>
          </ActionBar.Suffix>
        </ActionBar>
      </div>

      <div className="px-4 py-2 border-t border-[#f0f0f0] flex items-center justify-between text-[10px] text-[#888]">
        <div className="flex items-center gap-2 tabular-nums">
          {counts.running > 0 && (
            <span className="text-[#142845] font-medium">{counts.running} running</span>
          )}
          {counts.queued > 0 && <span>{counts.queued} queued</span>}
          {counts.succeeded > 0 && <span className="text-emerald-600">{counts.succeeded} done</span>}
          {counts.failed > 0 && <span className="text-[#c32a4f]">{counts.failed} failed</span>}
          {counts.running + counts.queued + counts.succeeded + counts.failed === 0 && (
            <span>idle</span>
          )}
        </div>
        <span>{rows.length} job(s)</span>
      </div>
    </div>
  )
}
