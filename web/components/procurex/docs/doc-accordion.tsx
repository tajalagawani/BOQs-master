"use client"

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Eye,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react"
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { resetCategoryForProject } from "@/modules/ai-extraction/queue/actions"

import type { DocSpec } from "@/modules/ai-extraction"
import { requestDocumentUpload } from "@/modules/documents/actions"

import { AddendaModal } from "./addenda-modal"
import { AddendaBoqDiffModal } from "./addenda-boq-diff-modal"
import { AddendaWizardModal } from "./addenda-wizard-modal"
import { BoqMappingModal } from "./boq-mapping-modal"
import { DynamicForm } from "./dynamic-form"
import { uploadFileLocally } from "./upload-client"
import { useExtractionLog, type LiveProgress } from "./use-extraction-stream"

type DocStatus =
  | "empty"
  | "manually_filled"
  | "uploading"
  | "extracted"
  | "review_required"
  | "mismatched"

interface AccordionProgress {
  iteration: number
  maxIterations: number
  lastAction: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheCreateTokens?: number
}

interface DocAccordionProps {
  spec: DocSpec<unknown>
  workspaceId: string
  projectId: string
  roundId: string
  initialValue?: Record<string, unknown>
  status?: DocStatus
  fieldsFilled?: number
  fieldsTotal?: number
  /** BoQ-template only — surfaced as a "N items · M sheets" badge. */
  boqImport?: {
    itemsCreated: number
    sectionsCreated: number
  } | null
  /** Tender Addenda only — applied addenda + total events. */
  addendaSummary?: {
    addendaApplied: number
    eventsApplied: number
    latestNo: string | null
  } | null
  /**
   * Current document attached to this category — drives the SSE stream
   * for live agent progress. Null when no doc has been uploaded yet.
   */
  documentId?: string | null
  /** Server-poll fallback progress (used until SSE catches up). */
  progress?: AccordionProgress | null
  /**
   * Agent-extracted verdict. Surfaced via a "Review extracted" icon
   * button; the form does NOT auto-populate. User opens the modal,
   * confirms, and only then are the values applied.
   */
  extractedValue?: Record<string, unknown> | null
  /** V2-15 — final tokens + cost summary from the latest run. */
  runTotals?: {
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_create_tokens: number
    estimated_cost_usd: number
    cached?: boolean
  } | null
  onSave?: (categoryId: string, value: unknown) => Promise<void>
}

const STATUS_LABEL: Record<DocStatus, string> = {
  empty: "Empty",
  manually_filled: "Manually filled",
  uploading: "Extracting…",
  extracted: "Extracted",
  review_required: "Review required",
  mismatched: "Wrong category",
}

const STATUS_STYLES: Record<DocStatus, string> = {
  empty: "bg-gray-100 text-gray-600 border-gray-200",
  manually_filled: "bg-blue-50 text-blue-700 border-blue-200",
  uploading: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse",
  extracted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  review_required: "bg-amber-50 text-amber-700 border-amber-200",
  mismatched: "bg-red-50 text-red-700 border-red-200",
}

function StatusBadge({
  status,
  fieldsFilled,
  fieldsTotal,
}: {
  status: DocStatus
  fieldsFilled?: number
  fieldsTotal?: number
}) {
  return (
    <span
      className={`text-[11px] font-medium px-2.5 py-1 rounded-md border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
      {fieldsFilled !== undefined && fieldsTotal !== undefined ? (
        <> · {fieldsFilled} / {fieldsTotal}</>
      ) : null}
    </span>
  )
}

function DocAccordionImpl({
  spec,
  workspaceId,
  projectId,
  roundId,
  initialValue,
  status = "empty",
  fieldsFilled,
  fieldsTotal,
  documentId,
  progress,
  extractedValue,
  runTotals,
  boqImport,
  addendaSummary,
  onSave,
}: DocAccordionProps) {
  // User-applied extraction. Only set when the user clicks "Apply" in
  // the review modal — until then the form stays as-is (empty or
  // showing whatever the user typed manually).
  const [appliedExtraction, setAppliedExtraction] = useState<
    Record<string, unknown> | null
  >(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  // Once the user clicks Save successfully, hide the Review pill —
  // they've committed values, no need to re-prompt them on every render.
  const [hasSaved, setHasSaved] = useState(false)
  // Show the Review button whenever an extraction has finished — even
  // if the verdict came back empty, the user should be able to open the
  // modal and see that nothing was extracted (versus the button silently
  // disappearing, which looks like a bug). Hides after Save.
  const hasExtractedValue =
    extractedValue !== null && extractedValue !== undefined && !hasSaved
  const [expanded, setExpanded] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const isExtracting = status === "uploading"
  // No more per-accordion EventSource — the parent (Step 2 page) holds
  // a single project-wide SSE channel and pushes the latest progress
  // down via the `progress` prop.
  const liveProgress = progress ?? null
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual")
  const [saveError, setSaveError] = useState<string | null>(null)

  // The form's initialValue is the user-applied extraction (if they
  // clicked Apply in the modal) or the prop-supplied initial state
  // (e.g. previously-saved values). The raw agent verdict in
  // `extractedValue` is NOT auto-applied — the user must confirm.
  const effectiveInitialValue = appliedExtraction ?? initialValue

  // Remount DynamicForm when the effective value changes (e.g. after
  // the user confirms an extraction). Stable identity = no remount =
  // user's in-progress edits survive renders.
  const formKey = useMemo(
    () =>
      effectiveInitialValue
        ? JSON.stringify(effectiveInitialValue).length +
          "|" +
          Object.keys(effectiveInitialValue).length
        : "empty",
    [effectiveInitialValue],
  )

  // Only auto-expand on hard-failure states so the user sees the
  // diagnostic. "extracted" no longer auto-expands — the user can
  // click the eye icon to review extracted values in a modal first.
  useEffect(() => {
    if (status === "review_required" || status === "mismatched") {
      setExpanded(true)
    }
  }, [status])

  const handleReset = useCallback(async () => {
    if (!projectId) return
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Reset ${spec.label}? This will soft-delete the uploaded file, cancel any in-flight extraction, and clear the extracted data.`,
      )
    ) {
      return
    }
    setResetBusy(true)
    try {
      await resetCategoryForProject({
        projectId,
        category: spec.category,
      })
      // Reset local UI state so the accordion goes back to a fresh
      // "Empty" feel without waiting for the next poll tick.
      setAppliedExtraction(null)
      setHasSaved(false)
      setReviewOpen(false)
      setExpanded(false)
    } catch (err) {
      console.error(`[${spec.id}.reset] failed`, err)
    } finally {
      setResetBusy(false)
    }
  }, [projectId, spec])

  const handleSubmit = useCallback(
    async (value: unknown) => {
      setSaveError(null)
      try {
        const parsed = spec.schema.parse(value)
        if (onSave) {
          await onSave(spec.id, parsed)
        } else {
          console.log(`[${spec.id}.save]`, parsed)
        }
        setHasSaved(true)
        // Collapse the accordion on success — the form has been
        // committed and the badge already shows the saved state.
        setExpanded(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed"
        setSaveError(msg)
        throw new Error(msg)
      }
    },
    [spec, onSave],
  )

  return (
    <div className="bg-white rounded-2xl w-full">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#fafafa] rounded-2xl transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col items-start gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[15px] text-[#142845] truncate">
                {spec.label}
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888]">
                {spec.shortLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {spec.required ? (
                <span className="text-[10px] font-semibold text-[#c32a4f]">
                  REQUIRED
                </span>
              ) : (
                <span className="text-[10px] text-[#888]">Optional</span>
              )}
              <StatusBadge
                status={status}
                fieldsFilled={fieldsFilled}
                fieldsTotal={fieldsTotal}
              />
              {runTotals && status === "extracted" ? (
                <span
                  className="text-[10px] text-[#888] font-mono"
                  title={`in:${runTotals.input_tokens.toLocaleString()} out:${runTotals.output_tokens.toLocaleString()} cache r:${runTotals.cache_read_tokens.toLocaleString()} c:${runTotals.cache_create_tokens.toLocaleString()}`}
                >
                  {runTotals.cached
                    ? "cached · $0.00"
                    : `$${runTotals.estimated_cost_usd.toFixed(3)} · ${(
                        runTotals.input_tokens + runTotals.output_tokens
                      ).toLocaleString()} tok`}
                </span>
              ) : null}
              {boqImport && status === "extracted" ? (
                <span
                  className="text-[10px] text-[#142845] font-mono bg-[#142845]/5 px-1.5 py-0.5 rounded"
                  title={`Imported via deterministic xlsx parser — ${boqImport.sectionsCreated} section${boqImport.sectionsCreated === 1 ? "" : "s"}`}
                >
                  {boqImport.itemsCreated.toLocaleString()} items · {boqImport.sectionsCreated} sheets
                </span>
              ) : null}
              {addendaSummary && status === "extracted" ? (
                <span
                  className="text-[10px] text-[#142845] font-mono bg-[#142845]/5 px-1.5 py-0.5 rounded"
                  title={`${addendaSummary.addendaApplied} addenda applied — most recent: ${addendaSummary.latestNo ?? "n/a"}`}
                >
                  {addendaSummary.addendaApplied} addenda · {addendaSummary.eventsApplied.toLocaleString()} events
                </span>
              ) : null}
              {hasExtractedValue && status === "extracted" ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    setReviewOpen(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                      e.preventDefault()
                      setReviewOpen(true)
                    }
                  }}
                  title="Review AI-extracted values"
                  className="inline-flex items-center gap-1 cursor-pointer text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md px-2 py-1"
                >
                  <Eye className="size-3" />
                  Review
                  {appliedExtraction ? (
                    <CheckCircle2 className="size-3 fill-emerald-600 stroke-white" />
                  ) : null}
                </span>
              ) : null}
              {/* Reset — only meaningful when there's any state to clear */}
              {status !== "empty" && projectId ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!resetBusy) void handleReset()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                      e.preventDefault()
                      if (!resetBusy) void handleReset()
                    }
                  }}
                  title="Reset this category — soft-delete the uploaded file, cancel in-flight extractions, clear extracted data."
                  className={`inline-flex items-center gap-1 cursor-pointer text-[10px] text-[#555] hover:text-[#c32a4f] bg-[#fafafa] hover:bg-red-50 border border-[#e3e3e3] hover:border-red-200 rounded-md px-2 py-1 ${
                    resetBusy ? "opacity-50 cursor-wait" : ""
                  }`}
                >
                  {resetBusy ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3" />
                  )}
                  Reset
                </span>
              ) : null}
              {liveProgress && isExtracting && !expanded ? (
                <span className="text-[10px] text-amber-700 flex items-center gap-1.5 font-mono tabular-nums">
                  <Loader2 className="size-3 animate-spin" />
                  iter {liveProgress.iteration}/{liveProgress.maxIterations}
                  <span className="font-sans text-[#555] truncate max-w-[280px]">
                    · {liveProgress.lastAction}
                  </span>
                  {liveProgress.inputTokens != null && liveProgress.inputTokens > 0 ? (
                    <span className="text-[10px] text-[#888]">
                      · {liveProgress.inputTokens}→{liveProgress.outputTokens}
                      {liveProgress.cacheReadTokens
                        ? ` · cache r${liveProgress.cacheReadTokens}/c${liveProgress.cacheCreateTokens}`
                        : ""}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center rounded-lg size-9 shrink-0">
          {expanded ? (
            <ChevronUp className="size-4 text-[#142845]" />
          ) : (
            <ChevronDown className="size-4 text-[#142845]" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="px-6 pb-6">
          {isExtracting && documentId ? (
            // ── Live log view ────────────────────────────────────────
            // While the agent is iterating, hide the form/upload tabs
            // and show the full streaming log instead.
            <ExtractionLogPanel
              documentId={documentId}
              maxIterations={liveProgress?.maxIterations}
            />
          ) : (
            <>
              {/* Tab pill switcher */}
              <div className="bg-[#e9e9e9] flex h-[32px] items-start p-[4px] rounded-[50px] w-fit mt-4 mb-5">
                {(["manual", "upload"] as const).map((tab) => {
                  const isActive = activeTab === tab
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex h-full items-center justify-center px-4 rounded-[500px] whitespace-nowrap text-[12px] leading-[16px] ${
                        isActive
                          ? "bg-white font-medium text-black drop-shadow-[0_6px_8.5px_rgba(0,0,0,0.08)]"
                          : "font-normal text-[#262626]"
                      }`}
                    >
                      {tab === "manual" ? "Enter manually" : "Upload & extract"}
                    </button>
                  )
                })}
              </div>

              {activeTab === "manual" ? (
                <DynamicForm
                  key={formKey}
                  fields={spec.manualFields}
                  initialValue={effectiveInitialValue}
                  onSubmit={handleSubmit}
                  submitLabel={`Save ${spec.shortLabel}`}
                  disabled={spec.manualFeasible === "no"}
                />
              ) : (
                <UploadPanel
                  spec={spec}
                  workspaceId={workspaceId}
                  projectId={projectId}
                  roundId={roundId}
                  currentStatus={status}
                />
              )}

              {saveError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {reviewOpen && hasExtractedValue ? (
        <ReviewExtractionModal
          spec={spec}
          extractedValue={extractedValue as Record<string, unknown>}
          onClose={() => setReviewOpen(false)}
          onApply={async (value) => {
            if (spec.manualFeasible === "no") {
              // BOQ / Specification — no inline form, commit straight to DB.
              try {
                await handleSubmit(value)
                setReviewOpen(false)
              } catch {
                /* error already surfaced via setSaveError */
              }
              return
            }
            // Editable specs — prefill the inline form, user reviews + clicks Save.
            setAppliedExtraction(value)
            setExpanded(true)
            setReviewOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * Memoised export. Re-renders only when one of the props that actually
 * affects render output changes — not every time the Step 2 parent
 * re-renders (which happens on every poll tick and every other
 * accordion's status change).
 */
export const DocAccordion = memo(DocAccordionImpl, (a, b) => {
  return (
    a.spec === b.spec &&
    a.workspaceId === b.workspaceId &&
    a.projectId === b.projectId &&
    a.roundId === b.roundId &&
    a.status === b.status &&
    a.documentId === b.documentId &&
    a.initialValue === b.initialValue &&
    a.extractedValue === b.extractedValue &&
    a.fieldsFilled === b.fieldsFilled &&
    a.fieldsTotal === b.fieldsTotal &&
    a.onSave === b.onSave &&
    // progress is the high-frequency one; compare by content not identity
    progressEqual(a.progress, b.progress)
  )
})

function progressEqual(
  a: DocAccordionProps["progress"],
  b: DocAccordionProps["progress"],
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.iteration === b.iteration &&
    a.maxIterations === b.maxIterations &&
    a.lastAction === b.lastAction
  )
}

// ─────────────────────────────────────────────────────────────────────
// ReviewExtractionModal — opens on click of the eye icon. Shows the
// agent-extracted values as nested key/value pairs. User clicks Apply
// to populate the form, or Cancel to leave the form untouched.
// ─────────────────────────────────────────────────────────────────────

function ReviewExtractionModal({
  spec,
  extractedValue,
  onClose,
  onApply,
}: {
  spec: DocSpec<unknown>
  extractedValue: Record<string, unknown>
  onClose: () => void
  onApply: (value: Record<string, unknown>) => void
}) {
  // Esc + click-outside to close. The overlay catches outside clicks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const populatedCount = Object.values(extractedValue).filter(
    (v) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
  ).length

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl border border-[#e9e9e9]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-[15px] text-[#142845]">
              Review AI-extracted values
            </h3>
            <p className="text-[12px] text-[#555]">
              {spec.label} · {populatedCount} field
              {populatedCount === 1 ? "" : "s"} populated · review &amp; apply
              to the form.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg hover:bg-[#fafafa]"
            aria-label="Close"
          >
            <X className="size-4 text-[#555]" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {spec.manualFeasible === "no" ? (
            <VerdictViewer value={extractedValue} />
          ) : (
            <DynamicForm
              fields={spec.manualFields}
              initialValue={extractedValue}
              onSubmit={(v) => onApply(v as Record<string, unknown>)}
              formId="review-extract-form"
              hideSubmit
            />
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t border-[#f0f0f0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg"
          >
            Cancel
          </button>
          {spec.manualFeasible === "no" ? (
            <button
              type="button"
              onClick={() => onApply(extractedValue)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#142845] hover:bg-[#0a1426] rounded-lg"
            >
              Save
            </button>
          ) : (
            <button
              type="submit"
              form="review-extract-form"
              className="px-4 py-2 text-sm font-medium text-white bg-[#142845] hover:bg-[#0a1426] rounded-lg"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// VerdictViewer — read-only display of the agent's verdict for specs
// where manualFeasible === "no" (BOQ, Specification). Renders scalars
// as labelled rows, arrays of objects as tables.
// ─────────────────────────────────────────────────────────────────────

function VerdictViewer({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(
    ([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
  )
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#888] italic">
        No verdict fields populated yet.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {entries.map(([key, v]) => (
        <VerdictField key={key} label={key} value={v} />
      ))}
    </div>
  )
}

function VerdictField({ label, value }: { label: string; value: unknown }) {
  const prettyLabel = label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    const allObjects = value.every(
      (r) => r !== null && typeof r === "object" && !Array.isArray(r),
    )
    // If every row has an inner array-of-objects (e.g. BOQ bills[].items[]),
    // render each row as its own sub-section instead of cramming JSON in a cell.
    const containsNestedArrayOfObjects =
      allObjects &&
      value.some((r) =>
        Object.values(r as Record<string, unknown>).some(
          (v) =>
            Array.isArray(v) &&
            v.length > 0 &&
            v.every((x) => x !== null && typeof x === "object" && !Array.isArray(x)),
        ),
      )
    if (allObjects && containsNestedArrayOfObjects) {
      return (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#555] font-semibold mb-1.5">
            {prettyLabel}{" "}
            <span className="text-[#888] normal-case font-normal">
              · {value.length} group{value.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {value.map((row, i) => (
              <div
                key={i}
                className="rounded-lg border border-[#e9e9e9] bg-[#fafafa] p-3 flex flex-col gap-2"
              >
                {Object.entries(row as Record<string, unknown>).map(([k, v]) => (
                  <VerdictField key={k} label={k} value={v} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (allObjects) {
      const cols = Array.from(
        new Set(value.flatMap((r) => Object.keys(r as Record<string, unknown>))),
      )
      return (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#555] font-semibold mb-1.5">
            {prettyLabel}{" "}
            <span className="text-[#888] normal-case font-normal">
              · {value.length} row{value.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#e9e9e9]">
            <table className="w-full text-[12px]">
              <thead className="bg-[#fafafa]">
                <tr>
                  {cols.map((c) => (
                    <th
                      key={c}
                      className="text-left px-3 py-2 font-medium text-[#444] border-b border-[#eaeaea]"
                    >
                      {c.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.map((r, i) => {
                  const row = r as Record<string, unknown>
                  return (
                    <tr key={i} className="border-b border-[#f3f3f3] last:border-0">
                      {cols.map((c) => (
                        <td key={c} className="px-3 py-1.5 text-[#222] align-top">
                          {formatScalar(row[c])}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
    return (
      <div>
        <div className="text-[11px] uppercase tracking-wider text-[#555] font-semibold mb-1.5">
          {prettyLabel}
        </div>
        <ul className="list-disc list-inside text-[12px] text-[#222] space-y-0.5">
          {value.map((v, i) => (
            <li key={i}>{formatScalar(v)}</li>
          ))}
        </ul>
      </div>
    )
  }
  if (value !== null && typeof value === "object") {
    return (
      <div>
        <div className="text-[11px] uppercase tracking-wider text-[#555] font-semibold mb-1.5">
          {prettyLabel}
        </div>
        <div className="rounded-lg border border-[#e9e9e9] bg-[#fafafa] p-3 grid grid-cols-2 gap-1.5 text-[12px]">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <Fragment key={k}>
              <div className="text-[#666]">{k}</div>
              <div className="text-[#222]">{formatScalar(v)}</div>
            </Fragment>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 items-baseline text-[12px]">
      <div className="text-[#666] font-medium">{prettyLabel}</div>
      <div className="text-[#222]">{formatScalar(value)}</div>
    </div>
  )
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "boolean") return v ? "Yes" : "No"
  if (Array.isArray(v))
    return v.map((x) => formatScalar(x)).filter((s) => s !== "—").join(", ")
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

// ─────────────────────────────────────────────────────────────────────
// ExtractionLogPanel — full streaming log of the agent's iterations.
// Replaces the form/upload tabs while a job is in flight.
// ─────────────────────────────────────────────────────────────────────

function ExtractionLogPanel({
  documentId,
  maxIterations,
}: {
  documentId: string
  maxIterations?: number
}) {
  const { events } = useExtractionLog(documentId)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Auto-scroll to latest iteration as new events arrive.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [events.length])

  const cap = maxIterations ?? events[events.length - 1]?.maxIterations ?? 500
  const last = events[events.length - 1]

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-amber-700" />
          <h4 className="text-[13px] font-semibold text-[#142845]">
            Agent log
          </h4>
          <span className="text-[11px] text-[#888] font-mono tabular-nums">
            iter {last?.iteration ?? 0}/{cap}
          </span>
        </div>
        <span className="text-[10px] text-[#888]">
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="font-mono text-[11px] leading-relaxed min-h-[44px]">
        {events.length === 0 ? (
          <p className="text-[#888] italic">
            Waiting for the agent's first iteration…
          </p>
        ) : (
          <LogLine event={events[events.length - 1]!} />
        )}
      </div>

      <p className="text-[11px] text-[#888]">
        While the agent is running, the form is hidden. It'll come back the
        moment a verdict lands — review the extracted values via the modal
        before they're applied.
      </p>
    </div>
  )
}

function LogLine({ event: e }: { event: LiveProgress }) {
  const totalTokens =
    (e.inputTokens ?? 0) + (e.outputTokens ?? 0)
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[#0a1426] flex-1 break-words">
        {e.lastAction}
      </span>
      {totalTokens > 0 ? (
        <span className="text-[#555] tabular-nums shrink-0 whitespace-nowrap">
          {e.inputTokens}→{e.outputTokens}
          {e.cacheReadTokens
            ? ` · r${e.cacheReadTokens}/c${e.cacheCreateTokens}`
            : ""}
        </span>
      ) : (
        <span className="text-[#888] tabular-nums shrink-0 italic">
          streaming…
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// UploadPanel — real, single-category upload pipeline
// ─────────────────────────────────────────────────────────────────────

type UploadStage = "idle" | "uploading" | "blob-done" | "error"

function UploadPanel({
  spec,
  workspaceId,
  projectId,
  roundId,
  currentStatus,
}: {
  spec: DocSpec<unknown>
  workspaceId: string
  projectId: string
  roundId: string
  currentStatus: DocStatus
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<UploadStage>("idle")
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [percent, setPercent] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  // BoQ-template path: track the most-recent uploaded doc id + whether
  // the column-mapping modal is open + the import summary (so the row
  // can show "N items imported" after Apply).
  const [boqDocId, setBoqDocId] = useState<string | null>(null)
  const [boqModalOpen, setBoqModalOpen] = useState(false)
  const [boqImportedSummary, setBoqImportedSummary] = useState<
    { itemsCreated: number } | null
  >(null)
  // Addenda — two modal entry points depending on the uploaded file:
  //   • .xlsx → diff modal that shows only changed items vs the BoQ
  //   • .pdf  → cover-PDF modal (kept for future Q&A flow)
  // Addenda are numbered sequentially per project (TA1, TA2, …) based
  // on upload order — the resulting addendum_no comes back from the
  // server and surfaces in the row status text.
  const [addendaDocId, setAddendaDocId] = useState<string | null>(null)
  const [addendaModalOpen, setAddendaModalOpen] = useState(false)
  const [addendaDiffModalOpen, setAddendaDiffModalOpen] = useState(false)
  // New wizard — opens BEFORE any upload. User picks file types,
  // uploads each, and only then the diff/cover review steps trigger.
  const [addendaWizardOpen, setAddendaWizardOpen] = useState(false)
  const [addendaImportedSummary, setAddendaImportedSummary] = useState<
    { addendumNo?: string; addendaCreated?: number; eventsApplied: number } | null
  >(null)

  const canUpload = Boolean(workspaceId && projectId)

  async function startUpload(file: File) {
    if (!canUpload) {
      setError("Save the project (Step 1) before uploading documents.")
      return
    }
    setStage("uploading")
    setError(null)
    setFilename(file.name)
    setPercent(0)

    try {
      const handle = await requestDocumentUpload({
        workspaceId,
        projectId,
        targetKind: "project",
        targetId: projectId,
        scope: spec.scope,
        category: spec.category,
        filename: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
      })

      await uploadFileLocally({
        documentId: handle.documentId,
        file,
        onProgress: (p) => setPercent(p),
      })

      setStage("blob-done")
      setPercent(100)

      // BoQ-template, PTE, and Addenda all skip the AI workflow and
      // open a deterministic-parser modal straight after upload.
      if (spec.id === "boq-template" || spec.id === "pte") {
        setBoqDocId(handle.documentId)
        setBoqImportedSummary(null)
        setBoqModalOpen(true)
      }
      // Note: addenda intentionally do NOT trigger any modal from the
      // drop zone. The user opens the wizard from the "Add Tender
      // Addenda" button on the row and uploads inside the wizard.
    } catch (err) {
      setStage("error")
      setError(err instanceof Error ? err.message : "Upload failed")
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void startUpload(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void startUpload(file)
  }

  // Once the queue picks the job up, the parent's `currentStatus` will flip
  // to "uploading" (queued/running) and then "extracted" — so once we're
  // past blob-done, the per-accordion badge above takes over visually.

  return (
    <div className="flex flex-col gap-4 items-start w-full">
      {spec.id === "addenda" ? (
        // Addenda go through the wizard — no drop zone here. The
        // wizard opens with a single button and handles all uploads
        // internally so the user picks the file type first.
        <div className="relative flex flex-col gap-3 min-h-[200px] items-center justify-center w-full rounded-xl border-2 border-dashed bg-[rgba(226,237,247,0.5)] border-[#b9d2eb]">
          <CloudUpload className="size-7 text-[#142845]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-[13px] font-medium text-[#142845]">
              Add a new Tender Addendum
            </p>
            <p className="text-[11px] text-[#888]">
              Cover PDF · BoQ Excel · SOPR · Specs · Q&amp;A
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddendaWizardOpen(true)}
            disabled={!canUpload}
            className="bg-[#142845] flex gap-2 items-center justify-center px-4 py-2 rounded-xl hover:bg-[#0e1d34] disabled:bg-[#c4c4c4] disabled:cursor-not-allowed"
          >
            <Upload className="size-3.5 text-white" />
            <span className="font-medium text-white text-xs">
              {addendaImportedSummary
                ? `Add another addendum`
                : "Add Tender Addenda"}
            </span>
          </button>
          {addendaImportedSummary && (
            <p className="text-[11px] text-emerald-700 mt-1">
              ✓ {addendaImportedSummary.addendumNo} applied ·{" "}
              {addendaImportedSummary.eventsApplied} events
            </p>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col gap-3 min-h-[200px] items-center justify-center w-full rounded-xl border-2 border-dashed transition-colors ${
            dragOver
              ? "bg-[rgba(20,40,69,0.06)] border-[#142845]"
              : "bg-[rgba(226,237,247,0.5)] border-[#b9d2eb]"
          }`}
        >
          <CloudUpload className="size-7 text-[#142845]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-[13px] font-medium text-[#142845]">
              Drag &amp; drop your {spec.shortLabel} here
            </p>
            <p className="text-[11px] text-[#888]">
              PDF, DOCX, XLSX accepted · max 50 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={handleFileInput}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canUpload || stage === "uploading"}
            className="bg-[#142845] flex gap-2 items-center justify-center px-4 py-2 rounded-xl hover:bg-[#0e1d34] disabled:bg-[#c4c4c4] disabled:cursor-not-allowed"
          >
            <Upload className="size-3.5 text-white" />
            <span className="font-medium text-white text-xs">
              {stage === "uploading" ? "Uploading…" : "Browse files"}
            </span>
          </button>
        </div>
      )}

      {filename ? (
        <div className="flex items-center gap-2 text-[12px] text-[#142845] w-full bg-[#fafafa] border border-[#eee] rounded-lg px-3 py-2">
          {stage === "uploading" ? (
            <Loader2 className="size-4 animate-spin text-amber-700" />
          ) : stage === "error" ? (
            <AlertCircle className="size-4 text-red-700" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-600" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">{filename}</p>
            {stage === "uploading" ? (
              <div className="h-1 mt-1 bg-[#eee] rounded overflow-hidden">
                <div
                  className="h-full bg-[#142845] transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}
          </div>
          <span className="text-[10px] text-[#888]">
            {stage === "uploading"
              ? `${percent}%`
              : stage === "blob-done"
                ? spec.id === "boq-template" || spec.id === "pte"
                  ? boqImportedSummary
                    ? `${boqImportedSummary.itemsCreated.toLocaleString()} items imported`
                    : "Ready to map"
                  : spec.id === "addenda"
                    ? addendaImportedSummary
                      ? `${addendaImportedSummary.addendumNo ?? "Addendum"} applied · ${addendaImportedSummary.eventsApplied} event${addendaImportedSummary.eventsApplied === 1 ? "" : "s"}`
                      : "Ready to review"
                    : currentStatus === "uploading"
                      ? "Extracting…"
                      : "Uploaded"
                : stage === "error"
                  ? "Failed"
                  : ""}
          </span>
          {(spec.id === "boq-template" || spec.id === "pte") &&
            stage === "blob-done" &&
            boqDocId && (
              <button
                type="button"
                onClick={() => setBoqModalOpen(true)}
                className="ml-2 px-2 py-1 text-[11px] font-medium text-white bg-[#142845] rounded hover:bg-[#0e1d34]"
              >
                {boqImportedSummary ? "Re-map" : "Map columns"}
              </button>
            )}
          {spec.id === "addenda" && (
            <button
              type="button"
              onClick={() => setAddendaWizardOpen(true)}
              className="ml-2 px-2 py-1 text-[11px] font-medium text-white bg-[#142845] rounded hover:bg-[#0e1d34]"
            >
              {addendaImportedSummary ? "Add another" : "Add Tender Addenda"}
            </button>
          )}
        </div>
      ) : null}

      {addendaModalOpen && addendaDocId && (
        <AddendaModal
          documentId={addendaDocId}
          defaultName={filename ?? undefined}
          onClose={() => setAddendaModalOpen(false)}
          onImported={(summary) => {
            setAddendaModalOpen(false)
            setAddendaImportedSummary(summary)
          }}
        />
      )}

      {addendaDiffModalOpen && addendaDocId && (
        <AddendaBoqDiffModal
          documentId={addendaDocId}
          defaultName={filename ?? undefined}
          onClose={() => setAddendaDiffModalOpen(false)}
          onApplied={(summary) => {
            setAddendaDiffModalOpen(false)
            setAddendaImportedSummary({
              addendumNo: summary.addendumNo,
              eventsApplied: summary.eventsApplied,
            })
          }}
        />
      )}

      {addendaWizardOpen && (
        <AddendaWizardModal
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setAddendaWizardOpen(false)}
          onApplied={(summary) => {
            setAddendaWizardOpen(false)
            setAddendaImportedSummary({
              addendumNo: summary.addendumNo,
              eventsApplied: summary.eventsApplied,
            })
          }}
        />
      )}

      {boqModalOpen && boqDocId && (
        <BoqMappingModal
          documentId={boqDocId}
          projectId={projectId}
          mode={spec.id === "pte" ? "pte" : "boq"}
          defaultName={filename ? filename.replace(/\.xlsx$/i, "") : undefined}
          onClose={() => setBoqModalOpen(false)}
          onImported={(summary) => {
            setBoqModalOpen(false)
            setBoqImportedSummary({ itemsCreated: summary.itemsCreated })
          }}
        />
      )}

      {!canUpload ? (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-full">
          Save Step 1 first so we have a project to attach the upload to.
        </div>
      ) : null}

      {error ? (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">
          {error}
        </div>
      ) : null}

      <div className="text-[11px] text-[#888] flex items-center gap-1.5">
        <CheckCircle2 className="size-3 text-emerald-500 fill-emerald-500 stroke-white" />
        AI agent reads this file per{" "}
        <code className="text-[#142845]">{spec.agentSpecPath}</code> ·{" "}
        round&nbsp;
        <span className="font-mono">{roundId || "—"}</span>
      </div>
    </div>
  )
}
