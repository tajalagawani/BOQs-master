"use client"

import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  applyAddendaBoqDiff,
  parseAddendaDocument,
  previewAddendaBoqDiff,
  type AddendumPreview,
  type BoqDiffPreview,
} from "@/modules/procurex/addenda/actions"
import type { ProposedDiffEvent } from "@/modules/procurex/addenda/boq-diff"
import {
  applyAddendaSpecDiff,
  previewAddendaSpecDiff,
} from "@/modules/procurex/addenda/spec-diff-actions"
import type { ProposedFieldEvent } from "@/modules/procurex/addenda/diffs/types"
import { requestDocumentUpload } from "@/modules/documents/actions"

import { uploadFileLocally } from "./upload-client"

/**
 * Add Tender Addenda — wizard modal.
 *
 * Step 0 (`pick`)   pick the file types for this addendum + upload each
 *                   one. Nothing is parsed until the user clicks Next.
 * Step 1 (`boq`)    if a BoQ xlsx was uploaded, show the diff against
 *                   the project's effective BoQ. User confirms which
 *                   changes to apply.
 * Step 2 (`other`)  walk the other uploaded files in order, showing
 *                   what was found (cover narrative, SOPR/Spec/Q&A
 *                   attachments). The user just acknowledges each.
 * Step 3 (`apply`)  confirm summary + Apply button. On success, the
 *                   resulting addendum is auto-numbered TA(N+1).
 *
 * Files upload to the server as they're picked (each becomes a `document`
 * row) but stay UNPROCESSED — the per-step parsing only fires when the
 * user clicks Next.
 */

interface FileKind {
  id: "boq" | "cover" | "fot" | "itt" | "coc" | "sopr" | "spec" | "qa"
  label: string
  description: string
  icon: typeof FileSpreadsheet
  accept: string
  /** spec.category to record on the document row. */
  category: string
  /** spec.scope for the document row. */
  scope: string
  /** If set, addenda's review step routes through the existing
   *  extraction agent for this spec id (FOT/ITT/COC/SOPR), then diffs
   *  the verdict against the project's current persisted state. */
  agentSpecId?: "fot" | "itt" | "coc" | "sopr"
}

const FILE_KINDS: FileKind[] = [
  {
    id: "boq",
    label: "BoQ Excel",
    description: "Revised Bill of Quantities (xlsx) — diffed against the project BoQ",
    icon: FileSpreadsheet,
    accept: ".xlsx",
    category: "Tender Addendum",
    scope: "ta",
  },
  {
    id: "cover",
    label: "Cover PDF",
    description: "Addendum narrative + index + queries",
    icon: FileText,
    accept: ".pdf",
    category: "Tender Addendum",
    scope: "ta",
  },
  {
    id: "fot",
    label: "FOT amendment",
    description: "Revised Form of Tender — extracted by AI, diffed against current",
    icon: FileText,
    accept: ".pdf",
    category: "Tender Addendum",
    scope: "ta",
    agentSpecId: "fot",
  },
  {
    id: "itt",
    label: "ITT amendment",
    description: "Revised Instructions to Tenderer — extracted by AI, diffed against current",
    icon: FileText,
    accept: ".pdf",
    category: "Tender Addendum",
    scope: "ta",
    agentSpecId: "itt",
  },
  {
    id: "coc",
    label: "COC amendment",
    description: "Revised Conditions of Contract — extracted by AI, diffed against current",
    icon: FileText,
    accept: ".pdf",
    category: "Tender Addendum",
    scope: "ta",
    agentSpecId: "coc",
  },
  {
    id: "sopr",
    label: "SOPR amendment",
    description: "Revised Schedule of Project Requirements — extracted by AI, diffed against current",
    icon: FileText,
    accept: ".pdf",
    category: "Tender Addendum",
    scope: "ta",
    agentSpecId: "sopr",
  },
  {
    id: "spec",
    label: "Specifications",
    description: "Specification updates — attached only (no auto-diff yet)",
    icon: FileText,
    accept: ".pdf",
    category: "Tender Addendum",
    scope: "ta",
  },
  {
    id: "qa",
    label: "Q&A / TQ",
    description: "Tenderer queries answered separately",
    icon: FileText,
    accept: ".pdf",
    category: "Tender Addendum",
    scope: "ta",
  },
]

type WizardStep =
  | "pick"
  | "boq"
  | "cover"
  | "fot"
  | "itt"
  | "coc"
  | "sopr"
  | "spec"
  | "qa"
  | "apply"

type AgentSpecId = "fot" | "itt" | "coc" | "sopr"
const AGENT_SPECS: AgentSpecId[] = ["fot", "itt", "coc", "sopr"]

interface UploadedFile {
  documentId: string
  filename: string
  sizeBytes: number
}

export function AddendaWizardModal({
  workspaceId,
  projectId,
  onClose,
  onApplied,
}: {
  workspaceId: string
  projectId: string
  onClose: () => void
  onApplied: (summary: { addendumNo: string; eventsApplied: number }) => void
}) {
  // Per-kind list of uploaded files + per-kind upload progress state.
  // Each kind can hold MANY files (e.g. an addendum often comes with
  // 4-5 separate spec PDFs that all belong under "Specifications").
  const [uploads, setUploads] = useState<
    Partial<Record<FileKind["id"], UploadedFile[]>>
  >({})
  const [uploadingKind, setUploadingKind] = useState<FileKind["id"] | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [step, setStep] = useState<WizardStep>("pick")
  const [diffPreview, setDiffPreview] = useState<BoqDiffPreview | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [confirmedDiffIndices, setConfirmedDiffIndices] = useState<Set<number>>(
    new Set(),
  )

  const [coverPreview, setCoverPreview] = useState<AddendumPreview | null>(null)
  const [coverLoading, setCoverLoading] = useState(false)

  // Per-agent-spec diff state: { events, confirmed indices, loading flag }.
  type SpecDiffState = {
    events: ProposedFieldEvent[]
    confirmed: Set<number>
    loading: boolean
    error: string | null
  }
  const [specDiffs, setSpecDiffs] = useState<
    Partial<Record<AgentSpecId, SpecDiffState>>
  >({})

  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  // Esc closes (unless we're uploading or applying mid-step).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploadingKind && !applying) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, uploadingKind, applying])

  // Steps that have content to show after `pick`. We only enter a step
  // when its kind has at least one uploaded file. Order matters — BoQ
  // first (deterministic), then the four agent-backed specs in canonical
  // order, then attachment-only steps.
  const reviewSteps = useMemo<WizardStep[]>(() => {
    const out: WizardStep[] = []
    if ((uploads.boq ?? []).length > 0) out.push("boq")
    if ((uploads.cover ?? []).length > 0) out.push("cover")
    if ((uploads.fot ?? []).length > 0) out.push("fot")
    if ((uploads.itt ?? []).length > 0) out.push("itt")
    if ((uploads.coc ?? []).length > 0) out.push("coc")
    if ((uploads.sopr ?? []).length > 0) out.push("sopr")
    if ((uploads.spec ?? []).length > 0) out.push("spec")
    if ((uploads.qa ?? []).length > 0) out.push("qa")
    return out
  }, [uploads])

  function uploadFor(kind: FileKind) {
    return async (files: File[]) => {
      if (files.length === 0) return
      setUploadingKind(kind.id)
      setUploadError(null)
      try {
        // Upload each picked file sequentially. Append to the kind's
        // list rather than replacing.
        for (const file of files) {
          const handle = await requestDocumentUpload({
            workspaceId,
            projectId,
            targetKind: "project",
            targetId: projectId,
            scope: kind.scope,
            category: kind.category,
            filename: file.name,
            mimeType: file.type || null,
            sizeBytes: file.size,
          })
          await uploadFileLocally({ documentId: handle.documentId, file })
          setUploads((prev) => ({
            ...prev,
            [kind.id]: [
              ...(prev[kind.id] ?? []),
              {
                documentId: handle.documentId,
                filename: file.name,
                sizeBytes: file.size,
              },
            ],
          }))
        }
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload failed",
        )
      } finally {
        setUploadingKind(null)
      }
    }
  }

  /** Remove ONE file from a kind by its documentId. The empty list
   *  for a kind is allowed — the kind still shows in the picker even
   *  after the last file is removed. */
  function removeUpload(kindId: FileKind["id"], documentId: string) {
    setUploads((prev) => {
      const next = { ...prev }
      const list = (next[kindId] ?? []).filter(
        (u) => u.documentId !== documentId,
      )
      if (list.length === 0) delete next[kindId]
      else next[kindId] = list
      return next
    })
  }

  /** Pick the first BoQ file for the diff (most addenda only contain
   *  one revised workbook; multi-BoQ support could come later). */
  const primaryBoqId = uploads.boq?.[0]?.documentId ?? null
  const primaryCoverId = uploads.cover?.[0]?.documentId ?? null

  async function goNext() {
    setUploadError(null)
    if (step === "pick") {
      const nextStep = reviewSteps[0] ?? "apply"
      if (nextStep === "boq" && primaryBoqId) {
        setStep("boq")
        setDiffLoading(true)
        try {
          const result = await previewAddendaBoqDiff(primaryBoqId)
          if (result.ok) {
            setDiffPreview(result)
            setConfirmedDiffIndices(
              new Set(result.events.map((_, i) => i)),
            )
          } else {
            setApplyError(result.error)
          }
        } finally {
          setDiffLoading(false)
        }
      } else if (nextStep === "cover" && primaryCoverId) {
        await loadCover()
        setStep("cover")
      } else if (
        nextStep === "fot" ||
        nextStep === "itt" ||
        nextStep === "coc" ||
        nextStep === "sopr"
      ) {
        setStep(nextStep)
        await loadSpecDiff(nextStep)
      } else {
        setStep(nextStep)
      }
      return
    }
    const currentIdx = reviewSteps.indexOf(step as WizardStep)
    const nextIdx = currentIdx + 1
    if (nextIdx >= reviewSteps.length) {
      setStep("apply")
      return
    }
    const next = reviewSteps[nextIdx]!
    setStep(next)
    if (next === "boq" && primaryBoqId && !diffPreview) {
      setDiffLoading(true)
      const result = await previewAddendaBoqDiff(primaryBoqId)
      setDiffLoading(false)
      if (result.ok) {
        setDiffPreview(result)
        setConfirmedDiffIndices(new Set(result.events.map((_, i) => i)))
      }
    } else if (next === "cover" && primaryCoverId && !coverPreview) {
      await loadCover()
    } else if (
      (next === "fot" || next === "itt" || next === "coc" || next === "sopr") &&
      !specDiffs[next]
    ) {
      await loadSpecDiff(next)
    }
  }

  function goBack() {
    if (step === "pick") return
    if (step === "apply") {
      setStep(reviewSteps[reviewSteps.length - 1] ?? "pick")
      return
    }
    const currentIdx = reviewSteps.indexOf(step as WizardStep)
    if (currentIdx <= 0) setStep("pick")
    else setStep(reviewSteps[currentIdx - 1]!)
  }

  async function loadCover() {
    if (!primaryCoverId) return
    setCoverLoading(true)
    try {
      const result = await parseAddendaDocument(primaryCoverId)
      if (result.ok && result.addenda[0]) {
        setCoverPreview(result.addenda[0])
      }
    } finally {
      setCoverLoading(false)
    }
  }

  /** Load the spec diff for an agent-backed spec (FOT/ITT/COC/SOPR).
   *  Re-uses the existing extraction agent under the hood — see
   *  modules/procurex/addenda/spec-diff-actions.ts. */
  async function loadSpecDiff(specId: AgentSpecId) {
    const docId = uploads[specId]?.[0]?.documentId
    if (!docId) return
    setSpecDiffs((prev) => ({
      ...prev,
      [specId]: {
        events: [],
        confirmed: new Set(),
        loading: true,
        error: null,
      },
    }))
    try {
      const result = await previewAddendaSpecDiff(docId, specId)
      if (!result.ok) {
        setSpecDiffs((prev) => ({
          ...prev,
          [specId]: {
            events: [],
            confirmed: new Set(),
            loading: false,
            error: result.error,
          },
        }))
        return
      }
      setSpecDiffs((prev) => ({
        ...prev,
        [specId]: {
          events: result.events,
          // Default: pre-select all changes.
          confirmed: new Set(result.events.map((_, i) => i)),
          loading: false,
          error: null,
        },
      }))
    } catch (err) {
      setSpecDiffs((prev) => ({
        ...prev,
        [specId]: {
          events: [],
          confirmed: new Set(),
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        },
      }))
    }
  }

  function toggleSpecEvent(specId: AgentSpecId, index: number) {
    setSpecDiffs((prev) => {
      const cur = prev[specId]
      if (!cur) return prev
      const next = new Set(cur.confirmed)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return { ...prev, [specId]: { ...cur, confirmed: next } }
    })
  }

  async function handleApply() {
    setApplying(true)
    setApplyError(null)
    try {
      let eventsApplied = 0
      let addendumNo = ""
      // 1. Apply the BoQ diff (if present)
      if (primaryBoqId && confirmedDiffIndices.size > 0) {
        const result = await applyAddendaBoqDiff({
          documentId: primaryBoqId,
          confirmedIndices: Array.from(confirmedDiffIndices).sort(
            (a, b) => a - b,
          ),
        })
        if (!result.ok) {
          setApplyError(result.error)
          setApplying(false)
          return
        }
        eventsApplied += result.eventsApplied
        addendumNo = result.addendumNo
      }
      // 2. Apply each agent-spec's diff. Each one creates its own TA-N
      //    row (or we could batch them into one — for now per-spec is
      //    clearer in the audit log).
      for (const specId of AGENT_SPECS) {
        const docId = uploads[specId]?.[0]?.documentId
        const diff = specDiffs[specId]
        if (!docId || !diff || diff.confirmed.size === 0) continue
        const result = await applyAddendaSpecDiff({
          documentId: docId,
          specId,
          confirmedIndices: Array.from(diff.confirmed).sort((a, b) => a - b),
        })
        if (!result.ok) {
          setApplyError(`${specId.toUpperCase()}: ${result.error}`)
          setApplying(false)
          return
        }
        eventsApplied += result.eventsApplied
        if (!addendumNo) addendumNo = result.addendumNo
      }
      if (!addendumNo) addendumNo = "TA?"
      onApplied({ addendumNo, eventsApplied })
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err))
      setApplying(false)
    }
  }

  const filesUploaded = Object.values(uploads).reduce(
    (n, list) => n + (list?.length ?? 0),
    0,
  )
  const canAdvance = step === "pick" ? filesUploaded > 0 : true

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
        {/* Header — wizard step indicator */}
        <div className="px-6 py-4 border-b border-[#ececec] flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] text-[#142845]">
              Add Tender Addenda
            </h3>
            <p className="text-[12px] text-[#666] mt-0.5">
              {step === "pick"
                ? "Pick the file types for this addendum and upload each one. Nothing will be processed until you click Next."
                : step === "boq"
                  ? "Review the BoQ changes — only the items that differ from the current BoQ"
                  : step === "cover"
                    ? "Review the cover narrative and detected scope"
                    : step === "sopr"
                      ? "SOPR supplement"
                      : step === "spec"
                        ? "Specification updates"
                        : step === "qa"
                          ? "Tenderer queries (Q&A / TQ)"
                          : "Confirm and apply"}
            </p>
          </div>
          <WizardSteps step={step} reviewSteps={reviewSteps} />
          <button
            type="button"
            onClick={onClose}
            disabled={applying || uploadingKind !== null}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-[#f3f4f5] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4 text-[#555]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {step === "pick" && (
            <PickStep
              uploads={uploads}
              uploadingKind={uploadingKind}
              uploadFor={uploadFor}
              removeUpload={removeUpload}
              error={uploadError}
            />
          )}
          {step === "boq" && (
            <BoqStep
              preview={diffPreview}
              loading={diffLoading}
              confirmed={confirmedDiffIndices}
              onToggle={(i) => {
                setConfirmedDiffIndices((prev) => {
                  const next = new Set(prev)
                  if (next.has(i)) next.delete(i)
                  else next.add(i)
                  return next
                })
              }}
              onSelectAll={() => {
                if (!diffPreview) return
                setConfirmedDiffIndices(
                  new Set(diffPreview.events.map((_, i) => i)),
                )
              }}
              onClearAll={() => setConfirmedDiffIndices(new Set())}
            />
          )}
          {step === "cover" && (
            <CoverStep preview={coverPreview} loading={coverLoading} />
          )}
          {(step === "fot" ||
            step === "itt" ||
            step === "coc" ||
            step === "sopr") && (
            <SpecDiffStep
              specId={step}
              state={specDiffs[step] ?? null}
              onToggle={(i) => toggleSpecEvent(step, i)}
              onSelectAll={() => {
                const cur = specDiffs[step]
                if (!cur) return
                setSpecDiffs((prev) => ({
                  ...prev,
                  [step]: {
                    ...cur,
                    confirmed: new Set(cur.events.map((_, i) => i)),
                  },
                }))
              }}
              onClearAll={() => {
                const cur = specDiffs[step]
                if (!cur) return
                setSpecDiffs((prev) => ({
                  ...prev,
                  [step]: { ...cur, confirmed: new Set() },
                }))
              }}
            />
          )}
          {(step === "spec" || step === "qa") && (
            <SimpleAttachStep
              kind={step}
              files={uploads[step] ?? []}
            />
          )}
          {step === "apply" && (
            <ApplyStep
              uploads={uploads}
              diff={diffPreview}
              confirmed={confirmedDiffIndices}
              cover={coverPreview}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#ececec] flex items-center justify-between">
          <div className="text-[12px] text-[#666]">
            {step === "pick" && (
              <>
                {filesUploaded} file{filesUploaded === 1 ? "" : "s"} uploaded
                {filesUploaded > 0 && (
                  <> · ready when you are</>
                )}
              </>
            )}
            {step === "boq" && diffPreview && (
              <>
                {confirmedDiffIndices.size} of {diffPreview.events.length}{" "}
                changes selected
              </>
            )}
            {step === "apply" && applyError && (
              <span className="text-red-600">{applyError}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step !== "pick" && (
              <button
                type="button"
                onClick={goBack}
                disabled={applying || uploadingKind !== null}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={applying || uploadingKind !== null}
              className="px-3 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg disabled:opacity-40"
            >
              Cancel
            </button>
            {step !== "apply" ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance || applying || uploadingKind !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#142845] hover:bg-[#0a1426] rounded-lg disabled:opacity-40"
              >
                Next
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#142845] hover:bg-[#0a1426] rounded-lg disabled:opacity-40"
              >
                {applying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Applying…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Apply addendum
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Step UI components
// ──────────────────────────────────────────────────────────────────────

function WizardSteps({
  step,
  reviewSteps,
}: {
  step: WizardStep
  reviewSteps: WizardStep[]
}) {
  const order: WizardStep[] = ["pick", ...reviewSteps, "apply"]
  const current = order.indexOf(step)
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-[#888]">
      {order.map((s, i) => (
        <span
          key={s}
          className={`flex items-center gap-1.5 ${
            i < current
              ? "text-[#142845]"
              : i === current
                ? "text-[#142845] font-semibold"
                : "text-[#bbb]"
          }`}
        >
          <span
            className={`size-4 rounded-full flex items-center justify-center text-[9px] ${
              i <= current ? "bg-[#142845] text-white" : "bg-[#e0e0e0]"
            }`}
          >
            {i < current ? "✓" : i + 1}
          </span>
          {i < order.length - 1 && (
            <ArrowRight className="size-2.5 text-[#ccc]" />
          )}
        </span>
      ))}
    </div>
  )
}

function PickStep({
  uploads,
  uploadingKind,
  uploadFor,
  removeUpload,
  error,
}: {
  uploads: Partial<Record<FileKind["id"], UploadedFile[]>>
  uploadingKind: FileKind["id"] | null
  uploadFor: (kind: FileKind) => (files: File[]) => Promise<void>
  removeUpload: (kindId: FileKind["id"], documentId: string) => void
  error: string | null
}) {
  return (
    <div className="px-6 py-5">
      <p className="text-[12px] text-[#666] mb-4">
        Click an icon to upload that file type. You can attach multiple files
        per type — e.g. several spec PDFs or several BoQ sheet pages.
        Nothing is processed until you click Next.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {FILE_KINDS.map((kind) => {
          const files = uploads[kind.id] ?? []
          const isUploading = uploadingKind === kind.id
          const Icon = kind.icon
          return (
            <FileKindCard
              key={kind.id}
              kind={kind}
              icon={Icon}
              files={files}
              isUploading={isUploading}
              onPick={uploadFor(kind)}
              onRemove={(docId) => removeUpload(kind.id, docId)}
            />
          )
        })}
      </div>
      {error && (
        <div className="mt-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}

function FileKindCard({
  kind,
  icon: Icon,
  files,
  isUploading,
  onPick,
  onRemove,
}: {
  kind: FileKind
  icon: typeof FileSpreadsheet
  files: UploadedFile[]
  isUploading: boolean
  onPick: (files: File[]) => Promise<void>
  onRemove: (documentId: string) => void
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length > 0) void onPick(picked)
    e.target.value = ""
  }

  const hasFiles = files.length > 0

  return (
    <div
      className={`relative block rounded-xl border p-4 transition-colors ${
        hasFiles
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-[#e0e0e0] bg-white hover:border-[#142845]/40 hover:bg-[#fafbfc]"
      } ${isUploading ? "opacity-60" : ""}`}
    >
      <label className="cursor-pointer block">
        <input
          type="file"
          accept={kind.accept}
          multiple
          onChange={handleChange}
          disabled={isUploading}
          className="hidden"
        />
        <div className="flex items-start gap-3">
          <div
            className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
              hasFiles
                ? "bg-emerald-100 text-emerald-700"
                : "bg-[#142845]/5 text-[#142845]"
            }`}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasFiles ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Icon className="size-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-[#142845]">
                {kind.label}
              </p>
              {hasFiles && (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  {files.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#888]">{kind.description}</p>
          </div>
        </div>
        {!isUploading && (
          <p className="text-[10px] text-[#aaa] mt-2 flex items-center gap-1">
            <Upload className="size-2.5" />
            {hasFiles
              ? "Click to add more"
              : `${kind.accept} · multiple OK`}
          </p>
        )}
      </label>

      {hasFiles && (
        <ul className="mt-2 space-y-1 pt-2 border-t border-emerald-200/60">
          {files.map((f) => (
            <li
              key={f.documentId}
              className="flex items-center gap-1.5 text-[10px]"
            >
              <span
                className="flex-1 min-w-0 truncate font-mono text-[#142845]"
                title={f.filename}
              >
                {f.filename}
              </span>
              <span className="text-[9px] text-[#888] tabular-nums">
                {(f.sizeBytes / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove(f.documentId)
                }}
                className="size-5 rounded hover:bg-red-50 text-[#999] hover:text-red-600 flex items-center justify-center shrink-0"
                aria-label="Remove"
                title="Remove this file"
              >
                <Trash2 className="size-2.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BoqStep({
  preview,
  loading,
  confirmed,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  preview: BoqDiffPreview | null
  loading: boolean
  confirmed: Set<number>
  onToggle: (i: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center text-[#666] p-10">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="text-sm">Diffing against the current BoQ…</span>
      </div>
    )
  }
  if (!preview) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-[#888]">
        <AlertCircle className="size-5" />
        <span className="text-sm">No BoQ diff was computed.</span>
      </div>
    )
  }
  if (preview.events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <p className="text-[14px] text-[#142845] font-medium">
          No differences in the BoQ
        </p>
        <p className="text-[12px] text-[#666] text-center max-w-md">
          The uploaded workbook matches the current BoQ item-for-item.
          Nothing will be applied for the BoQ section.
        </p>
      </div>
    )
  }
  const changed = preview.events
    .map((e, i) => [i, e] as const)
    .filter(([, e]) => e.eventKind !== "added" && e.eventKind !== "withdrawn")
  const added = preview.events
    .map((e, i) => [i, e] as const)
    .filter(([, e]) => e.eventKind === "added")
  const withdrawn = preview.events
    .map((e, i) => [i, e] as const)
    .filter(([, e]) => e.eventKind === "withdrawn")
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-[#666]">
          <span className="mr-3">✏️ {changed.length} changed</span>
          <span className="mr-3 text-emerald-700">+ {added.length} new</span>
          <span className="text-red-700">− {withdrawn.length} removed</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] px-2.5 py-1 rounded bg-[#142845]/5 text-[#142845] hover:bg-[#142845]/10"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] px-2.5 py-1 rounded hover:bg-[#fafafa] text-[#666]"
          >
            Clear
          </button>
        </div>
      </div>
      {changed.length > 0 && (
        <DiffGroup
          title="Changed items"
          items={changed}
          confirmed={confirmed}
          onToggle={onToggle}
        />
      )}
      {added.length > 0 && (
        <DiffGroup
          title="New items"
          items={added}
          confirmed={confirmed}
          onToggle={onToggle}
        />
      )}
      {withdrawn.length > 0 && (
        <DiffGroup
          title="Removed items"
          items={withdrawn}
          confirmed={confirmed}
          onToggle={onToggle}
        />
      )}
    </div>
  )
}

function DiffGroup({
  title,
  items,
  confirmed,
  onToggle,
}: {
  title: string
  items: ReadonlyArray<readonly [number, ProposedDiffEvent]>
  confirmed: Set<number>
  onToggle: (i: number) => void
}) {
  return (
    <section className="mb-4">
      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#888] mb-2">
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
                </div>
                <p
                  className="text-[12px] text-[#222] truncate"
                  title={ev.reference.label}
                >
                  {ev.reference.label}
                </p>
                <DiffEventPayload event={ev} />
              </div>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DiffEventPayload({ event }: { event: ProposedDiffEvent }) {
  const p = event.payload as Record<string, unknown>
  if (event.eventKind === "quantity_changed") {
    return (
      <p className="mt-1 text-[11px] text-[#555]">
        Quantity:{" "}
        <span className="line-through text-[#999]">{String(p.old ?? "—")}</span>
        {" → "}
        <span className="font-medium text-[#142845]">
          {String(p.new ?? "—")}
        </span>
      </p>
    )
  }
  if (event.eventKind === "description_changed") {
    return (
      <p className="mt-1 text-[11px] text-[#555]">
        <span className="text-[#888]">Was:</span>{" "}
        <span className="line-through text-[#999]">
          {String(p.old ?? "—")}
        </span>
        <span className="mx-1">·</span>
        <span className="text-[#888]">Now:</span>{" "}
        <span className="text-[#142845]">{String(p.new ?? "—")}</span>
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
  if (event.eventKind === "added") {
    return (
      <p className="mt-1 text-[11px] text-[#555]">
        Qty {String(p.quantity ?? "—")} · Unit {String(p.unit ?? "—")}
      </p>
    )
  }
  return null
}

function CoverStep({
  preview,
  loading,
}: {
  preview: AddendumPreview | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center text-[#666] p-10">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="text-sm">Reading cover PDF…</span>
      </div>
    )
  }
  if (!preview) {
    return (
      <div className="p-10 text-center text-[#888]">
        Cover PDF could not be parsed. It will still be attached to the
        addendum.
      </div>
    )
  }
  return (
    <div className="px-6 py-4 space-y-4">
      <div>
        <p className="text-[11px] text-[#888] uppercase tracking-wider">
          Detected metadata
        </p>
        <div className="mt-2 grid grid-cols-3 gap-3 text-[12px]">
          <div>
            <p className="text-[10px] text-[#888]">Cover-stated number</p>
            <p className="font-medium text-[#142845]">
              {preview.no ?? "—"}{" "}
              <span className="text-[10px] text-[#888] font-normal">
                (the system will assign TA{"<n+1>"})
              </span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#888]">Issued date</p>
            <p className="font-medium text-[#142845]">
              {preview.issuedIso ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#888]">Pages</p>
            <p className="font-medium text-[#142845]">{preview.totalPages}</p>
          </div>
        </div>
      </div>
      {preview.sections.length > 0 && (
        <div>
          <p className="text-[11px] text-[#888] uppercase tracking-wider">
            Sections in the cover
          </p>
          <ul className="mt-2 text-[12px] space-y-0.5">
            {preview.sections.map((s) => (
              <li key={s.no} className="flex items-center gap-2">
                <span className="font-mono text-[#888] w-5">{s.no}</span>
                <span className="text-[#222]">{s.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview.queries.length > 0 && (
        <div>
          <p className="text-[11px] text-[#888] uppercase tracking-wider">
            Tenderer queries embedded in the cover · {preview.queries.length}
          </p>
          <p className="text-[11px] text-[#666] mt-1">
            These are recorded as a reference; entity-events from queries
            are not auto-applied in this wizard cut.
          </p>
        </div>
      )}
    </div>
  )
}

function SimpleAttachStep({
  kind,
  files,
}: {
  kind: WizardStep
  files: UploadedFile[]
}) {
  const labels: Record<string, string> = {
    sopr: "SOPR supplements",
    spec: "Specification updates",
    qa: "Q&A / TQ documents",
  }
  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="size-4 text-[#888]" />
        <h4 className="text-[13px] font-medium text-[#142845]">
          {labels[kind] ?? "Attachments"}
        </h4>
        <span className="text-[10px] px-1.5 py-0.5 bg-[#142845]/5 text-[#142845] rounded">
          {files.length}
        </span>
      </div>
      <p className="text-[11px] text-[#888] mb-3">
        These files will be attached to the new addendum. No per-file review
        is needed.
      </p>
      <ul className="space-y-1.5">
        {files.map((f) => (
          <li
            key={f.documentId}
            className="flex items-center gap-2 bg-[#fafbfc] border border-[#ececec] rounded px-3 py-2 text-[12px]"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
            <span
              className="flex-1 min-w-0 truncate font-mono text-[#142845]"
              title={f.filename}
            >
              {f.filename}
            </span>
            <span className="text-[10px] text-[#888] tabular-nums">
              {(f.sizeBytes / 1024).toFixed(0)} KB
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ApplyStep({
  uploads,
  diff,
  confirmed,
  cover,
}: {
  uploads: Partial<Record<FileKind["id"], UploadedFile[]>>
  diff: BoqDiffPreview | null
  confirmed: Set<number>
  cover: AddendumPreview | null
}) {
  const totalFiles = Object.values(uploads).reduce(
    (n, list) => n + (list?.length ?? 0),
    0,
  )
  return (
    <div className="px-6 py-6">
      <p className="text-[12px] text-[#888] uppercase tracking-wider mb-3">
        Ready to apply · {totalFiles} file{totalFiles === 1 ? "" : "s"}
      </p>
      <div className="space-y-3 text-[12px]">
        {Object.entries(uploads).map(([k, list]) => {
          if (!list || list.length === 0) return null
          const kind = FILE_KINDS.find((x) => x.id === k)
          return (
            <div
              key={k}
              className="bg-[#fafbfc] border border-[#ececec] rounded px-3 py-2"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">{kind?.label ?? k}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#142845]/5 text-[#142845] rounded">
                  {list.length}
                </span>
              </div>
              <ul className="space-y-0.5 pl-5">
                {list.map((u) => (
                  <li
                    key={u.documentId}
                    className="text-[#888] font-mono text-[11px] truncate"
                    title={u.filename}
                  >
                    {u.filename}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      {diff && (
        <p className="mt-3 text-[12px] text-[#444]">
          <span className="font-medium">
            {confirmed.size} of {diff.events.length} BoQ changes
          </span>{" "}
          will be applied as events against entity ids.
        </p>
      )}
      {cover && (
        <p className="mt-1 text-[12px] text-[#666]">
          Cover narrative metadata stored ({cover.totalPages} pages,{" "}
          {cover.sections.length} sections).
        </p>
      )}
      <p className="mt-4 text-[11px] text-[#888]">
        The system will create a new addendum row, auto-numbered as the next{" "}
        <span className="font-mono">TA(N+1)</span> for this project. Files
        are attached and any confirmed events are written to the BoQ entity
        history.
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// SpecDiffStep — generic step renderer for FOT/ITT/COC/SOPR diffs.
// ──────────────────────────────────────────────────────────────────────

const SPEC_TITLES: Record<AgentSpecId, string> = {
  fot: "Form of Tender (FOT) — field-level diff",
  itt: "Instructions to Tenderer (ITT) — field-level diff",
  coc: "Conditions of Contract (COC) — field-level diff",
  sopr: "Schedule of Project Requirements (SOPR) — field-level diff",
}

function SpecDiffStep({
  specId,
  state,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  specId: AgentSpecId
  state: {
    events: ProposedFieldEvent[]
    confirmed: Set<number>
    loading: boolean
    error: string | null
  } | null
  onToggle: (i: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}) {
  if (!state || state.loading) {
    return (
      <div className="flex items-center justify-center text-[#666] p-10">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="text-sm">
          Extracting {specId.toUpperCase()} via AI and diffing against the current state…
        </span>
      </div>
    )
  }
  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8">
        <AlertCircle className="size-6 text-red-500" />
        <p className="text-sm text-[#444] max-w-md text-center">{state.error}</p>
      </div>
    )
  }
  if (state.events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <p className="text-[14px] text-[#142845] font-medium">
          No differences in {specId.toUpperCase()}
        </p>
        <p className="text-[12px] text-[#666] text-center max-w-md">
          The agent extracted this {specId.toUpperCase()} and every field matches
          the project's current persisted state. Nothing to apply.
        </p>
      </div>
    )
  }
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-medium text-[#142845]">
          {SPEC_TITLES[specId]}
        </h4>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className="text-[11px] px-2.5 py-1 rounded bg-[#142845]/5 text-[#142845] hover:bg-[#142845]/10">Select all</button>
          <button type="button" onClick={onClearAll} className="text-[11px] px-2.5 py-1 rounded hover:bg-[#fafafa] text-[#666]">Clear</button>
        </div>
      </div>
      <ul className="space-y-1.5">
        {state.events.map((ev, i) => (
          <li key={i} className="bg-[#fafbfc] border border-[#ececec] rounded-lg px-3 py-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={state.confirmed.has(i)} onChange={() => onToggle(i)} className="mt-0.5 size-3.5 accent-[#142845]" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#142845]">{ev.label}</p>
                <p className="text-[10px] text-[#888] font-mono mt-0.5">
                  {(ev.targetRef as { spec?: string; field?: string }).field ?? "—"}
                </p>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
