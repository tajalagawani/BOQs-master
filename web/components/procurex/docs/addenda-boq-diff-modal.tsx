"use client"

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Pencil,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  applyAddendaBoqDiff,
  previewAddendaBoqDiff,
} from "@/modules/procurex/addenda/actions"
import type { ProposedDiffEvent } from "@/modules/procurex/addenda/boq-diff"

/**
 * Focused diff modal — opens when the user uploads ONLY a revised BoQ
 * workbook on the Tender Addenda row. Shows only the items that
 * differ from the project's current effective BoQ (added / changed /
 * withdrawn). Each row has a checkbox; the user confirms which changes
 * apply, hits Apply, and the events are written against the entity ids.
 *
 * No raw JSON — every change rendered in plain language with the old
 * and new values side-by-side.
 */
export function AddendaBoqDiffModal({
  documentId,
  defaultName,
  onClose,
  onApplied,
}: {
  documentId: string
  defaultName?: string
  onClose: () => void
  onApplied: (summary: { addendumNo: string; eventsApplied: number }) => void
}) {
  const [loadState, setLoadState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | {
        kind: "ready"
        events: ProposedDiffEvent[]
        stats: { newRowCount: number; matched: number; unmatched: number; withdrawn: number }
        warnings: string[]
        filename: string
      }
  >({ kind: "loading" })

  /** Indices of events the user has confirmed. */
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set())
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await previewAddendaBoqDiff(documentId)
      if (cancelled) return
      if (!result.ok) {
        setLoadState({ kind: "error", message: result.error })
        return
      }
      setLoadState({
        kind: "ready",
        events: result.events,
        stats: result.stats,
        warnings: result.warnings,
        filename: result.filename,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [documentId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !applying) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, applying])

  const grouped = useMemo(() => {
    if (loadState.kind !== "ready") {
      return { changed: [], added: [], withdrawn: [] }
    }
    const changed: Array<[number, ProposedDiffEvent]> = []
    const added: Array<[number, ProposedDiffEvent]> = []
    const withdrawn: Array<[number, ProposedDiffEvent]> = []
    loadState.events.forEach((ev, i) => {
      if (ev.eventKind === "added") added.push([i, ev])
      else if (ev.eventKind === "withdrawn") withdrawn.push([i, ev])
      else changed.push([i, ev])
    })
    return { changed, added, withdrawn }
  }, [loadState])

  function toggle(i: number) {
    setConfirmed((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function selectAll() {
    if (loadState.kind !== "ready") return
    setConfirmed(new Set(loadState.events.map((_, i) => i)))
  }
  function clearAll() {
    setConfirmed(new Set())
  }

  async function applySelected() {
    if (loadState.kind !== "ready") return
    setApplying(true)
    setApplyError(null)
    try {
      const result = await applyAddendaBoqDiff({
        documentId,
        confirmedIndices: Array.from(confirmed).sort((a, b) => a - b),
      })
      if (!result.ok) {
        setApplyError(result.error)
        setApplying(false)
        return
      }
      onApplied({
        addendumNo: result.addendumNo,
        eventsApplied: result.eventsApplied,
      })
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err))
      setApplying(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-center p-6"
      onClick={applying ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-full shadow-xl border border-[#e9e9e9] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ececec]">
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="font-semibold text-[15px] text-[#142845]">
              Review BoQ changes
            </h3>
            <p className="text-[12px] text-[#666] truncate">
              {defaultName ?? "Addenda BoQ workbook"}
              {loadState.kind === "ready" && (
                <span className="ml-2 text-[#888]">
                  · {loadState.events.length} changes detected
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-[#f3f4f5] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4 text-[#555]" />
          </button>
        </div>

        {/* Body */}
        {loadState.kind === "loading" ? (
          <div className="flex-1 flex items-center justify-center text-[#666] p-10">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="text-sm">Diffing against the current BoQ…</span>
          </div>
        ) : loadState.kind === "error" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <AlertCircle className="size-6 text-red-500" />
            <p className="text-sm text-[#444] max-w-md text-center">
              {loadState.message}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg border border-[#e0e0e0]"
            >
              Close
            </button>
          </div>
        ) : loadState.events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10">
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="text-[14px] text-[#142845] font-medium">
              No differences detected
            </p>
            <p className="text-[12px] text-[#666] text-center max-w-md">
              The uploaded workbook matches the current BoQ item-for-item.
              Nothing to apply.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg border border-[#e0e0e0]"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-5 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] text-[#666]">
                <span className="mr-3">
                  ✏️ {grouped.changed.length} changed
                </span>
                <span className="mr-3 text-emerald-700">
                  + {grouped.added.length} new
                </span>
                <span className="text-red-700">
                  − {grouped.withdrawn.length} removed
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] px-2.5 py-1 rounded bg-[#142845]/5 text-[#142845] hover:bg-[#142845]/10"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] px-2.5 py-1 rounded hover:bg-[#fafafa] text-[#666]"
                >
                  Clear
                </button>
              </div>
            </div>

            {grouped.changed.length > 0 && (
              <DiffSection
                title="Changed items"
                color="amber"
                items={grouped.changed}
                confirmed={confirmed}
                onToggle={toggle}
              />
            )}
            {grouped.added.length > 0 && (
              <DiffSection
                title="New items"
                color="emerald"
                items={grouped.added}
                confirmed={confirmed}
                onToggle={toggle}
              />
            )}
            {grouped.withdrawn.length > 0 && (
              <DiffSection
                title="Removed items"
                color="red"
                items={grouped.withdrawn}
                confirmed={confirmed}
                onToggle={toggle}
              />
            )}
          </div>
        )}

        {/* Footer */}
        {loadState.kind === "ready" && loadState.events.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#ececec]">
            <div className="text-[12px] text-[#666] tabular-nums">
              {confirmed.size} of {loadState.events.length} changes selected
            </div>
            <div className="flex items-center gap-2">
              {applyError && (
                <span className="text-[12px] text-red-600 mr-2">
                  {applyError}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={applying}
                className="px-4 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applySelected}
                disabled={applying || confirmed.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#142845] hover:bg-[#0a1426] rounded-lg disabled:opacity-40"
              >
                {applying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Applying…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Apply {confirmed.size} change
                    {confirmed.size === 1 ? "" : "s"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DiffSection({
  title,
  color,
  items,
  confirmed,
  onToggle,
}: {
  title: string
  color: "amber" | "emerald" | "red"
  items: Array<[number, ProposedDiffEvent]>
  confirmed: Set<number>
  onToggle: (i: number) => void
}) {
  const headerColor =
    color === "amber"
      ? "text-amber-800 bg-amber-50"
      : color === "emerald"
        ? "text-emerald-800 bg-emerald-50"
        : "text-red-800 bg-red-50"

  return (
    <section className="mb-4">
      <h4
        className={`text-[11px] uppercase tracking-wider font-semibold ${headerColor} rounded px-2 py-1 inline-block mb-2`}
      >
        {title} · {items.length}
      </h4>
      <ul className="space-y-1.5">
        {items.map(([i, ev]) => (
          <li
            key={i}
            className="bg-[#fafbfc] border border-[#ececec] rounded-lg px-3 py-2"
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed.has(i)}
                onChange={() => onToggle(i)}
                className="mt-0.5 size-3.5 accent-[#142845]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] mb-0.5">
                  <span className="font-mono text-[#888]">
                    {ev.reference.sectionNo}/{ev.reference.itemLetter}
                  </span>
                  <EventKindBadge kind={ev.eventKind} />
                </div>
                <p
                  className="text-[12px] text-[#222] truncate"
                  title={ev.reference.label}
                >
                  {ev.reference.label}
                </p>
                <PayloadView event={ev} />
              </div>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EventKindBadge({ kind }: { kind: ProposedDiffEvent["eventKind"] }) {
  const cfg = (() => {
    switch (kind) {
      case "quantity_changed":
        return { label: "Quantity", icon: Pencil, color: "bg-amber-100 text-amber-800" }
      case "description_changed":
        return { label: "Description", icon: Pencil, color: "bg-amber-100 text-amber-800" }
      case "unit_changed":
        return { label: "Unit", icon: Pencil, color: "bg-amber-100 text-amber-800" }
      case "added":
        return { label: "New", icon: Plus, color: "bg-emerald-100 text-emerald-800" }
      case "withdrawn":
        return { label: "Removed", icon: Minus, color: "bg-red-100 text-red-800" }
    }
  })()
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color}`}
    >
      <Icon className="size-2.5" />
      {cfg.label}
    </span>
  )
}

function PayloadView({ event }: { event: ProposedDiffEvent }) {
  const p = event.payload as Record<string, unknown>
  if (event.eventKind === "quantity_changed") {
    return (
      <p className="mt-1 text-[11px] text-[#555]">
        <span className="line-through text-[#999]">{String(p.old ?? "—")}</span>{" "}
        <ArrowRight className="size-2.5 inline mb-0.5" />{" "}
        <span className="font-medium text-[#142845]">{String(p.new ?? "—")}</span>
      </p>
    )
  }
  if (event.eventKind === "description_changed") {
    return (
      <div className="mt-1 text-[11px] text-[#555] space-y-0.5">
        <div>
          <span className="text-[#888]">Was:</span>{" "}
          <span className="line-through text-[#999]">{String(p.old ?? "—")}</span>
        </div>
        <div>
          <span className="text-[#888]">Now:</span>{" "}
          <span className="text-[#142845]">{String(p.new ?? "—")}</span>
        </div>
      </div>
    )
  }
  if (event.eventKind === "unit_changed") {
    return (
      <p className="mt-1 text-[11px] text-[#555]">
        <span className="line-through text-[#999] font-mono">{String(p.old ?? "—")}</span>{" "}
        <ArrowRight className="size-2.5 inline mb-0.5" />{" "}
        <span className="font-medium text-[#142845] font-mono">{String(p.new ?? "—")}</span>
      </p>
    )
  }
  if (event.eventKind === "added") {
    return (
      <p className="mt-1 text-[11px] text-[#555]">
        Qty {String(p.quantity ?? "—")} · Unit {String(p.unit ?? "—")}
      </p>
    )
  }
  if (event.eventKind === "withdrawn") {
    return (
      <p className="mt-1 text-[11px] text-[#a33]">
        {String(p.reason ?? "Removed from replacement workbook")}
      </p>
    )
  }
  return null
}
