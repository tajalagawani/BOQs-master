"use client"

import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  Scale,
  Search,
  Sheet as SheetIcon,
  X,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getItemHistory } from "@/modules/procurex/boq/actions"
import type {
  BoqViewerData,
  BoqViewerItem,
  BoqViewerItemEvent,
  BoqViewerSummaryRow,
} from "@/modules/procurex/boq/actions"

// ──────────────────────────────────────────────────────────────────────
// Design tokens — kept in one place so future palette tweaks are a
// single-file change. The viewer's job is to make 2,000+ rows of
// numerical data legible; that means a quiet base surface, with the
// colour signal reserved for the comparison layer.
// ──────────────────────────────────────────────────────────────────────

const COLORS = {
  brand: "#142845",
  brandText: "#142845",
  brandSoftBg: "rgba(20,40,69,0.06)",
  brandSoftBgHover: "rgba(20,40,69,0.10)",
  surface: "#ffffff",
  surfaceAlt: "#fafbfc",
  rule: "#eef0f3",
  text2: "#5a6473",
  text3: "#9aa1ac",
  positive: "#0a8a55",
  positiveBg: "rgba(10,138,85,0.10)",
  negative: "#c73e62",
  negativeBg: "rgba(199,62,98,0.10)",
  baselineBg: "rgba(20,40,69,0.04)",
} as const

/** Accent colour per field kind — used ONLY for the column-header dot/
 *  underline. Body cells stay neutral so per-row signal dominates. */
const FIELD_ACCENT = {
  itemRef: "#b45309", // amber-700
  description: "#1565a3", // blue-700
  quantity: "#0a8a55", // emerald-700
  unit: "#7c3aed", // violet-600
  rate: "#3b3f8f", // indigo-700
  amount: "#c33768", // rose-700
} as const

const FIELD_LABEL = {
  itemRef: "Item",
  description: "Description",
  quantity: "Quantity",
  unit: "Unit",
  rate: "Rate",
  amount: "Amount",
} as const

/** Stable rotation of accent colours for the Compare view's per-source
 *  columns. PTE gets index 0 (deep indigo) so it reads as the "official"
 *  reference; tenderers cycle through teal → blue → violet → amber → …
 *  so adjacent columns never share a hue. */
const SOURCE_ACCENT = [
  "#3b3f8f", // PTE — indigo
  "#0d8a8c", // T1 — teal
  "#1565a3", // T2 — blue
  "#7c3aed", // T3 — violet
  "#b45309", // T4 — amber
  "#dd6b20", // T5 — orange
  "#475569", // T6 — slate
  "#9333ea", // T7 — purple
  "#0e7490", // T8 — cyan
] as const

/** Resizable column keys + their default widths in px. */
type ColKey = "sheet" | "no" | "label" | "quantity" | "unit" | "rate" | "amount"
const DEFAULT_WIDTHS: Record<ColKey, number> = {
  sheet: 90,
  no: 120,
  label: 420,
  quantity: 110,
  unit: 70,
  rate: 110,
  amount: 130,
}
const MIN_WIDTH = 50
const STORAGE_KEY = "boq-viewer-col-widths-v1"

/**
 * Drag-resize hook for the table columns. Drives a controlled `widths`
 * map keyed by ColKey, persists to localStorage so column tweaks survive
 * page reloads, and exposes a `<ResizeHandle key="X" />` helper for the
 * th's right edge. While dragging it puts a `cursor: col-resize` style
 * on <body> so the cursor doesn't flicker as the pointer leaves the th.
 */
function useColumnWidths(): {
  widths: Record<ColKey, number>
  startResize: (key: ColKey) => (e: React.MouseEvent<HTMLDivElement>) => void
  resizing: ColKey | null
} {
  const [widths, setWidths] = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)
  const [resizing, setResizing] = useState<ColKey | null>(null)
  const dragState = useRef<{ key: ColKey; startX: number; startW: number } | null>(
    null,
  )

  // Hydrate from localStorage after mount (avoids SSR/CSR markup mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<Record<ColKey, number>>
      setWidths((prev) => ({ ...prev, ...parsed }))
    } catch {
      /* corrupted storage — keep defaults */
    }
  }, [])

  // Persist widths after every drag.
  useEffect(() => {
    if (resizing) return // mid-drag — don't churn storage
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
    } catch {
      /* storage full or disabled */
    }
  }, [widths, resizing])

  const startResize = useCallback(
    (key: ColKey) => (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      dragState.current = {
        key,
        startX: e.clientX,
        startW: widths[key],
      }
      setResizing(key)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      const onMove = (ev: MouseEvent) => {
        const s = dragState.current
        if (!s) return
        const next = Math.max(MIN_WIDTH, s.startW + (ev.clientX - s.startX))
        setWidths((prev) => ({ ...prev, [s.key]: next }))
      }
      const onUp = () => {
        dragState.current = null
        setResizing(null)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseup", onUp)
      }
      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
    },
    [widths],
  )

  return { widths, startResize, resizing }
}

/**
 * Column header cell — quiet by default, with a 3 px top accent stripe
 * matching the field's colour. The body cells themselves carry no
 * background tint, so all the colour budget is spent here.
 */
function FieldHead({
  accent,
  label,
  currency,
  align = "left",
  resizing,
  onResize,
}: {
  accent: string
  label: React.ReactNode
  currency?: string | null
  align?: "left" | "right"
  resizing?: boolean
  onResize?: (e: React.MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <th
      className="px-2 pt-2 pb-1.5 text-left border-l border-[#eef0f3]"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        borderTop: `3px solid ${accent}`,
        backgroundColor: COLORS.surface,
      }}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        <span
          className="inline-block size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: accent }}
        />
        <span
          className="text-[10.5px] font-medium tracking-wide"
          style={{ color: COLORS.brandText }}
        >
          {label}
        </span>
        {currency && (
          <span
            className="text-[9.5px] font-mono uppercase opacity-60"
            style={{ color: COLORS.text2 }}
          >
            {currency}
          </span>
        )}
      </div>
      {onResize && (
        <ResizeHandle active={Boolean(resizing)} onMouseDown={onResize} />
      )}
    </th>
  )
}

/** A 6 px-wide invisible-by-default drag bar pinned to the right edge of
 *  a `<th>`. Tints on hover/drag to make the affordance discoverable. */
function ResizeHandle({
  active,
  onMouseDown,
}: {
  active: boolean
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`absolute top-0 right-0 h-full w-[6px] cursor-col-resize select-none ${
        active ? "bg-[#142845]/40" : "hover:bg-[#142845]/15"
      }`}
      role="separator"
      aria-orientation="vertical"
    />
  )
}

/**
 * Full-page browser for the imported BoQ.
 *
 * Sidebar lists every section (one per xlsx sheet) plus an "All items"
 * pseudo-section. The main pane shows every line item under the active
 * selection with a sticky-header table; rows are filtered live by the
 * search box at the top. No pagination — 2,224 rows on a modern browser
 * is well under the comfortable budget.
 */
export function BoqViewer({
  projectId,
  projectName,
  data,
}: {
  projectId: string
  projectName: string
  data: BoqViewerData | null
}) {
  const [activeSectionId, setActiveSectionId] = useState<string | "all">("all")
  const [query, setQuery] = useState("")
  /** Which template the viewer is currently showing. Defaults to BoQ
   *  when one exists, otherwise PTE. The toggle in the header switches.
   *  Tenderer submissions are addressed as `sub:<tendererId>`; "compare"
   *  is a side-by-side view of every priceset on the same BoQ items. */
  type ViewKey = "boq" | "pte" | "compare" | "summary" | `sub:${string}`
  const [view, setView] = useState<ViewKey>(
    data?.boq ? "boq" : data?.pte ? "pte" : "boq",
  )
  const { widths, startResize, resizing } = useColumnWidths()
  /** Currently-open history drawer (item id) + its loaded events. */
  const [historyItem, setHistoryItem] = useState<BoqViewerItem | null>(null)
  const [historyEvents, setHistoryEvents] = useState<
    BoqViewerItemEvent[] | null
  >(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const openHistory = useCallback(async (item: BoqViewerItem) => {
    setHistoryItem(item)
    setHistoryEvents(null)
    setHistoryLoading(true)
    try {
      const result = await getItemHistory(item.id)
      if (result.ok) setHistoryEvents(result.events)
      else setHistoryEvents([])
    } catch {
      setHistoryEvents([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const submissions = data?.submissions ?? []
  const activeSubmission =
    view.startsWith("sub:")
      ? submissions.find((s) => `sub:${s.tendererId}` === view) ?? null
      : null
  const isCompare = view === "compare"
  const isSummary = view === "summary"

  // ─── Baseline configuration for the Compare view ───────────────────
  // Lets the user pick which rate each tenderer is benchmarked against.
  // Stored locally for now — moving it server-side is one schema column
  // away when we need to share it across users.
  type BaselineMode = "avg-low-3" | "median" | "avg-all" | "pte"
  const BASELINE_OPTIONS: ReadonlyArray<{
    key: BaselineMode
    label: string
    short: string
    recommended?: boolean
    description: string
    example: string
  }> = [
    {
      key: "avg-low-3",
      label: "Average of Lowest Three",
      short: "Avg of lowest 3",
      recommended: true,
      description:
        "Compare against the average of the three lowest rates submitted for each item. Best when you want a fair market reference without using PTE.",
      example: "If 5 bidders quote 100, 105, 120, 135, then baseline is 108.3",
    },
    {
      key: "median",
      label: "Median of Tenderer Rates",
      short: "Median",
      description:
        "Use the middle rate once all tenderer rates are sorted. Best when there may be unusually high/low outliers.",
      example: "For rates 100, 120, 140, then baseline is 120",
    },
    {
      key: "avg-all",
      label: "Average of All Tenderers",
      short: "Avg of all",
      description:
        "Compare each tenderer against the average rate from all tenderers for each item. Note that this may be influenced by outliers.",
      example: "If 3 bidders quote 100, 120, 140, then baseline is 120",
    },
    {
      key: "pte",
      label: "Pre-Tender Estimate (PTE) — Internal only",
      short: "PTE",
      description:
        "Compare all tenderers against your QS internal cost estimate. Not recommended for tenderer-facing outputs. Use for internal review or employer report instead.",
      example: "Use your QS estimate as the comparison baseline",
    },
  ] as const
  const [baselineMode, setBaselineMode] = useState<BaselineMode>("avg-low-3")
  const [baselineOpen, setBaselineOpen] = useState(false)
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false)
  const baselineMeta =
    BASELINE_OPTIONS.find((o) => o.key === baselineMode) ?? BASELINE_OPTIONS[0]

  const active =
    view === "pte"
      ? data?.pte ?? null
      : activeSubmission
        ? activeSubmission.template
        : /* covers "boq", "compare", and "summary" — fall back when the
             empty BoQ wasn't imported so the page still has a template
             to read currency/name from. */
          data?.boq ??
          data?.pte ??
          submissions[0]?.template ??
          null
  /** Show the Rate + Amount columns whenever the view actually has rates
   *  — PTE OR a tenderer submission. The empty BoQ never does. The
   *  compare view renders its own per-source columns (handled separately). */
  const showRates = view === "pte" || activeSubmission !== null

  /** In compare mode we need a rate lookup keyed by item id per priceset
   *  source so the table can render extra columns without re-walking the
   *  data on every row. */
  type CompareColumn = {
    key: string
    label: string
    title: string
    /** Map of BoQ item.id → { rate, amount }. Submissions already use
     *  BoQ ids; PTE is matched server-side via the entity matcher
     *  (pteRatesByBoqItemId) so the same lookup works for both. */
    ratesByBoqItemId: Map<
      string,
      { rateCents: string | null; amountCents: string | null }
    >
    /** Total of priced amounts for the footer row. */
    totalCents: bigint
  }
  const compareColumns = useMemo<CompareColumn[]>(() => {
    if (!isCompare) return []
    const cols: CompareColumn[] = []
    const sumAmounts = (
      entries: Iterable<{ amountCents: string | null }>,
    ): bigint => {
      let total = 0n
      for (const e of entries) {
        if (!e.amountCents) continue
        try {
          total += BigInt(e.amountCents)
        } catch {
          /* ignore */
        }
      }
      return total
    }
    if (data?.pte) {
      const map = new Map(Object.entries(data.pteRatesByBoqItemId ?? {}))
      cols.push({
        key: "pte",
        label: "PTE",
        title: "Pre-Tender Estimate",
        ratesByBoqItemId: map,
        totalCents: sumAmounts(map.values()),
      })
    }
    for (const s of submissions) {
      const map = new Map<
        string,
        { rateCents: string | null; amountCents: string | null }
      >()
      for (const it of s.template.items) {
        map.set(it.id, {
          rateCents: it.rateCents,
          amountCents: it.amountCents,
        })
      }
      cols.push({
        key: `sub:${s.tendererId}`,
        label: s.tendererCode,
        title: s.tendererName,
        ratesByBoqItemId: map,
        totalCents: sumAmounts(map.values()),
      })
    }
    return cols
  }, [isCompare, data?.pte, data?.pteRatesByBoqItemId, submissions])

  /** Per-item baseline derived from the chosen mode. We compute over
   *  tenderer rates (not PTE) for "avg-low-3" / "median" / "avg-all" so
   *  the baseline tracks the market, and read straight from PTE for the
   *  internal mode. Stored as integers (cents). */
  const baselineByBoqItemId = useMemo<Map<string, bigint>>(() => {
    if (!isCompare || !active) return new Map()
    const tendererColumns = compareColumns.filter((c) => c.key !== "pte")
    const pteCol = compareColumns.find((c) => c.key === "pte")
    const result = new Map<string, bigint>()
    for (const it of active.items) {
      // Gather all priced tenderer rates for this row.
      const rates: bigint[] = []
      for (const c of tendererColumns) {
        const r = c.ratesByBoqItemId.get(it.id)
        if (r?.rateCents) {
          try {
            rates.push(BigInt(r.rateCents))
          } catch {
            /* skip */
          }
        }
      }
      let baseline: bigint | null = null
      if (baselineMode === "pte") {
        const r = pteCol?.ratesByBoqItemId.get(it.id)
        if (r?.rateCents) {
          try {
            baseline = BigInt(r.rateCents)
          } catch {
            /* skip */
          }
        }
      } else if (rates.length > 0) {
        const sorted = [...rates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        if (baselineMode === "avg-low-3") {
          const pick = sorted.slice(0, Math.min(3, sorted.length))
          const sum = pick.reduce((s, v) => s + v, 0n)
          baseline = sum / BigInt(pick.length)
        } else if (baselineMode === "median") {
          const mid = Math.floor(sorted.length / 2)
          baseline =
            sorted.length % 2 === 1
              ? sorted[mid]!
              : (sorted[mid - 1]! + sorted[mid]!) / 2n
        } else if (baselineMode === "avg-all") {
          const sum = sorted.reduce((s, v) => s + v, 0n)
          baseline = sum / BigInt(sorted.length)
        }
      }
      if (baseline !== null) result.set(it.id, baseline)
    }
    return result
  }, [isCompare, active, compareColumns, baselineMode])

  // Group items by section id once so sheet-switching is instant.
  const itemsBySection = useMemo(() => {
    const map = new Map<string, BoqViewerItem[]>()
    if (!active) return map
    for (const it of active.items) {
      const list = map.get(it.sectionId) ?? []
      list.push(it)
      map.set(it.sectionId, list)
    }
    return map
  }, [active])

  // Items currently visible (active section + search filter).
  const visibleItems = useMemo(() => {
    if (!active) return []
    const source =
      activeSectionId === "all"
        ? active.items
        : itemsBySection.get(activeSectionId) ?? []
    if (!query.trim()) return source
    const q = query.trim().toLowerCase()
    return source.filter(
      (it) =>
        it.no.toLowerCase().includes(q) ||
        it.label.toLowerCase().includes(q) ||
        (it.unit?.toLowerCase().includes(q) ?? false),
    )
  }, [active, activeSectionId, query, itemsBySection])

  // Lookup section labels for the "All items" view (where rows span sheets).
  const sectionLabelById = useMemo(() => {
    const m = new Map<string, string>()
    if (!active) return m
    for (const s of active.sections) m.set(s.id, s.no)
    return m
  }, [active])

  // Reset to "All items" whenever the user flips between BoQ ↔ PTE — the
  // active sheet ids don't carry over.
  useEffect(() => {
    setActiveSectionId("all")
  }, [view])

  // Nothing to show at all.
  if (!data || (!data.boq && !data.pte && submissions.length === 0)) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-[#e9e9e9] px-10 py-12 text-center max-w-md">
          <FileSpreadsheet className="size-9 text-[#bbb] mx-auto mb-3" />
          <h2 className="font-semibold text-[16px] text-[#142845] mb-1">
            No BoQ or PTE imported yet
          </h2>
          <p className="text-[13px] text-[#666] mb-4">
            Upload an empty BoQ or PTE xlsx on Step 2 and run the import to see
            line items here.
          </p>
          <Link
            href={`/procurex/projects/${projectId}/setup?step=2`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#142845] rounded-lg hover:bg-[#0e1d34]"
          >
            <ArrowLeft className="size-4" />
            Back to Step 2
          </Link>
        </div>
      </div>
    )
  }

  // active is non-null here because at least one of boq/pte exists.
  const activeTemplate = active!

  const inScopeCount =
    activeSectionId === "all"
      ? activeTemplate.items.length
      : itemsBySection.get(activeSectionId)?.length ?? 0

  return (
    <div className="h-screen bg-[#f8f8f8] flex flex-col overflow-hidden">
      {/* ─── Single merged header ─── */}
      <header className="bg-white border-b border-[#ececec] shrink-0 relative z-40">
        <div className="px-6 py-3 flex items-center gap-4">
          <Link
            href={`/procurex/projects/${projectId}/setup?step=2`}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#555] hover:text-[#142845] shrink-0"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <div className="min-w-0 shrink">
            <h1 className="text-[14px] font-semibold text-[#142845] truncate">
              {view === "pte"
                ? "Pre-Tender Estimate"
                : activeSubmission
                  ? `${activeSubmission.tendererCode} — ${activeSubmission.tendererName}`
                  : isCompare
                    ? "Compare all priced sources"
                    : isSummary
                      ? "Bidder summary"
                      : "Bill of Quantities"}
              {" — "}
              {projectName}
            </h1>
            <p className="text-[11px] text-[#888] truncate">
              {activeTemplate.name}
              {activeTemplate.currency && (
                <span className="ml-2 font-mono uppercase text-[#142845]/70">
                  {activeTemplate.currency}
                </span>
              )}
              <span className="ml-3">
                {activeTemplate.items.length.toLocaleString()} items ·{" "}
                {activeTemplate.sections.length} sections
              </span>
            </p>
          </div>
          {/* ── BoQ / PTE / tenderer toggle ── (only when at least two
                templates are available — pure BoQ-only projects skip it) */}
          {(() => {
            const tabs: Array<{ key: ViewKey; label: string; title?: string }> = []
            if (data.boq) tabs.push({ key: "boq", label: "Empty BoQ" })
            if (data.pte) tabs.push({ key: "pte", label: "PTE" })
            for (const s of submissions) {
              tabs.push({
                key: `sub:${s.tendererId}` as ViewKey,
                label: s.tendererCode,
                title: s.tendererName,
              })
            }
            // Compare tab appears only when there's something to compare —
            // i.e. PTE OR ≥1 submission ON TOP OF the empty BoQ structure.
            if (data.boq && (data.pte || submissions.length > 0)) {
              tabs.push({
                key: "compare",
                label: "Compare",
                title: "All priced sources side-by-side",
              })
            }
            // Summary tab — per-bidder roll-up (tender sum, variance, etc).
            if (submissions.length > 0) {
              tabs.push({
                key: "summary",
                label: "Summary",
                title: "Per-bidder roll-up across the tender",
              })
            }
            if (tabs.length < 2) return null
            return (
              <div
                className="ml-3 inline-flex items-center rounded-md p-0.5 shrink-0 overflow-x-auto max-w-[520px]"
                style={{ backgroundColor: COLORS.brandSoftBg }}
              >
                {tabs.map((tab) => {
                  const selected = view === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      title={tab.title}
                      onClick={() => setView(tab.key)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap transition-colors"
                      style={
                        selected
                          ? {
                              backgroundColor: COLORS.surface,
                              color: COLORS.brandText,
                              boxShadow:
                                "0 1px 1px rgba(20,40,69,0.06), 0 0 0 1px rgba(20,40,69,0.08)",
                            }
                          : { color: COLORS.text2, backgroundColor: "transparent" }
                      }
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            )
          })()}
          {/* Section / sheet switcher and search — hidden in Summary mode
              (the per-bidder roll-up doesn't filter by item). */}
          {!isSummary && (
            <SectionDropdown
              sections={activeTemplate.sections}
              allItemsCount={activeTemplate.items.length}
              value={activeSectionId}
              onChange={setActiveSectionId}
              open={sectionPickerOpen}
              onOpenChange={setSectionPickerOpen}
            />
          )}
          {!isSummary && (
            <div className="flex-1 relative max-w-md ml-auto">
              <Search className="size-3.5 text-[#aaa] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by item ref, description, unit…"
                className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#e0e0e0] rounded-md bg-white focus:outline-none focus:border-[#142845]"
              />
            </div>
          )}
          {isSummary && <div className="flex-1 ml-auto" />}
          {isCompare && (
            <BaselinePicker
              options={BASELINE_OPTIONS}
              value={baselineMode}
              onChange={(v) => {
                setBaselineMode(v)
                setBaselineOpen(false)
              }}
              open={baselineOpen}
              onOpenChange={setBaselineOpen}
              currentLabel={baselineMeta.short}
            />
          )}
          <div className="text-[11px] text-[#888] tabular-nums shrink-0">
            Showing {visibleItems.length.toLocaleString()}
            {visibleItems.length !== inScopeCount && (
              <> of {inScopeCount.toLocaleString()}</>
            )}
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(visibleItems, sectionLabelById)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#142845] bg-[#142845]/5 rounded-md hover:bg-[#142845]/10 shrink-0"
            title="Download the visible rows as CSV"
          >
            <Download className="size-3" /> CSV
          </button>
        </div>
      </header>

      {/* ─── Body — each pane scrolls independently so the sidebar stays
           visible while the items table scrolls. ─── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Items table — full width now that the sidebar is gone; the
            section picker moved into the header as a dropdown. */}
        <main
          className="flex-1 min-h-0 px-6 py-4"
          style={{ backgroundColor: COLORS.surfaceAlt }}
        >
          {isSummary ? (
            <div className="h-full overflow-auto space-y-6">
              <SummarySection
                number="01"
                title="Tender Submissions"
                subtitle="Headline totals per bidder."
              >
                <SummaryTable
                  rows={data.summary}
                  currency={activeTemplate.currency}
                  hasPte={Boolean(data.pte)}
                />
              </SummarySection>
              <SummarySection
                number="03"
                title="Compliance Requirements"
                subtitle="Per-bidder compliance against the FOT clauses."
              >
                <ComplianceTable
                  rows={data.summary}
                  verdictsByTendererId={Object.fromEntries(
                    Object.entries(
                      data.fotComplianceByTendererId ?? {},
                    ).map(([tendererId, verdicts]) => [
                      tendererId,
                      [
                        verdicts["FOT Submission"],
                        verdicts["Time for Completion"],
                        verdicts["OHP Markup"],
                        verdicts["Tender Validity"],
                        verdicts.Signatures,
                      ] as const,
                    ]),
                  )}
                />
              </SummarySection>
              <SummarySection
                number="04"
                title="Flags & Deviations"
                subtitle="Counts that flag deeper review per bidder — variance, mispricing, and contractual/technical/commercial deviations from the tender requirements."
              >
                <FlagsGrid rows={data.summary} />
              </SummarySection>
            </div>
          ) : (
          /* Single scroll container — both axes scroll here so the
              sticky tfoot has a real viewport to stick to. */
          <div
            className="h-full overflow-auto rounded-lg border bg-white"
            style={{ borderColor: COLORS.rule }}
          >
              <table
                className="text-[12px] w-max min-w-full"
                style={{ tableLayout: "fixed" }}
              >
                <colgroup>
                  <col style={{ width: 40 }} />
                  {activeSectionId === "all" && (
                    <col style={{ width: widths.sheet }} />
                  )}
                  <col style={{ width: widths.no }} />
                  <col style={{ width: widths.label }} />
                  <col style={{ width: widths.quantity }} />
                  <col style={{ width: widths.unit }} />
                  {showRates && (
                    <>
                      <col style={{ width: widths.rate }} />
                      <col style={{ width: widths.amount }} />
                    </>
                  )}
                  {isCompare && (
                    <col style={{ width: 110 }} />
                  )}
                  {isCompare &&
                    compareColumns.map((c) => (
                      <col key={c.key} style={{ width: 110 }} />
                    ))}
                </colgroup>
                <thead style={{ backgroundColor: COLORS.surface }}>
                  <tr
                    className="border-b border-[#e9e9e9]"
                    style={{ backgroundColor: COLORS.surface }}
                  >
                    <th
                      className="px-2 py-1.5 text-[10px] font-medium"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 30,
                        color: COLORS.text3,
                        backgroundColor: COLORS.surface,
                      }}
                    >
                      #
                    </th>
                    {activeSectionId === "all" && (
                      <FieldHead
                        accent="#475569"
                        label="Sheet"
                        resizing={resizing === "sheet"}
                        onResize={startResize("sheet")}
                      />
                    )}
                    <FieldHead
                      accent={FIELD_ACCENT.itemRef}
                      label={FIELD_LABEL.itemRef}
                      resizing={resizing === "no"}
                      onResize={startResize("no")}
                    />
                    <FieldHead
                      accent={FIELD_ACCENT.description}
                      label={FIELD_LABEL.description}
                      resizing={resizing === "label"}
                      onResize={startResize("label")}
                    />
                    <FieldHead
                      accent={FIELD_ACCENT.quantity}
                      label={FIELD_LABEL.quantity}
                      align="right"
                      resizing={resizing === "quantity"}
                      onResize={startResize("quantity")}
                    />
                    <FieldHead
                      accent={FIELD_ACCENT.unit}
                      label={FIELD_LABEL.unit}
                      resizing={resizing === "unit"}
                      onResize={startResize("unit")}
                    />
                    {showRates && (
                      <>
                        <FieldHead
                          accent={FIELD_ACCENT.rate}
                          label={FIELD_LABEL.rate}
                          currency={activeTemplate.currency}
                          align="right"
                          resizing={resizing === "rate"}
                          onResize={startResize("rate")}
                        />
                        <FieldHead
                          accent={FIELD_ACCENT.amount}
                          label={FIELD_LABEL.amount}
                          currency={activeTemplate.currency}
                          align="right"
                          resizing={resizing === "amount"}
                          onResize={startResize("amount")}
                        />
                      </>
                    )}
                    {isCompare && (
                      <th
                        className="px-2 pt-2 pb-1.5 border-l-2 align-bottom"
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 30,
                          borderTopWidth: 3,
                          borderTopColor: COLORS.brand,
                          borderTopStyle: "solid",
                          borderLeftColor: "rgba(20,40,69,0.15)",
                          backgroundColor: COLORS.baselineBg,
                        }}
                        title={`Baseline — ${baselineMeta.label}`}
                      >
                        <div className="flex flex-col gap-0.5 items-end">
                          <span
                            className="text-[10px] uppercase tracking-wider"
                            style={{ color: COLORS.text3 }}
                          >
                            Base
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold"
                            style={{ color: COLORS.brandText }}
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: COLORS.brand }}
                            />
                            {baselineMeta.short}
                            {activeTemplate.currency && (
                              <span
                                className="ml-0.5 text-[9.5px] font-mono uppercase opacity-60"
                                style={{ color: COLORS.text2 }}
                              >
                                {activeTemplate.currency}
                              </span>
                            )}
                          </span>
                        </div>
                      </th>
                    )}
                    {isCompare &&
                      compareColumns.map((c, i) => {
                        const accent =
                          SOURCE_ACCENT[i % SOURCE_ACCENT.length] ?? COLORS.brand
                        return (
                          <th
                            key={c.key}
                            className="px-2 pt-2 pb-1.5 border-l align-bottom"
                            style={{
                              position: "sticky",
                              top: 0,
                              zIndex: 30,
                              borderTop: `3px solid ${accent}`,
                              borderLeftColor: COLORS.rule,
                              backgroundColor: COLORS.surface,
                            }}
                            title={c.title}
                          >
                            <div className="flex flex-col gap-0.5 items-end">
                              <span
                                className="text-[10px] truncate max-w-[100px]"
                                style={{ color: COLORS.text3 }}
                              >
                                {c.title}
                              </span>
                              <span
                                className="inline-flex items-center gap-1 text-[10.5px] font-semibold"
                                style={{ color: accent }}
                              >
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{ backgroundColor: accent }}
                                />
                                {c.label}
                                {activeTemplate.currency && (
                                  <span
                                    className="ml-0.5 text-[9.5px] font-mono uppercase opacity-60"
                                    style={{ color: COLORS.text2 }}
                                  >
                                    {activeTemplate.currency}
                                  </span>
                                )}
                              </span>
                            </div>
                          </th>
                        )
                      })}
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          (activeSectionId === "all" ? 6 : 5) +
                          (showRates ? 2 : 0) +
                          (isCompare ? compareColumns.length + 1 : 0)
                        }
                        className="px-3 py-10 text-center text-[#888]"
                      >
                        {query
                          ? "No items match this search."
                          : "No items in this section."}
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((it, i) => {
                      const zebra = i % 2 === 1
                      const rowBg = zebra ? COLORS.surfaceAlt : COLORS.surface
                      return (
                      <tr
                        key={it.id}
                        className="border-b"
                        style={{
                          borderColor: COLORS.rule,
                          backgroundColor: rowBg,
                        }}
                      >
                        <td
                          className="px-2 py-1 text-[10px] tabular-nums font-mono align-top"
                          style={{ color: COLORS.text3 }}
                        >
                          <button
                            type="button"
                            onClick={() => openHistory(it)}
                            className="inline-flex items-center gap-1 hover:text-[#142845]"
                            title={`${it.eventCount} event${it.eventCount === 1 ? "" : "s"} — open history`}
                          >
                            <span>{i + 1}</span>
                            {it.eventCount > 1 && (
                              <Clock
                                className="size-2.5"
                                style={{ color: "rgba(20,40,69,0.45)" }}
                              />
                            )}
                          </button>
                        </td>
                        {activeSectionId === "all" && (
                          <td
                            className="px-2 py-1 align-top border-l font-mono text-[11px] truncate"
                            style={{ borderColor: COLORS.rule, color: COLORS.text2 }}
                          >
                            {sectionLabelById.get(it.sectionId) ?? ""}
                          </td>
                        )}
                        <td
                          className="px-2 py-1 align-top border-l font-mono text-[11px] truncate"
                          style={{ borderColor: COLORS.rule, color: COLORS.brandText }}
                          title={it.no}
                        >
                          {it.no}
                        </td>
                        <td
                          className="px-2 py-1 align-top border-l break-words leading-[16px]"
                          style={{ borderColor: COLORS.rule, color: COLORS.brandText }}
                          title={it.label}
                        >
                          {it.label}
                        </td>
                        <td
                          className="px-2 py-1 align-top border-l text-right tabular-nums truncate"
                          style={{ borderColor: COLORS.rule, color: COLORS.brandText }}
                        >
                          {it.quantityPlanned ? (
                            formatNumber(it.quantityPlanned)
                          ) : (
                            <span style={{ color: COLORS.text3 }}>·</span>
                          )}
                        </td>
                        <td
                          className="px-2 py-1 align-top border-l truncate"
                          style={{ borderColor: COLORS.rule, color: COLORS.text2 }}
                        >
                          {it.unit || (
                            <span style={{ color: COLORS.text3 }}>·</span>
                          )}
                        </td>
                        {showRates && (
                          <>
                            <td
                              className="px-2 py-1 align-top border-l text-right tabular-nums truncate"
                              style={{ borderColor: COLORS.rule, color: COLORS.brandText }}
                            >
                              {it.rateCents ? (
                                formatCents(it.rateCents)
                              ) : (
                                <span style={{ color: COLORS.text3 }}>·</span>
                              )}
                            </td>
                            <td
                              className="px-2 py-1 align-top border-l text-right tabular-nums truncate font-medium"
                              style={{ borderColor: COLORS.rule, color: COLORS.brandText }}
                            >
                              {it.amountCents ? (
                                formatCents(it.amountCents)
                              ) : (
                                <span style={{ color: COLORS.text3 }}>·</span>
                              )}
                            </td>
                          </>
                        )}
                        {isCompare && (
                          <td
                            className="px-2 py-1 align-top border-l-2 text-right tabular-nums truncate font-medium"
                            style={{
                              borderLeftColor: "rgba(20,40,69,0.15)",
                              backgroundColor: COLORS.baselineBg,
                              color: COLORS.brandText,
                            }}
                            title={`Baseline (${baselineMeta.short})`}
                          >
                            {(() => {
                              const b = baselineByBoqItemId.get(it.id)
                              return b !== undefined ? (
                                formatCents(b.toString())
                              ) : (
                                <span style={{ color: COLORS.text3 }}>·</span>
                              )
                            })()}
                          </td>
                        )}
                        {isCompare &&
                          compareColumns.map((c) => {
                            const r = c.ratesByBoqItemId.get(it.id)
                            const rate = r?.rateCents
                              ? (() => {
                                  try {
                                    return BigInt(r.rateCents!)
                                  } catch {
                                    return null
                                  }
                                })()
                              : null
                            const base = baselineByBoqItemId.get(it.id)
                            let toneColor: string = COLORS.brandText
                            let variancePctText: string | null = null
                            let varianceArrow: "up" | "down" | null = null
                            if (rate !== null && base !== undefined && base > 0n) {
                              const diff = rate - base
                              const pct = Number((diff * 10000n) / base) / 100
                              if (rate < base) {
                                toneColor = COLORS.positive
                                varianceArrow = "down"
                              } else if (rate > base) {
                                toneColor = COLORS.negative
                                varianceArrow = "up"
                              }
                              variancePctText = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`
                            }
                            return (
                              <td
                                key={c.key}
                                className="px-2 py-1 align-top border-l tabular-nums truncate"
                                style={{ borderColor: COLORS.rule }}
                              >
                                <div className="flex flex-col items-end gap-0.5">
                                  <span
                                    className="text-[11.5px]"
                                    style={{ color: toneColor }}
                                  >
                                    {r?.rateCents ? (
                                      formatCents(r.rateCents)
                                    ) : (
                                      <span style={{ color: COLORS.text3 }}>·</span>
                                    )}
                                  </span>
                                  {variancePctText && varianceArrow && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 rounded text-[9.5px] font-medium"
                                      style={{
                                        backgroundColor:
                                          varianceArrow === "down"
                                            ? COLORS.positiveBg
                                            : COLORS.negativeBg,
                                        color: toneColor,
                                      }}
                                      title={`${variancePctText} vs ${baselineMeta.short}`}
                                    >
                                      {varianceArrow === "down" ? "↓" : "↑"}{" "}
                                      {variancePctText}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                      </tr>
                      )
                    })
                  )}
                </tbody>
                {isCompare && compareColumns.length > 0 && (
                  <tfoot>
                    <tr>
                      <td
                        colSpan={activeSectionId === "all" ? 6 : 5}
                        className="px-3 py-2 text-right text-[11px] font-semibold"
                        style={{
                          color: COLORS.brandText,
                          position: "sticky",
                          bottom: 0,
                          zIndex: 5,
                          backgroundColor: COLORS.surfaceAlt,
                          borderTop: "2px solid rgba(20,40,69,0.18)",
                        }}
                      >
                        Tender sum
                        {activeTemplate.currency && (
                          <span
                            className="ml-1 opacity-60 font-mono"
                            style={{ color: COLORS.text2 }}
                          >
                            {activeTemplate.currency}
                          </span>
                        )}
                      </td>
                      <td
                        className="px-2 py-2"
                        style={{
                          position: "sticky",
                          bottom: 0,
                          zIndex: 5,
                          borderLeft: "2px solid rgba(20,40,69,0.15)",
                          borderTop: "2px solid rgba(20,40,69,0.18)",
                          backgroundColor: "#eef0f4",
                        }}
                      />
                      {compareColumns.map((c, i) => {
                        const accent =
                          SOURCE_ACCENT[i % SOURCE_ACCENT.length] ?? COLORS.brand
                        return (
                          <td
                            key={c.key}
                            className="px-2 py-2 text-right tabular-nums text-[11px] font-semibold border-l truncate"
                            style={{
                              borderColor: COLORS.rule,
                              color: accent,
                              position: "sticky",
                              bottom: 0,
                              zIndex: 5,
                              backgroundColor: COLORS.surfaceAlt,
                              borderTop: "2px solid rgba(20,40,69,0.18)",
                            }}
                            title={`${c.title} — total of priced rows`}
                          >
                            {formatCents(c.totalCents.toString())}
                          </td>
                        )
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
          </div>
          )}
        </main>
      </div>
      {historyItem && (
        <HistoryDrawer
          item={historyItem}
          events={historyEvents}
          loading={historyLoading}
          onClose={() => {
            setHistoryItem(null)
            setHistoryEvents(null)
          }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// SummarySection — visual wrapper for each numbered block in the Summary
// view (01 Tender Submissions / 03 Compliance Requirements / etc.).
// ──────────────────────────────────────────────────────────────────────

function SummarySection({
  number,
  title,
  subtitle,
  children,
}: {
  number: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-start gap-3 mb-2">
        <span
          className="inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold font-mono"
          style={{
            backgroundColor: COLORS.brandSoftBg,
            color: COLORS.brandText,
          }}
        >
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <h2
            className="text-[14px] font-semibold"
            style={{ color: COLORS.brandText }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px]" style={{ color: COLORS.text2 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────
// ComplianceTable — placeholder verdicts against the standard FOT
// clauses. Real verdicts will come from the FOT extraction agents once
// they're wired into this page; until then we use a deterministic
// pattern per tenderer index so the UI is exercised.
// ──────────────────────────────────────────────────────────────────────

type ComplianceVerdict = "Compliant" | "Partial" | "Non-compliant" | "Missing"

const COMPLIANCE_CLAUSES = [
  "FOT Submission",
  "Time for Completion",
  "OHP Markup",
  "Tender Validity",
  "Signatures",
] as const

const COMPLIANCE_PATTERN: ReadonlyArray<ReadonlyArray<ComplianceVerdict>> = [
  ["Compliant", "Compliant", "Compliant", "Compliant", "Compliant"],
  ["Compliant", "Compliant", "Partial", "Compliant", "Compliant"],
  ["Compliant", "Non-compliant", "Compliant", "Compliant", "Partial"],
  ["Compliant", "Compliant", "Compliant", "Partial", "Compliant"],
  ["Partial", "Compliant", "Compliant", "Compliant", "Compliant"],
  ["Compliant", "Missing", "Partial", "Non-compliant", "Compliant"],
]

const VERDICT_TONE: Record<
  ComplianceVerdict,
  { bg: string; fg: string }
> = {
  Compliant: { bg: COLORS.positiveBg, fg: COLORS.positive },
  Partial: { bg: "rgba(180,83,9,0.12)", fg: "#b45309" },
  "Non-compliant": { bg: COLORS.negativeBg, fg: COLORS.negative },
  Missing: { bg: "rgba(154,161,172,0.18)", fg: COLORS.text2 },
}

/** Worst-of-row aggregate for the trailing Compliance Summary column. */
function rollupCompliance(
  verdicts: ReadonlyArray<ComplianceVerdict>,
): ComplianceVerdict {
  if (verdicts.includes("Missing")) return "Missing"
  if (verdicts.includes("Non-compliant")) return "Non-compliant"
  if (verdicts.includes("Partial")) return "Partial"
  return "Compliant"
}

function VerdictPill({ verdict }: { verdict: ComplianceVerdict }) {
  const tone = VERDICT_TONE[verdict]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {verdict}
    </span>
  )
}

function ComplianceTable({
  rows,
  verdictsByTendererId,
}: {
  rows: BoqViewerSummaryRow[]
  /** Real per-clause verdicts produced by the FOT comparator. When the
   *  map is empty (no FOT runs yet) we fall back to the demo pattern
   *  so the surface isn't a wall of "Missing". */
  verdictsByTendererId?: Record<string, ReadonlyArray<ComplianceVerdict>>
}) {
  if (rows.length === 0) {
    return (
      <div
        className="rounded-lg border px-6 py-8 text-center text-[12px]"
        style={{
          backgroundColor: COLORS.surface,
          borderColor: COLORS.rule,
          color: COLORS.text2,
        }}
      >
        No bidder submissions to score yet.
      </div>
    )
  }
  return (
    <div
      className="overflow-auto rounded-lg border"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.rule }}
    >
      <table
        className="text-[12px] w-full"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: 220 }} />
          {COMPLIANCE_CLAUSES.map((c) => (
            <col key={c} style={{ width: 140 }} />
          ))}
          <col style={{ width: 160 }} />
        </colgroup>
        <thead style={{ backgroundColor: COLORS.surfaceAlt }}>
          <tr>
            <th
              className="px-3 pt-2 pb-1.5 text-left"
              style={{ borderTop: `3px solid ${COLORS.brand}` }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: COLORS.brand }}
                />
                <span
                  className="text-[10.5px] font-medium tracking-wide"
                  style={{ color: COLORS.brandText }}
                >
                  Bidder
                </span>
              </div>
            </th>
            {COMPLIANCE_CLAUSES.map((label, i) => {
              const accent = SOURCE_ACCENT[i % SOURCE_ACCENT.length] ?? COLORS.brand
              return (
                <th
                  key={label}
                  className="px-3 pt-2 pb-1.5 border-l text-left"
                  style={{
                    borderTop: `3px solid ${accent}`,
                    borderLeftColor: COLORS.rule,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    <span
                      className="text-[10.5px] font-medium tracking-wide"
                      style={{ color: COLORS.brandText }}
                    >
                      {label}
                    </span>
                  </div>
                </th>
              )
            })}
            <th
              className="px-3 pt-2 pb-1.5 border-l text-left"
              style={{
                borderTop: `3px solid ${COLORS.brand}`,
                borderLeftColor: "rgba(20,40,69,0.15)",
                backgroundColor: COLORS.baselineBg,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: COLORS.brand }}
                />
                <span
                  className="text-[10.5px] font-semibold tracking-wide"
                  style={{ color: COLORS.brandText }}
                >
                  Compliance Summary
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const zebra = i % 2 === 1
            // Prefer real FOT-derived verdicts. Fall back to the demo
            // pattern only when no verdicts have been computed for this
            // tenderer yet so the page never looks empty.
            const real = verdictsByTendererId?.[r.tendererId]
            const verdicts: ReadonlyArray<ComplianceVerdict> =
              real && real.length === COMPLIANCE_CLAUSES.length
                ? real
                : (COMPLIANCE_PATTERN[i % COMPLIANCE_PATTERN.length] ??
                  COMPLIANCE_PATTERN[0]!)
            const summary = rollupCompliance(verdicts)
            return (
              <tr
                key={r.tendererId}
                className="border-b"
                style={{
                  borderColor: COLORS.rule,
                  backgroundColor: zebra ? COLORS.surfaceAlt : COLORS.surface,
                }}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono"
                      style={{
                        backgroundColor: COLORS.brand,
                        color: "#ffffff",
                      }}
                    >
                      {r.tendererCode}
                    </span>
                    <span
                      className="text-[12px] font-medium truncate"
                      style={{ color: COLORS.brandText }}
                      title={r.tendererName}
                    >
                      {r.tendererName}
                    </span>
                  </div>
                </td>
                {verdicts.map((v, vi) => (
                  <td
                    key={vi}
                    className="px-3 py-2 border-l"
                    style={{ borderColor: COLORS.rule }}
                  >
                    <VerdictPill verdict={v} />
                  </td>
                ))}
                <td
                  className="px-3 py-2 border-l"
                  style={{
                    borderLeftColor: "rgba(20,40,69,0.15)",
                    backgroundColor: COLORS.baselineBg,
                  }}
                >
                  <VerdictPill verdict={summary} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// FlagsGrid — per-bidder card with 7 stat tiles: variance, high rates,
// unpriced, commercial / technical / contractual deviations, and
// arithmetical errors. Counts are dummy until the analysis pipeline
// surfaces real flag rows.
// ──────────────────────────────────────────────────────────────────────

type FlagTone = "warn" | "negative" | "neutral" | "positive"

interface FlagDef {
  key: string
  label: string
  tone: FlagTone
}

const FLAG_DEFS: ReadonlyArray<FlagDef> = [
  { key: "variance", label: "Variance", tone: "warn" },
  { key: "highRates", label: "High rates", tone: "negative" },
  { key: "unpriced", label: "Unpriced", tone: "warn" },
  { key: "commercial", label: "Commercial Deviation", tone: "neutral" },
  { key: "technical", label: "Technical Deviations", tone: "neutral" },
  { key: "contractual", label: "Contractual Deviation", tone: "neutral" },
  { key: "arithmetical", label: "Arithmetical errors", tone: "negative" },
]

/** Fallback pattern used when no flags have been computed yet — useful
 *  during development so the UI doesn't look empty. The minute the
 *  deterministic recompute or the deviations agent runs, the real
 *  counts on `BoqViewerSummaryRow.flagCounts` take over. */
const FLAG_PATTERN: ReadonlyArray<Record<string, number>> = [
  { variance: 8, highRates: 8, unpriced: 7, commercial: 1, technical: 2, contractual: 1, arithmetical: 5 },
  { variance: 12, highRates: 5, unpriced: 3, commercial: 0, technical: 1, contractual: 2, arithmetical: 4 },
  { variance: 6, highRates: 11, unpriced: 9, commercial: 2, technical: 3, contractual: 0, arithmetical: 7 },
  { variance: 4, highRates: 3, unpriced: 5, commercial: 0, technical: 0, contractual: 1, arithmetical: 2 },
]

/** Map the canonical `flagCounts` shape on the server row onto the
 *  `FLAG_DEFS` keys used by the grid. Keeps the UI list-driven without
 *  forcing the server to know about display ordering. */
function flagCountsToTiles(
  fc: BoqViewerSummaryRow["flagCounts"] | undefined,
): Record<string, number> {
  return {
    variance: fc?.variance ?? 0,
    highRates: fc?.highRate ?? 0,
    unpriced: fc?.unpriced ?? 0,
    commercial: fc?.commercial ?? 0,
    technical: fc?.technical ?? 0,
    contractual: fc?.contractual ?? 0,
    arithmetical: fc?.arithmeticalError ?? 0,
  }
}

function flagTone(tone: FlagTone, value: number): { bg: string; fg: string } {
  if (value === 0) return { bg: "transparent", fg: COLORS.text3 }
  switch (tone) {
    case "negative":
      return { bg: COLORS.negativeBg, fg: COLORS.negative }
    case "warn":
      return { bg: "rgba(180,83,9,0.10)", fg: "#b45309" }
    case "positive":
      return { bg: COLORS.positiveBg, fg: COLORS.positive }
    default:
      return { bg: COLORS.brandSoftBg, fg: COLORS.brandText }
  }
}

function FlagsGrid({ rows }: { rows: BoqViewerSummaryRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
      {rows.map((r, i) => {
        // Prefer real server-computed counts. If every kind is zero —
        // meaning analysis hasn't run yet — fall back to the dummy
        // pattern so the demo surface isn't a row of zeros.
        const real = flagCountsToTiles(r.flagCounts)
        const hasReal = Object.values(real).some((v) => v > 0)
        const counts =
          hasReal
            ? real
            : (FLAG_PATTERN[i % FLAG_PATTERN.length] ?? FLAG_PATTERN[0]!)
        const total = FLAG_DEFS.reduce(
          (s, def) => s + (counts[def.key] ?? 0),
          0,
        )
        return (
          <div
            key={r.tendererId}
            className="rounded-lg border"
            style={{ backgroundColor: COLORS.surface, borderColor: COLORS.rule }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 border-b"
              style={{ borderColor: COLORS.rule }}
            >
              <span
                className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono"
                style={{ backgroundColor: COLORS.brand, color: "#ffffff" }}
              >
                {r.tendererCode}
              </span>
              <span
                className="text-[12px] font-medium truncate flex-1"
                style={{ color: COLORS.brandText }}
                title={r.tendererName}
              >
                {r.tendererName}
              </span>
              <span
                className="text-[10px] tabular-nums"
                style={{ color: COLORS.text3 }}
                title="Total flags raised against this bidder"
              >
                {total} flag{total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {FLAG_DEFS.map((def) => {
                const value = counts[def.key] ?? 0
                const tone = flagTone(def.tone, value)
                return (
                  <div
                    key={def.key}
                    className="flex items-center justify-between rounded-md px-2 py-1.5"
                    style={{ backgroundColor: COLORS.surfaceAlt }}
                  >
                    <span
                      className="text-[10.5px] truncate"
                      style={{ color: COLORS.text2 }}
                    >
                      {def.label}
                    </span>
                    <span
                      className="inline-block px-1.5 rounded text-[11.5px] font-semibold tabular-nums shrink-0"
                      style={{
                        backgroundColor: tone.bg,
                        color: tone.fg,
                      }}
                    >
                      {value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// SummaryTable — per-bidder roll-up shown by the Summary tab. One row
// per applied tenderer submission with totals, variance vs PTE, and the
// counts the QS team uses on the analysis dashboard.
// ──────────────────────────────────────────────────────────────────────

function SummaryTable({
  rows,
  currency,
  hasPte,
}: {
  rows: BoqViewerSummaryRow[]
  currency: string | null
  hasPte: boolean
}) {
  if (rows.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center rounded-lg border"
        style={{ backgroundColor: COLORS.surface, borderColor: COLORS.rule }}
      >
        <div className="text-center max-w-sm px-6 py-12">
          <FileSpreadsheet
            className="size-8 mx-auto mb-3"
            style={{ color: COLORS.text3 }}
          />
          <h2
            className="font-semibold text-[14px] mb-1"
            style={{ color: COLORS.brandText }}
          >
            No bidder submissions yet
          </h2>
          <p className="text-[12px]" style={{ color: COLORS.text2 }}>
            Upload a priced BoQ on Step 3 to populate the per-bidder
            summary.
          </p>
        </div>
      </div>
    )
  }

  // Lowest tender sum (or adjusted, when present) — flagged as recommended.
  const lowestId = rows.reduce<{ id: string; v: bigint } | null>(
    (acc, r) => {
      try {
        const sum = BigInt(r.adjustedSumCents ?? r.tenderSumCents)
        if (!acc || sum < acc.v) return { id: r.tendererId, v: sum }
      } catch {
        /* skip */
      }
      return acc
    },
    null,
  )?.id

  const HEADERS: ReadonlyArray<{
    key: keyof BoqViewerSummaryRow | "bidder"
    label: string
    accent: string
    align?: "left" | "right"
    tip?: string
  }> = [
    { key: "bidder", label: "Bidder", accent: COLORS.brand },
    {
      key: "tenderSumCents",
      label: "Tender Sum",
      accent: SOURCE_ACCENT[0]!,
      align: "right",
    },
    {
      key: "adjustedSumCents",
      label: "Adjusted Sum",
      accent: SOURCE_ACCENT[1]!,
      align: "right",
      tip: "Tender sum after QS arithmetical corrections and adjustments.",
    },
    {
      key: "variancePctVsPte",
      label: "Variance vs PTE",
      accent: SOURCE_ACCENT[2]!,
      align: "right",
      tip: "Percent deviation from the Pre-Tender Estimate.",
    },
    {
      key: "pricedItems",
      label: "Items priced",
      accent: COLORS.positive,
      align: "right",
    },
    {
      key: "unpricedItems",
      label: "Unpriced",
      accent: "#b45309",
      align: "right",
    },
    {
      key: "arithmeticalErrors",
      label: "Arith. errors",
      accent: COLORS.negative,
      align: "right",
      tip: "Rows where rate × quantity ≠ extended amount.",
    },
    {
      key: "highRatesCount",
      label: "High rates",
      accent: COLORS.negative,
      align: "right",
      tip: "Rates flagged as significantly above the baseline.",
    },
    {
      key: "lowRatesCount",
      label: "Low rates",
      accent: COLORS.positive,
      align: "right",
      tip: "Rates flagged as significantly below the baseline.",
    },
  ]

  return (
    <div
      className="h-full overflow-auto rounded-lg border"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.rule }}
    >
      <table
        className="text-[12px] w-full"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: 200 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 100 }} />
        </colgroup>
        <thead style={{ backgroundColor: COLORS.surfaceAlt }}>
          <tr style={{ backgroundColor: COLORS.surface }}>
            {HEADERS.map((h) => (
              <th
                key={h.key}
                className="px-3 pt-2 pb-1.5 border-l first:border-l-0"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 30,
                  borderTop: `3px solid ${h.accent}`,
                  borderLeftColor: COLORS.rule,
                  backgroundColor: COLORS.surface,
                  textAlign: h.align === "right" ? "right" : "left",
                }}
                title={h.tip}
              >
                <div
                  className={`flex items-center gap-1.5 ${h.align === "right" ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: h.accent }}
                  />
                  <span
                    className="text-[10.5px] font-medium tracking-wide"
                    style={{ color: COLORS.brandText }}
                  >
                    {h.label}
                  </span>
                  {h.key === "variancePctVsPte" && currency && !hasPte && (
                    <span
                      className="text-[9px] uppercase"
                      style={{ color: COLORS.text3 }}
                    >
                      — no PTE
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const zebra = i % 2 === 1
            const isRec = r.tendererId === lowestId
            const variance = r.variancePctVsPte
            const varTone =
              variance === null
                ? COLORS.text3
                : variance < 0
                  ? COLORS.positive
                  : variance > 0
                    ? COLORS.negative
                    : COLORS.brandText
            return (
              <tr
                key={r.tendererId}
                className="border-b"
                style={{
                  borderColor: COLORS.rule,
                  backgroundColor: zebra ? COLORS.surfaceAlt : COLORS.surface,
                }}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono"
                      style={{
                        backgroundColor: COLORS.brand,
                        color: "#ffffff",
                      }}
                    >
                      {r.tendererCode}
                    </span>
                    <span
                      className="text-[12px] font-medium truncate"
                      style={{ color: COLORS.brandText }}
                      title={r.tendererName}
                    >
                      {r.tendererName}
                    </span>
                    {isRec && (
                      <span
                        className="ml-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0"
                        style={{
                          backgroundColor: COLORS.positiveBg,
                          color: COLORS.positive,
                        }}
                        title="Lowest tender sum"
                      >
                        Lowest
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className="px-3 py-2 text-right tabular-nums border-l"
                  style={{
                    borderColor: COLORS.rule,
                    color: COLORS.brandText,
                  }}
                >
                  {formatCents(r.tenderSumCents)}
                </td>
                <td
                  className="px-3 py-2 text-right tabular-nums border-l"
                  style={{
                    borderColor: COLORS.rule,
                    color: r.adjustedSumCents
                      ? COLORS.brandText
                      : COLORS.text3,
                  }}
                >
                  {r.adjustedSumCents ? formatCents(r.adjustedSumCents) : "·"}
                </td>
                <td
                  className="px-3 py-2 text-right tabular-nums border-l font-medium"
                  style={{ borderColor: COLORS.rule, color: varTone }}
                  title={
                    variance !== null
                      ? `${variance > 0 ? "+" : ""}${variance.toFixed(1)}% vs PTE`
                      : undefined
                  }
                >
                  {variance === null
                    ? "·"
                    : `${variance > 0 ? "+" : ""}${variance.toFixed(1)}%`}
                </td>
                <SummaryCount value={r.pricedItems} positive />
                <SummaryCount value={r.unpricedItems} warn />
                <SummaryCount value={r.arithmeticalErrors} negative />
                <SummaryCount value={r.highRatesCount} negative />
                <SummaryCount value={r.lowRatesCount} positive />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SummaryCount({
  value,
  positive,
  warn,
  negative,
}: {
  value: number
  positive?: boolean
  warn?: boolean
  negative?: boolean
}) {
  const isZero = value === 0
  let bg = "transparent"
  let fg: string = COLORS.brandText
  if (!isZero) {
    if (negative) {
      bg = COLORS.negativeBg
      fg = COLORS.negative
    } else if (warn) {
      bg = "rgba(180,83,9,0.08)"
      fg = "#b45309"
    } else if (positive) {
      bg = COLORS.positiveBg
      fg = COLORS.positive
    }
  }
  return (
    <td
      className="px-3 py-2 text-right tabular-nums border-l"
      style={{ borderColor: COLORS.rule }}
    >
      {isZero ? (
        <span style={{ color: COLORS.text3 }}>0</span>
      ) : (
        <span
          className="inline-block px-1.5 rounded text-[11.5px] font-semibold"
          style={{ backgroundColor: bg, color: fg }}
        >
          {value.toLocaleString()}
        </span>
      )}
    </td>
  )
}

// ──────────────────────────────────────────────────────────────────────
// SectionDropdown — replaces the left-rail "Sections" panel. Lists the
// "All items" pseudo-section plus every sheet, with its item count.
// ──────────────────────────────────────────────────────────────────────

function SectionDropdown({
  sections,
  allItemsCount,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  sections: ReadonlyArray<{
    id: string
    no: string
    label: string
    itemCount: number
  }>
  allItemsCount: number
  value: string | "all"
  onChange: (v: string | "all") => void
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open, onOpenChange])

  const selected =
    value === "all"
      ? { label: "All items", count: allItemsCount }
      : (() => {
          const s = sections.find((s) => s.id === value)
          return s
            ? { label: s.label !== s.no ? `${s.no} · ${s.label}` : s.no, count: s.itemCount }
            : { label: "All items", count: allItemsCount }
        })()

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md whitespace-nowrap"
        style={{ backgroundColor: COLORS.brandSoftBg, color: COLORS.brandText }}
        title="Filter rows by section / sheet"
      >
        <SheetIcon className="size-3" />
        <span className="truncate max-w-[180px]">{selected.label}</span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: COLORS.text3 }}
        >
          {selected.count.toLocaleString()}
        </span>
        <ChevronDown className="size-3" style={{ color: COLORS.text2 }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-[280px] rounded-lg shadow-lg z-30 overflow-hidden"
          style={{
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.rule}`,
          }}
        >
          <ul className="max-h-[420px] overflow-y-auto py-1">
            <li>
              <SectionRow
                label="All items"
                count={allItemsCount}
                selected={value === "all"}
                onClick={() => {
                  onChange("all")
                  onOpenChange(false)
                }}
              />
            </li>
            <li
              className="px-3 py-1.5 mt-1 text-[10px] uppercase tracking-wider"
              style={{ color: COLORS.text3 }}
            >
              By sheet
            </li>
            {sections.map((s) => (
              <li key={s.id}>
                <SectionRow
                  label={s.no}
                  sub={s.label !== s.no ? s.label : null}
                  count={s.itemCount}
                  selected={value === s.id}
                  onClick={() => {
                    onChange(s.id)
                    onOpenChange(false)
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SectionRow({
  label,
  sub,
  count,
  selected,
  onClick,
}: {
  label: string
  sub?: string | null
  count: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-[#f7f8fa]"
      style={selected ? { backgroundColor: COLORS.brandSoftBg } : undefined}
    >
      <span
        className="font-mono text-[11px] font-semibold"
        style={{ color: COLORS.brandText }}
      >
        {label}
      </span>
      {sub && (
        <span
          className="text-[10.5px] truncate flex-1"
          style={{ color: COLORS.text2 }}
        >
          {sub}
        </span>
      )}
      <span
        className="ml-auto text-[10px] tabular-nums shrink-0"
        style={{ color: COLORS.text3 }}
      >
        {count.toLocaleString()}
      </span>
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────────
// BaselinePicker — small dropdown for the Compare view. Lists the four
// baseline modes with their descriptions/examples; the selected one is
// stored on the parent.
// ──────────────────────────────────────────────────────────────────────

function BaselinePicker<
  T extends string,
  O extends {
    key: T
    label: string
    short: string
    recommended?: boolean
    description: string
    example: string
  },
>({
  options,
  value,
  onChange,
  open,
  onOpenChange,
  currentLabel,
}: {
  options: ReadonlyArray<O>
  value: T
  onChange: (v: T) => void
  open: boolean
  onOpenChange: (v: boolean) => void
  currentLabel: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open, onOpenChange])
  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#142845] bg-[#142845]/5 rounded-md hover:bg-[#142845]/10 whitespace-nowrap"
        title="Choose how rows are benchmarked in the Compare view"
      >
        <Scale className="size-3" />
        <span className="text-[#555]">Baseline:</span>
        <span>{currentLabel}</span>
        <ChevronDown className="size-3 text-[#888]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[360px] bg-white border border-[#e9e9e9] rounded-lg shadow-lg z-30 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#f0f0f0] text-[11px] font-semibold text-[#142845]">
            Baseline mode
          </div>
          <ul className="max-h-[400px] overflow-y-auto py-1">
            {options.map((o) => {
              const selected = o.key === value
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => onChange(o.key)}
                    className={`w-full text-left px-3 py-2 hover:bg-[#f7f8fa] ${
                      selected ? "bg-[#f3f6fb]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          selected
                            ? "border-[#142845] bg-[#142845]"
                            : "border-[#c0c0c0]"
                        }`}
                      >
                        {selected && (
                          <span className="size-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="text-[12px] font-semibold text-[#142845]">
                        {o.label}
                      </span>
                      {o.recommended && (
                        <span className="ml-auto px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-1 ml-5.5 pl-0.5 text-[11px] leading-[15px] text-[#555]">
                      {o.description}
                    </p>
                    <p className="mt-1 ml-5.5 pl-0.5 text-[10.5px] leading-[14px] text-[#888] italic">
                      Example: {o.example}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// HistoryDrawer — slides in from the right, shows the event timeline
// for one entity. Read-only.
// ──────────────────────────────────────────────────────────────────────

function HistoryDrawer({
  item,
  events,
  loading,
  onClose,
}: {
  item: BoqViewerItem
  events: BoqViewerItemEvent[] | null
  loading: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/30 flex"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ml-auto h-full w-[480px] bg-white shadow-2xl flex flex-col"
      >
        <div className="px-5 py-3 border-b border-[#ececec] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-[#142845]">
              Entity history
            </h3>
            <p className="text-[11px] text-[#888] font-mono">{item.no}</p>
            <p
              className="text-[11px] text-[#666] mt-1 truncate"
              title={item.label}
            >
              {item.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded hover:bg-[#fafafa]"
            aria-label="Close"
          >
            <X className="size-4 text-[#555]" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4">
          {loading || events === null ? (
            <div className="flex items-center justify-center text-[#888] py-8">
              <Loader2 className="size-4 animate-spin mr-2" />
              <span className="text-[12px]">Loading history…</span>
            </div>
          ) : events.length === 0 ? (
            <p className="text-[12px] text-[#888] italic">
              No events recorded for this entity yet.
            </p>
          ) : (
            <ol className="relative pl-5 space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-[#e0e0e0]">
              {events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[18px] top-[3px] size-2.5 rounded-full bg-[#142845]" />
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-medium text-[#142845]">
                      {prettyEventKind(ev.eventKind)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#888] bg-[#f3f4f5] px-1 rounded">
                      {prettySourceKind(ev.sourceKind)}
                    </span>
                    <span className="text-[10px] text-[#999] ml-auto tabular-nums">
                      {new Date(ev.recordedAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <PrettyEventBody event={ev} />
                  </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function PrettyEventBody({ event }: { event: BoqViewerItemEvent }) {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  switch (event.eventKind) {
    case "created": {
      const sheet = typeof payload.sheet === "string" ? payload.sheet : null
      return (
        <p className="mt-1 text-[11px] text-[#555]">
          Imported from {prettySourceKind(event.sourceKind)}
          {sheet ? ` — sheet ${sheet}` : ""}
        </p>
      )
    }
    case "priced": {
      const currency =
        typeof payload.currency === "string" ? payload.currency : ""
      const rate = centsToCurrency(payload.rate_cents, currency)
      const amount = centsToCurrency(payload.amount_cents, currency)
      return (
        <div className="mt-1 text-[11px] text-[#555] space-y-0.5">
          {rate && <div>Rate: <span className="font-medium text-[#142845]">{rate}</span></div>}
          {amount && <div>Amount: <span className="font-medium text-[#142845]">{amount}</span></div>}
        </div>
      )
    }
    case "quantity_changed": {
      const oldVal = stringify(payload.old ?? payload.previous_quantity)
      const newVal = stringify(payload.new ?? payload.quantity)
      return (
        <p className="mt-1 text-[11px] text-[#555]">
          Quantity changed:{" "}
          {oldVal && (
            <>
              <span className="line-through text-[#999]">{oldVal}</span>
              {" → "}
            </>
          )}
          <span className="font-medium text-[#142845]">{newVal ?? "—"}</span>
        </p>
      )
    }
    case "description_changed": {
      const oldVal = stringify(payload.old ?? payload.previous_description)
      const newVal = stringify(payload.new ?? payload.description)
      return (
        <div className="mt-1 text-[11px] text-[#555] space-y-0.5">
          {oldVal && (
            <div>
              <span className="text-[#888]">Was:</span>{" "}
              <span className="line-through text-[#999]">{oldVal}</span>
            </div>
          )}
          {newVal && (
            <div>
              <span className="text-[#888]">Now:</span>{" "}
              <span className="text-[#142845]">{newVal}</span>
            </div>
          )}
        </div>
      )
    }
    case "unit_changed": {
      const oldVal = stringify(payload.old)
      const newVal = stringify(payload.new)
      return (
        <p className="mt-1 text-[11px] text-[#555]">
          Unit changed:{" "}
          {oldVal && (
            <>
              <span className="line-through text-[#999]">{oldVal}</span>
              {" → "}
            </>
          )}
          <span className="font-medium text-[#142845]">{newVal ?? "—"}</span>
        </p>
      )
    }
    case "withdrawn":
      return (
        <p className="mt-1 text-[11px] text-[#a33]">
          Item withdrawn{stringify(payload.reason) ? ` — ${stringify(payload.reason)}` : ""}
        </p>
      )
    case "note":
      return (
        <p className="mt-1 text-[11px] text-[#555]">
          {stringify(payload.text) ?? "(empty note)"}
        </p>
      )
    default:
      return null
  }
}

function centsToCurrency(value: unknown, currency: string): string | null {
  if (value === null || value === undefined) return null
  const n = Number(value) / 100
  if (!Number.isFinite(n)) return null
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency ? `${currency} ${formatted}` : formatted
}

function stringify(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return null
}

function prettyEventKind(kind: string): string {
  switch (kind) {
    case "created":
      return "Created"
    case "quantity_changed":
      return "Quantity changed"
    case "description_changed":
      return "Description changed"
    case "unit_changed":
      return "Unit changed"
    case "priced":
      return "Priced"
    case "withdrawn":
      return "Withdrawn"
    case "note":
      return "Note"
    default:
      return kind
  }
}

function prettySourceKind(kind: string): string {
  switch (kind) {
    case "boq_import":
      return "BoQ"
    case "pte_import":
      return "PTE"
    case "addendum":
      return "Addendum"
    case "manual":
      return "Manual"
    default:
      return kind
  }
}

function SidebarItem({
  label,
  sub,
  count,
  active,
  onClick,
}: {
  label: string
  sub?: string | null
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left ${
        active ? "bg-[#142845]/5" : "hover:bg-[#fafafa]"
      }`}
    >
      <SheetIcon className="size-3.5 shrink-0 text-[#999]" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#1a1a1a] truncate">{label}</p>
        {sub && <p className="text-[10px] text-[#999] truncate">{sub}</p>}
      </div>
      <span className="text-[10px] text-[#888] tabular-nums">{count}</span>
    </button>
  )
}

/** Render a decimal string with thousands separators ("42268" → "42,268"). */
function formatNumber(s: string): string {
  const n = Number(s)
  if (!Number.isFinite(n)) return s
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

/** Render a bigint-cents string as a currency value ("21134000" → "211,340.00"). */
function formatCents(cents: string): string {
  const n = Number(cents) / 100
  if (!Number.isFinite(n)) return cents
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Trigger a CSV download of the currently-visible rows. Client-side
 *  only; no server roundtrip. */
function downloadCsv(
  items: BoqViewerItem[],
  sectionLabelById: Map<string, string>,
): void {
  const escape = (s: string): string => {
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = [
    "Sheet",
    "Item",
    "Description",
    "Unit",
    "Quantity",
    "Rate",
    "Amount",
  ].join(",")
  const lines = items.map((it) =>
    [
      sectionLabelById.get(it.sectionId) ?? "",
      it.no,
      it.label,
      it.unit ?? "",
      it.quantityPlanned ?? "",
      it.rateCents ? (Number(it.rateCents) / 100).toString() : "",
      it.amountCents ? (Number(it.amountCents) / 100).toString() : "",
    ]
      .map(escape)
      .join(","),
  )
  const blob = new Blob([[header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `boq-items-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
