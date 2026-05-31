"use client"

import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Paperclip,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  importAddenda,
  parseAddendaDocument,
  type AddendumPreview,
  type AddendumPreviewQuery,
  type ConfirmedQueryInput,
} from "@/modules/procurex/addenda/actions"
import type { ProposedEvent } from "@/modules/procurex/addenda/event-detector"

/**
 * Full-screen Tender Addenda modal.
 *
 * Three-pane layout:
 *   Left   – timeline of addenda detected in the uploaded zip
 *   Center – the active addendum's cover summary + query list with
 *            checkboxes for each detected event
 *   Right  – attached files manifest
 *
 * No raw JSON anywhere — every event is rendered as a plain-English
 * line item.
 */
export function AddendaModal({
  documentId,
  defaultName,
  onClose,
  onImported,
}: {
  documentId: string
  defaultName?: string
  onClose: () => void
  onImported: (summary: { addendaCreated: number; eventsApplied: number }) => void
}) {
  const [loadState, setLoadState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; addenda: AddendumPreview[]; warnings: string[] }
  >({ kind: "loading" })
  const [activeFolder, setActiveFolder] = useState<string | null>(null)

  /** Per-addendum, per-query, per-event index: are we going to apply it? */
  const [confirmedEvents, setConfirmedEvents] = useState<
    Map<string, Set<number>>
  >(new Map())

  // Per-addendum state: which one is being applied right now, which
  // have already been applied, and any per-addendum errors.
  const [importingFolder, setImportingFolder] = useState<string | null>(null)
  const [appliedSummaries, setAppliedSummaries] = useState<
    Map<string, { eventsApplied: number; filesRecorded: number }>
  >(new Map())
  const [perAddendumErrors, setPerAddendumErrors] = useState<
    Map<string, string>
  >(new Map())
  const importing = importingFolder !== null

  // Parse on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await parseAddendaDocument(documentId)
        if (cancelled) return
        if (!result.ok) {
          setLoadState({ kind: "error", message: result.error })
          return
        }
        setLoadState({
          kind: "ready",
          addenda: result.addenda,
          warnings: result.warnings,
        })
        setActiveFolder(result.addenda[0]?.folder ?? null)
      } catch (err) {
        if (!cancelled) {
          setLoadState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [documentId])

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importing) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, importing])

  const activeAddendum = useMemo(() => {
    if (loadState.kind !== "ready" || !activeFolder) return null
    return loadState.addenda.find((a) => a.folder === activeFolder) ?? null
  }, [loadState, activeFolder])

  const totalEvents = useMemo(() => {
    if (loadState.kind !== "ready") return 0
    let n = 0
    for (const a of loadState.addenda)
      for (const q of a.queries) n += q.detectedEvents.length
    return n
  }, [loadState])

  const totalConfirmed = useMemo(() => {
    let n = 0
    for (const set of confirmedEvents.values()) n += set.size
    return n
  }, [confirmedEvents])

  function keyFor(folder: string, queryNo: string): string {
    return `${folder}::${queryNo}`
  }

  function toggleEvent(folder: string, queryNo: string, evIndex: number) {
    setConfirmedEvents((prev) => {
      const next = new Map(prev)
      const k = keyFor(folder, queryNo)
      const set = new Set(next.get(k) ?? [])
      if (set.has(evIndex)) set.delete(evIndex)
      else set.add(evIndex)
      next.set(k, set)
      return next
    })
  }

  function selectAllForAddendum(folder: string) {
    if (loadState.kind !== "ready") return
    const a = loadState.addenda.find((x) => x.folder === folder)
    if (!a) return
    setConfirmedEvents((prev) => {
      const next = new Map(prev)
      for (const q of a.queries) {
        if (q.detectedEvents.length === 0) continue
        if (!q.resolvedItemId) continue
        const set = new Set<number>()
        for (let i = 0; i < q.detectedEvents.length; i += 1) set.add(i)
        next.set(keyFor(folder, q.no), set)
      }
      return next
    })
  }

  function clearAllForAddendum(folder: string) {
    setConfirmedEvents((prev) => {
      const next = new Map(prev)
      for (const k of Array.from(next.keys())) {
        if (k.startsWith(`${folder}::`)) next.delete(k)
      }
      return next
    })
  }

  /** Run ONE addendum: send only its confirmed events to the importer.
   *  The user processes addenda one-by-one, in any order, instead of a
   *  single bulk import. After all the addenda the user wants are
   *  applied, the modal totals everything up via onImported. */
  async function runAddendum(folder: string) {
    if (loadState.kind !== "ready") return
    const target = loadState.addenda.find((a) => a.folder === folder)
    if (!target) return

    setImportingFolder(folder)
    setPerAddendumErrors((prev) => {
      const next = new Map(prev)
      next.delete(folder)
      return next
    })

    const confirmedQueries: ConfirmedQueryInput[] = target.queries.map((q) => {
      const set = confirmedEvents.get(keyFor(target.folder, q.no)) ?? new Set()
      const confirmedEvts = Array.from(set)
        .sort((x, y) => x - y)
        .map((i) => q.detectedEvents[i])
        .filter((ev): ev is ProposedEvent => Boolean(ev))
        .map((ev) => ({ eventKind: ev.eventKind, payload: ev.payload }))
      return {
        no: q.no,
        resolvedItemId: q.resolvedItemId,
        confirmedEvents: confirmedEvts,
      }
    })

    try {
      const result = await importAddenda({
        documentId,
        addenda: [{ folder: target.folder, confirmedQueries }],
      })
      if (!result.ok) {
        setPerAddendumErrors((prev) => {
          const next = new Map(prev)
          next.set(folder, result.error)
          return next
        })
      } else {
        setAppliedSummaries((prev) => {
          const next = new Map(prev)
          next.set(folder, {
            eventsApplied: result.eventsApplied,
            filesRecorded: result.filesRecorded,
          })
          return next
        })
      }
    } catch (err) {
      setPerAddendumErrors((prev) => {
        const next = new Map(prev)
        next.set(folder, err instanceof Error ? err.message : String(err))
        return next
      })
    } finally {
      setImportingFolder(null)
    }
  }

  /** Called when the user clicks "Done" — bubble the totals up. */
  function finish() {
    let addendaCreated = 0
    let eventsApplied = 0
    for (const s of appliedSummaries.values()) {
      addendaCreated += 1
      eventsApplied += s.eventsApplied
    }
    onImported({ addendaCreated, eventsApplied })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-center p-4"
      onClick={importing ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#fafbfc] rounded-2xl w-full max-w-[1500px] h-full shadow-xl border border-[#e9e9e9] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ececec] bg-white rounded-t-2xl">
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="font-semibold text-[16px] text-[#142845]">
              Add Tender Addenda
            </h3>
            <p className="text-[12px] text-[#666] truncate">
              Process each addendum one at a time. Click{" "}
              <span className="font-medium">Run</span> on the addendum in the
              sidebar to apply its confirmed events.
              {defaultName ? ` · ${defaultName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-[#f3f4f5] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4 text-[#555]" />
          </button>
        </div>

        {loadState.kind === "loading" ? (
          <div className="flex-1 flex items-center justify-center text-[#666]">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="text-sm">
              Unpacking zip and reading addenda cover pages…
            </span>
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
        ) : loadState.addenda.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#888]">
            No addenda found in this zip.
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-[260px_1fr_320px] min-h-0">
            {/* Timeline sidebar */}
            <aside className="border-r border-[#ececec] bg-white flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-[#f0f0f0]">
                <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#888]">
                  Addenda · {loadState.addenda.length}
                </h4>
              </div>
              <ul className="flex-1 overflow-auto py-2 space-y-0.5">
                {loadState.addenda.map((a) => {
                  const isActive = activeFolder === a.folder
                  const isApplied = appliedSummaries.has(a.folder)
                  const isRunning = importingFolder === a.folder
                  const error = perAddendumErrors.get(a.folder)
                  const confirmedCount = Array.from(
                    confirmedEvents.entries(),
                  ).reduce(
                    (acc, [k, set]) =>
                      k.startsWith(`${a.folder}::`) ? acc + set.size : acc,
                    0,
                  )
                  return (
                    <li key={a.folder}>
                      <div
                        className={`px-4 py-2 ${
                          isActive ? "bg-[#142845]/5" : ""
                        } ${isApplied ? "opacity-70" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFolder(a.folder)}
                          className="w-full flex items-start gap-2 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-[#142845]">
                                {a.no ?? a.folder}
                              </span>
                              {isApplied && (
                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                              )}
                              {confirmedCount > 0 && !isApplied && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                                  {confirmedCount} pending
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#888] flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {a.issuedIso ?? "(date unknown)"}
                            </div>
                            <div className="text-[11px] text-[#999] mt-0.5">
                              {summarizeScope(a.scopeSummary)}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => runAddendum(a.folder)}
                          disabled={isApplied || importing}
                          className={`mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded ${
                            isApplied
                              ? "bg-emerald-50 text-emerald-700 cursor-default"
                              : isRunning
                                ? "bg-[#142845]/10 text-[#142845]"
                                : "bg-[#142845] text-white hover:bg-[#0e1d34] disabled:opacity-40"
                          }`}
                        >
                          {isRunning ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              Running…
                            </>
                          ) : isApplied ? (
                            <>
                              <Check className="size-3" />
                              Applied · {appliedSummaries.get(a.folder)?.eventsApplied} events
                            </>
                          ) : (
                            <>Run {a.no ?? "addendum"}</>
                          )}
                        </button>
                        {error && (
                          <p className="mt-1 text-[10px] text-red-700">{error}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="px-4 py-3 border-t border-[#f0f0f0] text-[11px] tabular-nums">
                <div className="flex justify-between text-[#666]">
                  <span>Detected events</span>
                  <span>{totalEvents}</span>
                </div>
                <div className="flex justify-between font-medium text-[#142845]">
                  <span>Confirmed</span>
                  <span>{totalConfirmed}</span>
                </div>
              </div>
            </aside>

            {/* Detail pane */}
            <main className="overflow-auto bg-[#fafbfc] min-h-0">
              {activeAddendum ? (
                <AddendumDetail
                  addendum={activeAddendum}
                  confirmedEvents={confirmedEvents}
                  onToggleEvent={(qNo, idx) =>
                    toggleEvent(activeAddendum.folder, qNo, idx)
                  }
                  onSelectAll={() => selectAllForAddendum(activeAddendum.folder)}
                  onClearAll={() => clearAllForAddendum(activeAddendum.folder)}
                />
              ) : null}
            </main>

            {/* Right pane — attached files */}
            <aside className="border-l border-[#ececec] bg-white flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center gap-2">
                <Paperclip className="size-3.5 text-[#888]" />
                <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#888]">
                  Files
                </h4>
              </div>
              <ul className="flex-1 overflow-auto py-2 space-y-0.5">
                {activeAddendum?.files.map((f) => (
                  <li
                    key={f.relativePath}
                    className="px-4 py-2 flex items-start gap-2 text-[12px]"
                  >
                    <FileText className="size-3.5 text-[#888] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12px] text-[#222] truncate"
                        title={f.filename}
                      >
                        {f.filename}
                      </p>
                      <p className="text-[10px] text-[#888] tabular-nums">
                        {(f.sizeBytes / 1024).toFixed(0)} KB ·{" "}
                        <span className="uppercase">{f.kind}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}

        {/* Footer — process is per-addendum (Run button on each row in
            the sidebar); this bar just summarises and lets the user
            close when finished. */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#ececec] bg-white rounded-b-2xl">
          <div className="text-[12px] text-[#666] tabular-nums">
            {loadState.kind === "ready" && (
              <span>
                {loadState.addenda.length} addenda · {totalEvents} events
                detected ·{" "}
                <span className="font-medium text-emerald-700">
                  {appliedSummaries.size} applied
                </span>
                {totalConfirmed > 0 && (
                  <>
                    {" · "}
                    <span className="text-amber-700">
                      {totalConfirmed} pending confirmations
                    </span>
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={importing || appliedSummaries.size === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#142845] hover:bg-[#0a1426] rounded-lg disabled:opacity-40"
            >
              <Check className="size-4" />
              Done · close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// AddendumDetail
// ──────────────────────────────────────────────────────────────────────

function AddendumDetail({
  addendum,
  confirmedEvents,
  onToggleEvent,
  onSelectAll,
  onClearAll,
}: {
  addendum: AddendumPreview
  confirmedEvents: Map<string, Set<number>>
  onToggleEvent: (queryNo: string, eventIndex: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}) {
  return (
    <div className="px-5 py-4">
      {/* Cover summary */}
      <header className="mb-4">
        <h2 className="text-[15px] font-semibold text-[#142845]">
          {addendum.no ?? addendum.folder}
        </h2>
        <p className="text-[11px] text-[#888]">
          {addendum.issuedIso ?? "Date unknown"} · {addendum.totalPages} page
          {addendum.totalPages === 1 ? "" : "s"} ·{" "}
          {addendum.sections.length} section
          {addendum.sections.length === 1 ? "" : "s"}
        </p>
        <p className="text-[11px] text-[#888] mt-1">
          {summarizeScope(addendum.scopeSummary)}
        </p>
        {addendum.introText && (
          <details className="mt-2">
            <summary className="text-[11px] text-[#142845] cursor-pointer">
              View introduction
            </summary>
            <p className="mt-1 text-[11px] text-[#444] whitespace-pre-wrap leading-snug bg-[#fafbfc] border border-[#ececec] rounded px-3 py-2 max-h-[140px] overflow-auto">
              {addendum.introText}
            </p>
          </details>
        )}
      </header>

      {/* Sections from index */}
      {addendum.sections.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#888] mb-1">
            Index
          </h3>
          <ul className="text-[11px] text-[#444] space-y-0.5">
            {addendum.sections.map((s) => (
              <li key={s.no} className="flex items-center gap-2">
                <span className="font-mono text-[#888] tabular-nums w-4">
                  {s.no}
                </span>
                <span className="flex-1">{s.title}</span>
                {s.pageRef && (
                  <span className="text-[#aaa] tabular-nums">p. {s.pageRef}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tenderer queries */}
      {addendum.queries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#888]">
              Tenderer queries · {addendum.queries.length}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-[11px] px-2 py-1 rounded bg-[#142845]/5 text-[#142845] hover:bg-[#142845]/10"
              >
                Select detected
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] px-2 py-1 rounded hover:bg-[#fafafa] text-[#666]"
              >
                Clear
              </button>
            </div>
          </div>
          <ol className="space-y-2">
            {addendum.queries.map((q) => (
              <QueryCard
                key={q.no}
                query={q}
                confirmed={
                  confirmedEvents.get(`${addendum.folder}::${q.no}`) ?? new Set()
                }
                onToggle={(idx) => onToggleEvent(q.no, idx)}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function QueryCard({
  query,
  confirmed,
  onToggle,
}: {
  query: AddendumPreviewQuery
  confirmed: Set<number>
  onToggle: (eventIndex: number) => void
}) {
  const [open, setOpen] = useState(false)
  const hasEvents = query.detectedEvents.length > 0
  const isResolved = query.resolvedItemId !== null

  return (
    <li className="bg-white border border-[#ececec] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 flex items-start gap-2 text-left hover:bg-[#fafbfc]"
      >
        {open ? (
          <ChevronDown className="size-3.5 mt-0.5 text-[#888]" />
        ) : (
          <ChevronRight className="size-3.5 mt-0.5 text-[#888]" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#888]">Q{query.no}</span>
            {isResolved ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                <CheckCircle2 className="size-2.5" />
                resolved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                <AlertTriangle className="size-2.5" />
                unresolved
              </span>
            )}
            {hasEvents && (
              <span className="text-[10px] text-[#142845] tabular-nums ml-auto">
                {confirmed.size}/{query.detectedEvents.length} confirmed
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#222] mt-1 line-clamp-2">
            {query.queryText || "(query text not captured)"}
          </p>
          {query.referenceRaw && (
            <p className="text-[10px] text-[#888] font-mono mt-0.5 truncate">
              ref: {query.referenceRaw}
            </p>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-[#f3f4f5] px-3 py-2 space-y-2">
          {query.responseText && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#888] font-semibold">
                Consultant response
              </p>
              <p className="text-[12px] text-[#222] whitespace-pre-wrap leading-snug">
                {query.responseText}
              </p>
            </div>
          )}
          {hasEvents ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#888] font-semibold">
                Proposed events
              </p>
              <ul className="mt-1 space-y-1">
                {query.detectedEvents.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={confirmed.has(i)}
                      disabled={!isResolved}
                      onChange={() => onToggle(i)}
                      className="mt-0.5 size-3.5 accent-[#142845] disabled:opacity-40"
                    />
                    <div className="flex-1">
                      <div className="text-[#142845] font-medium">
                        {prettyEventLabel(ev)}
                      </div>
                      <div className="text-[10px] text-[#888] italic line-clamp-1">
                        “{ev.evidence}”
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {!isResolved && (
                <p className="mt-1 text-[10px] text-amber-700">
                  Events can&apos;t be applied — the query reference didn&apos;t
                  resolve to a BoQ item.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#888] italic">
              No structural events detected — the response looks informational.
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function prettyEventLabel(ev: ProposedEvent): string {
  switch (ev.eventKind) {
    case "withdrawn":
      return ev.substitution
        ? `Withdraw item · substitute with ${ev.substitution.newLabel}`
        : "Withdraw item"
    case "description_changed":
      return `Change description to “${trim(ev.payload.new)}”`
    case "quantity_changed":
      return `Change quantity to ${trim(ev.payload.new)}`
    case "note":
      return "Add note"
  }
}

function trim(v: unknown, max = 60): string {
  const s = typeof v === "string" ? v : String(v ?? "")
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function summarizeScope(scope: Record<string, boolean>): string {
  const labels: string[] = []
  if (scope.boqReplaceFull) labels.push("BoQ fully replaced")
  if (scope.boqReplacePartial) labels.push("BoQ pages replaced")
  if (scope.soprAmend) labels.push("SOPR amended")
  if (scope.specAmend) labels.push("Specifications amended")
  if (scope.drawingsAmend) labels.push("Drawings amended")
  if (scope.tqResponses) labels.push("Tenderer queries")
  return labels.length > 0 ? labels.join(" · ") : "Cover only"
}
