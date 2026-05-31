"use client"

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Minus,
  Search,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  applyTendererSubmission,
  parseTendererSubmission,
  type TendererMatchedRow,
  type TendererSubmissionPreview,
} from "@/modules/procurex/tenderers/submission-actions"

/**
 * Tenderer-submission review modal.
 *
 * Opens after a tenderer's priced BoQ xlsx is uploaded on a Step 3
 * tenderer card. Shows:
 *   • Top summary — match rate, priced/unpriced counts, tender sum
 *   • Three tabs:
 *       Matched     rows that linked to a BoQ entity (priced or unpriced)
 *       Unmatched   rows in the tenderer's file with no BoQ match
 *       Missing     items in the BoQ that the tenderer didn't quote
 *   • Apply button — writes the priceset + rates to the DB.
 *
 * If the file doesn't match the project's BoQ structure at all (zero
 * matches), the Apply button stays disabled and an error explains why.
 */
export function TendererSubmissionReviewModal({
  documentId,
  tendererId,
  tendererName,
  onClose,
  onApplied,
}: {
  documentId: string
  tendererId: string
  tendererName: string
  onClose: () => void
  onApplied: (summary: {
    matched: number
    unpriced: number
    tenderSumCents: string
  }) => void
}) {
  const [loadState, setLoadState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; preview: TendererSubmissionPreview }
  >({ kind: "loading" })
  const [tab, setTab] = useState<"matched" | "unmatched" | "missing">(
    "matched",
  )
  const [query, setQuery] = useState("")
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await parseTendererSubmission(documentId, tendererId)
      if (cancelled) return
      if (!result.ok) {
        setLoadState({ kind: "error", message: result.error })
        return
      }
      setLoadState({ kind: "ready", preview: result })
    })()
    return () => {
      cancelled = true
    }
  }, [documentId, tendererId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !applying) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, applying])

  const preview =
    loadState.kind === "ready" ? loadState.preview : null

  const filteredRows = useMemo(() => {
    if (!preview) return [] as TendererMatchedRow[]
    const q = query.trim().toLowerCase()
    let src: TendererMatchedRow[]
    if (tab === "matched") src = preview.rows.filter((r) => r.matchedItemId)
    else if (tab === "unmatched") src = preview.rows.filter((r) => !r.matchedItemId)
    else src = []
    if (!q) return src
    return src.filter(
      (r) =>
        r.tendererItemRef.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    )
  }, [preview, tab, query])

  const filteredMissing = useMemo(() => {
    if (!preview) return []
    if (tab !== "missing") return []
    const q = query.trim().toLowerCase()
    if (!q) return preview.missingFromSubmission
    return preview.missingFromSubmission.filter(
      (m) =>
        m.no.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q),
    )
  }, [preview, tab, query])

  async function handleApply() {
    if (!preview) return
    setApplying(true)
    setApplyError(null)
    try {
      const result = await applyTendererSubmission({
        documentId,
        tendererId,
      })
      if (!result.ok) {
        setApplyError(result.error)
        setApplying(false)
        return
      }
      onApplied({
        matched: result.matched,
        unpriced: result.unpriced,
        tenderSumCents: result.tenderSumCents,
      })
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err))
      setApplying(false)
    }
  }

  const matchRate =
    preview && preview.stats.totalUploaded > 0
      ? Math.round((preview.stats.matched / preview.stats.totalUploaded) * 100)
      : 0
  const canApply =
    preview !== null && preview.stats.matched > 0 && !applying

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-center p-6"
      onClick={applying ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-full shadow-xl border border-[#e9e9e9] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ececec]">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="font-semibold text-[15px] text-[#142845]">
              Review tenderer submission
            </h3>
            <p className="text-[12px] text-[#666] truncate">
              {tendererName} · priced BoQ
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
            <span className="text-sm">Parsing and matching against the BoQ…</span>
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
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Summary header */}
            <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center gap-6">
              <StatTile
                label="Match rate"
                value={`${matchRate}%`}
                tone={
                  matchRate >= 90 ? "good" : matchRate >= 50 ? "warn" : "bad"
                }
                hint={`${preview!.stats.matched} of ${preview!.stats.totalUploaded} rows matched the BoQ`}
              />
              <StatTile
                label="Priced"
                value={preview!.stats.priced.toLocaleString()}
                tone="good"
                hint={`${preview!.stats.unpriced.toLocaleString()} unpriced`}
              />
              <StatTile
                label="Missing"
                value={preview!.stats.missing.toLocaleString()}
                tone={preview!.stats.missing === 0 ? "good" : "warn"}
                hint="BoQ items not quoted"
              />
              <StatTile
                label="Tender sum"
                value={`AED ${formatCents(preview!.tenderSumCents)}`}
                tone="neutral"
                hint="Sum of all priced amounts"
              />
            </div>

            {/* Tabs */}
            <div className="px-6 py-2 border-b border-[#ececec] flex items-center gap-2">
              <TabButton
                active={tab === "matched"}
                onClick={() => setTab("matched")}
                label={`Matched · ${preview!.stats.matched}`}
              />
              <TabButton
                active={tab === "unmatched"}
                onClick={() => setTab("unmatched")}
                label={`Unmatched · ${preview!.stats.unmatched}`}
                warn={preview!.stats.unmatched > 0}
              />
              <TabButton
                active={tab === "missing"}
                onClick={() => setTab("missing")}
                label={`Missing · ${preview!.stats.missing}`}
                warn={preview!.stats.missing > 0}
              />
              <div className="flex-1 relative max-w-xs ml-auto">
                <Search className="size-3.5 text-[#aaa] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ref or description…"
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#e0e0e0] rounded-md bg-white focus:outline-none focus:border-[#142845]"
                />
              </div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-auto px-6 py-3">
              {tab !== "missing" ? (
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-[#ececec] text-[#888] uppercase tracking-wider text-[10px]">
                      <th className="text-left py-1.5 px-2 w-[110px]">Ref</th>
                      <th className="text-left py-1.5 px-2">Description</th>
                      <th className="text-right py-1.5 px-2 w-[80px]">Qty</th>
                      <th className="text-left py-1.5 px-2 w-[60px]">Unit</th>
                      <th className="text-right py-1.5 px-2 w-[100px]">Rate</th>
                      <th className="text-right py-1.5 px-2 w-[120px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-[#888] italic"
                        >
                          {tab === "matched"
                            ? "No matched rows yet."
                            : "No unmatched rows — every line in the file linked to a BoQ entity."}
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => (
                        <tr
                          key={r.rowIndex}
                          className="border-b border-[#f6f7f9] hover:bg-[#fafbfc]"
                        >
                          <td className="py-1.5 px-2 font-mono text-[11px] text-[#142845]">
                            <div className="flex items-center gap-1">
                              {r.matchedVia === "fuzzy" && (
                                <span
                                  className="text-amber-700"
                                  title="Fuzzy match by description"
                                >
                                  ~
                                </span>
                              )}
                              {r.tendererItemRef}
                            </div>
                          </td>
                          <td
                            className="py-1.5 px-2 truncate max-w-[340px]"
                            title={r.description}
                          >
                            {r.description}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {r.quantity ?? "—"}
                          </td>
                          <td className="py-1.5 px-2">{r.unit ?? "—"}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {r.rateCents ? (
                              formatCents(r.rateCents)
                            ) : (
                              <span className="text-amber-700 text-[11px] italic">
                                unpriced
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {r.amountCents ? formatCents(r.amountCents) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-[#ececec] text-[#888] uppercase tracking-wider text-[10px]">
                      <th className="text-left py-1.5 px-2 w-[110px]">BoQ Ref</th>
                      <th className="text-left py-1.5 px-2">Description</th>
                      <th className="text-left py-1.5 px-2 w-[60px]">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMissing.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-emerald-700 italic"
                        >
                          ✓ The tenderer submitted every item in the BoQ.
                        </td>
                      </tr>
                    ) : (
                      filteredMissing.map((m) => (
                        <tr
                          key={m.itemId}
                          className="border-b border-[#f6f7f9] hover:bg-[#fafbfc]"
                        >
                          <td className="py-1.5 px-2 font-mono text-[11px] text-[#142845]">
                            {m.no}
                          </td>
                          <td
                            className="py-1.5 px-2 truncate max-w-[400px]"
                            title={m.label}
                          >
                            {m.label}
                          </td>
                          <td className="py-1.5 px-2">{m.unit ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {loadState.kind === "ready" && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#ececec]">
            <div className="text-[12px] text-[#666]">
              {preview!.stats.matched === 0 ? (
                <span className="text-red-700">
                  No matches found — this file doesn&apos;t look like the
                  project&apos;s BoQ.
                </span>
              ) : (
                <>
                  {preview!.stats.matched} matched ·{" "}
                  {preview!.stats.unpriced} unpriced ·{" "}
                  {preview!.stats.unmatched > 0 && (
                    <span className="text-amber-700">
                      {preview!.stats.unmatched} unmatched ·{" "}
                    </span>
                  )}
                  {preview!.stats.missing > 0 && (
                    <span className="text-amber-700">
                      {preview!.stats.missing} BoQ items missing
                    </span>
                  )}
                </>
              )}
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
                onClick={handleApply}
                disabled={!canApply}
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
                    Apply submission
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

// ──────────────────────────────────────────────────────────────────────
// Small helpers
// ──────────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone: "good" | "warn" | "bad" | "neutral"
  hint: string
}) {
  const toneColor =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "bad"
          ? "text-red-700"
          : "text-[#142845]"
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-[#888]">
        {label}
      </span>
      <span className={`text-[20px] font-semibold tabular-nums ${toneColor}`}>
        {value}
      </span>
      <span className="text-[11px] text-[#888]">{hint}</span>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  warn,
}: {
  active: boolean
  onClick: () => void
  label: string
  warn?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[12px] font-medium rounded-md inline-flex items-center gap-1.5 ${
        active
          ? "bg-[#142845] text-white"
          : warn
            ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "bg-[#f3f4f5] text-[#555] hover:bg-[#e8eaed]"
      }`}
    >
      {warn && !active && <AlertTriangle className="size-3" />}
      {active && <CheckCircle2 className="size-3" />}
      {label}
    </button>
  )
}

function formatCents(cents: string): string {
  const n = Number(cents) / 100
  if (!Number.isFinite(n)) return cents
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

void Minus
