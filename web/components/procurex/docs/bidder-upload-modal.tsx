"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { requestDocumentUpload } from "@/modules/documents/actions"
import { runExtractionNow } from "@/modules/procurex/tenderers/run-extraction-now"
import {
  applyTendererSubmission,
  discardTendererUpload,
  parseTendererSubmission,
  type TendererSubmissionPreview,
} from "@/modules/procurex/tenderers/submission-actions"

import { uploadFileLocally } from "./upload-client"

/**
 * Per-bidder upload + review wizard. Mirrors the addenda wizard
 * (grid-of-blocks pick step → per-kind review step → apply summary).
 *
 * Pipeline:
 *   - Pick step: clickable card per bidder doc kind. One file per
 *     kind; existing uploads light up green.
 *   - Review steps: walked in order for the kinds that have an uploaded
 *     file. PTC uses the existing `parseTendererSubmission` + matched/
 *     unmatched/missing breakdown; agent-backed kinds (Cover Letter,
 *     FOT, ITT, COC, SOPR) just confirm the doc is queued for
 *     extraction — the workers handle the rest async.
 *   - Apply step: writes priceset+rates for PTC, confirms the rest.
 *
 * No mock data — every state is derived from the server or shown as a
 * literal "Not implemented" placeholder.
 */

// ─── Doc kinds ──────────────────────────────────────────────────────

interface BidderDocKind {
  id: "boq-priceset" | "cover-letter" | "fot" | "itt" | "coc" | "sopr"
  label: string
  description: string
  icon: typeof FileSpreadsheet
  accept: string
  category: string
  /** Per-row review screen (only PTC has one today). Other kinds just
   *  confirm the upload — the agent picks it up via the queue. */
  hasParseReview?: boolean
}

const DOC_KINDS: BidderDocKind[] = [
  {
    id: "boq-priceset",
    label: "Priced BoQ (PTC)",
    description:
      "Bidder's priced BoQ — parsed row-by-row, matched to the project BoQ.",
    icon: FileSpreadsheet,
    accept: ".xlsx",
    category: "Priced BOQ",
    hasParseReview: true,
  },
  {
    id: "cover-letter",
    label: "Cover Letter",
    description:
      "Transmittal letter — agent extracts validity, tender sum, exceptions.",
    icon: FileText,
    accept: ".pdf",
    category: "Cover Letter",
  },
  {
    id: "fot",
    label: "Form of Tender",
    description:
      "FOT agent extracts time for completion, OHP, validity, signatures.",
    icon: FileText,
    accept: ".pdf",
    category: "Form of Tender",
  },
  {
    id: "itt",
    label: "ITT Response",
    description: "Bidder response against the Instructions to Tenderer.",
    icon: FileText,
    accept: ".pdf",
    category: "Invitation to Tender",
  },
  {
    id: "coc",
    label: "Conditions of Contract",
    description: "Bidder amendments or acceptance of the Conditions.",
    icon: FileText,
    accept: ".pdf",
    category: "Conditions of Contract",
  },
  {
    id: "sopr",
    label: "SOPR Response",
    description:
      "Bidder response to the Schedule of Project Requirements.",
    icon: FileText,
    accept: ".pdf",
    category: "Schedule of Project Requirements",
  },
]

type KindId = BidderDocKind["id"]

// ─── State shapes ───────────────────────────────────────────────────

export interface BidderDocSlotState {
  documentId: string
  filename: string
  status: "uploaded" | "applied" | null
}

type ExtractionState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; verdict: unknown; workflowRunId: string }
  | { status: "error"; message: string }

interface UploadedFile {
  documentId: string
  filename: string
  sizeBytes: number
  /** Applied = priceset+rates written (PTC only) or extraction has
   *  succeeded for the agent. Drives the "Applied" badge in cards. */
  applied: boolean
  /** Live verdict from the agent — populated by `runExtractionNow`
   *  immediately after upload (no queue). */
  extraction: ExtractionState
}

type WizardStep = "pick" | KindId | "apply"

// ─── Modal ──────────────────────────────────────────────────────────

export function BidderUploadModal({
  workspaceId,
  projectId,
  tendererId,
  tendererName,
  initialSlots,
  onClose,
  onChanged,
}: {
  workspaceId: string
  projectId: string
  tendererId: string
  tendererName: string
  initialSlots?: Partial<Record<KindId, BidderDocSlotState | null>>
  onClose: () => void
  onChanged?: () => void
}) {
  // Per-kind uploaded file. One file per kind (bidder uploads aren't
  // bundled like addenda's multi-spec attachments).
  const [uploads, setUploads] = useState<Partial<Record<KindId, UploadedFile>>>(
    () => {
      const seed: Partial<Record<KindId, UploadedFile>> = {}
      for (const k of DOC_KINDS) {
        const slot = initialSlots?.[k.id]
        if (slot) {
          seed[k.id] = {
            documentId: slot.documentId,
            filename: slot.filename,
            sizeBytes: 0,
            applied: slot.status === "applied",
            extraction: { status: "idle" },
          }
        }
      }
      return seed
    },
  )
  const [uploadingKind, setUploadingKind] = useState<KindId | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [step, setStep] = useState<WizardStep>("pick")
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  // PTC parse preview (matched/unmatched/missing) — lazily fetched
  // the first time the user steps onto the PTC review screen.
  const [ptcPreview, setPtcPreview] =
    useState<TendererSubmissionPreview | null>(null)
  const [ptcLoading, setPtcLoading] = useState(false)
  const [ptcError, setPtcError] = useState<string | null>(null)

  // Steps in order — every kind with an uploaded file becomes a
  // review step. Pick → reviews → apply.
  const reviewSteps = useMemo<KindId[]>(() => {
    return DOC_KINDS.filter((k) => uploads[k.id]).map((k) => k.id)
  }, [uploads])

  const orderedSteps: WizardStep[] = useMemo(
    () => ["pick", ...reviewSteps, "apply"],
    [reviewSteps],
  )
  const currentIdx = orderedSteps.indexOf(step)
  const canGoBack = currentIdx > 0
  const canGoNext = currentIdx < orderedSteps.length - 1
  const nextStep = canGoNext ? orderedSteps[currentIdx + 1]! : null
  const prevStep = canGoBack ? orderedSteps[currentIdx - 1]! : null

  // Lazy-load PTC preview when stepping into the PTC review screen.
  useEffect(() => {
    if (step !== "boq-priceset") return
    const upload = uploads["boq-priceset"]
    if (!upload) return
    if (ptcPreview?.documentId === upload.documentId) return
    setPtcLoading(true)
    setPtcError(null)
    void (async () => {
      try {
        const result = await parseTendererSubmission(
          upload.documentId,
          tendererId,
        )
        if (result.ok) setPtcPreview(result)
        else setPtcError(result.error)
      } catch (err) {
        setPtcError(err instanceof Error ? err.message : "Parse failed")
      } finally {
        setPtcLoading(false)
      }
    })()
  }, [step, uploads, tendererId, ptcPreview?.documentId])

  // Esc closes (unless busy).
  const busy = uploadingKind !== null || applying || ptcLoading
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, busy])

  async function uploadFor(kind: BidderDocKind, file: File) {
    setUploadingKind(kind.id)
    setUploadError(null)
    try {
      const handle = await requestDocumentUpload({
        workspaceId,
        projectId,
        targetKind: "tenderer",
        targetId: tendererId,
        scope: "bidder_submission",
        category: kind.category,
        filename: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
      })
      await uploadFileLocally({
        documentId: handle.documentId,
        file,
      })
      setUploads((m) => ({
        ...m,
        [kind.id]: {
          documentId: handle.documentId,
          filename: file.name,
          sizeBytes: file.size,
          applied: false,
          // Kick off inline extraction below.
          extraction: { status: "running" },
        },
      }))
      onChanged?.()

      // Fire the agent inline — no queue. The Cover Letter / FOT / ITT
      // / COC / SOPR specs all return a structured verdict; PTC has its
      // own parse path (parseTendererSubmission) shown in the review
      // step, so we skip the AI run for the priceset spec.
      if (kind.id !== "boq-priceset") {
        void (async () => {
          try {
            const result = await runExtractionNow({
              documentId: handle.documentId,
              tendererId,
              // Spec id maps 1:1 to our kind ids for non-PTC kinds.
              specOverride: kind.id,
            })
            setUploads((m) => {
              const cur = m[kind.id]
              if (!cur) return m
              if (result.ok) {
                return {
                  ...m,
                  [kind.id]: {
                    ...cur,
                    extraction: {
                      status: "ok",
                      verdict: result.verdict,
                      workflowRunId: result.workflowRunId,
                    },
                  },
                }
              }
              return {
                ...m,
                [kind.id]: {
                  ...cur,
                  extraction: { status: "error", message: result.error },
                },
              }
            })
            onChanged?.()
          } catch (err) {
            setUploads((m) => {
              const cur = m[kind.id]
              if (!cur) return m
              return {
                ...m,
                [kind.id]: {
                  ...cur,
                  extraction: {
                    status: "error",
                    message:
                      err instanceof Error ? err.message : "Extraction failed",
                  },
                },
              }
            })
          }
        })()
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingKind(null)
    }
  }

  async function removeUpload(kind: BidderDocKind) {
    const upload = uploads[kind.id]
    if (!upload) return
    try {
      await discardTendererUpload(upload.documentId)
    } catch {
      /* best-effort */
    }
    setUploads((m) => {
      const next = { ...m }
      delete next[kind.id]
      return next
    })
    onChanged?.()
  }

  async function applyAll() {
    setApplying(true)
    setApplyError(null)
    try {
      // PTC is the only kind with an explicit "apply" today — it
      // writes the priceset + rates. Other kinds finalise as soon as
      // they're uploaded (the extraction queue takes over).
      const ptc = uploads["boq-priceset"]
      if (ptc && !ptc.applied) {
        const result = await applyTendererSubmission({
          documentId: ptc.documentId,
          tendererId,
        })
        if (!result.ok) {
          setApplyError(result.error)
          setApplying(false)
          return
        }
        setUploads((m) => ({
          ...m,
          "boq-priceset": { ...m["boq-priceset"]!, applied: true },
        }))
      }
      onChanged?.()
      onClose()
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Apply failed")
    } finally {
      setApplying(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  const stepLabel = (s: WizardStep): string => {
    if (s === "pick") return "Pick files"
    if (s === "apply") return "Apply"
    return DOC_KINDS.find((k) => k.id === s)?.label ?? s
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-[40px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className="bg-white rounded-[16px] w-[960px] max-w-[calc(100vw-48px)] shadow-2xl flex flex-col max-h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#e9e9e9]">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="font-semibold text-[#142845] text-[16px] leading-[24px]">
              Upload bidder documents — {tendererName}
            </h2>
            <p className="text-[12px] text-[#666]">
              Attach the bidder's submission docs, review parsed output, then
              apply.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-[8px] size-[32px] flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-[16px] text-[#142845]" />
          </button>
        </div>

        {/* Step indicator */}
        <WizardSteps steps={orderedSteps} current={step} labelOf={stepLabel} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === "pick" && (
            <PickStep
              uploads={uploads}
              uploadingKind={uploadingKind}
              uploadFor={(kind) => (file) => uploadFor(kind, file)}
              onRemove={removeUpload}
              error={uploadError}
            />
          )}
          {step !== "pick" && step !== "apply" && (
            <ReviewStep
              kind={DOC_KINDS.find((k) => k.id === step)!}
              upload={uploads[step as KindId]!}
              ptcPreview={step === "boq-priceset" ? ptcPreview : null}
              ptcLoading={step === "boq-priceset" ? ptcLoading : false}
              ptcError={step === "boq-priceset" ? ptcError : null}
            />
          )}
          {step === "apply" && (
            <ApplyStep
              uploads={uploads}
              ptcPreview={ptcPreview}
              error={applyError}
              applying={applying}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#e9e9e9]">
          <button
            type="button"
            onClick={() => prevStep && setStep(prevStep)}
            disabled={!canGoBack || busy}
            className="flex items-center gap-2 px-4 py-2 text-[12px] text-[#142845] rounded-[16px] border border-[#142845] disabled:opacity-40"
          >
            <ArrowLeft className="size-[14px]" /> Back
          </button>
          <div className="text-[11px] text-[#888]">
            Step {currentIdx + 1} of {orderedSteps.length}
          </div>
          {step === "apply" ? (
            <button
              type="button"
              onClick={() => void applyAll()}
              disabled={busy || Object.keys(uploads).length === 0}
              className="flex items-center gap-2 px-4 py-2 text-[12px] text-white bg-[#142845] rounded-[16px] disabled:opacity-40"
            >
              {applying ? (
                <Loader2 className="size-[14px] animate-spin" />
              ) : (
                <CheckCircle2 className="size-[14px]" />
              )}{" "}
              Apply
            </button>
          ) : (
            <button
              type="button"
              onClick={() => nextStep && setStep(nextStep)}
              disabled={!canGoNext || busy}
              className="flex items-center gap-2 px-4 py-2 text-[12px] text-white bg-[#142845] rounded-[16px] disabled:opacity-40"
            >
              Next <ArrowRight className="size-[14px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step indicator ─────────────────────────────────────────────────

function WizardSteps({
  steps,
  current,
  labelOf,
}: {
  steps: WizardStep[]
  current: WizardStep
  labelOf: (s: WizardStep) => string
}) {
  return (
    <ol className="flex items-center gap-2 px-6 py-3 border-b border-[#e9e9e9] overflow-x-auto">
      {steps.map((s, i) => {
        const active = s === current
        const done = steps.indexOf(current) > i
        return (
          <li
            key={s}
            className={`flex items-center gap-2 shrink-0 text-[11px] font-medium ${
              active
                ? "text-[#142845]"
                : done
                  ? "text-[#142845]/60"
                  : "text-[#aaa]"
            }`}
          >
            <span
              className={`size-5 rounded-full flex items-center justify-center text-[10px] ${
                active
                  ? "bg-[#142845] text-white"
                  : done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-[#eee] text-[#777]"
              }`}
            >
              {done ? <CheckCircle2 className="size-3" /> : i + 1}
            </span>
            <span className="whitespace-nowrap">{labelOf(s)}</span>
            {i < steps.length - 1 && (
              <span className="text-[#ccc] mx-1">›</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ─── Pick step (grid of blocks) ─────────────────────────────────────

function PickStep({
  uploads,
  uploadingKind,
  uploadFor,
  onRemove,
  error,
}: {
  uploads: Partial<Record<KindId, UploadedFile>>
  uploadingKind: KindId | null
  uploadFor: (kind: BidderDocKind) => (file: File) => Promise<void>
  onRemove: (kind: BidderDocKind) => void
  error: string | null
}) {
  return (
    <div className="px-6 py-5">
      <p className="text-[12px] text-[#666] mb-4">
        Click a card to upload that document. One file per slot. Discard
        and re-upload to swap a file. The agent extraction queue picks up
        new uploads automatically; PTC also gets a row-by-row review on
        the next step.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {DOC_KINDS.map((kind) => (
          <BidderDocKindCard
            key={kind.id}
            kind={kind}
            file={uploads[kind.id] ?? null}
            isUploading={uploadingKind === kind.id}
            onPick={uploadFor(kind)}
            onRemove={() => onRemove(kind)}
          />
        ))}
      </div>
      {error && (
        <div className="mt-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Single block ───────────────────────────────────────────────────

function BidderDocKindCard({
  kind,
  file,
  isUploading,
  onPick,
  onRemove,
}: {
  kind: BidderDocKind
  file: UploadedFile | null
  isUploading: boolean
  onPick: (file: File) => Promise<void>
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const Icon = kind.icon
  const has = Boolean(file)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) void onPick(picked)
    e.target.value = ""
  }

  return (
    <div
      className={`relative block rounded-xl border p-4 transition-colors ${
        has
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-[#e0e0e0] bg-white hover:border-[#142845]/40 hover:bg-[#fafbfc]"
      } ${isUploading ? "opacity-60" : ""}`}
    >
      <label className="cursor-pointer block">
        <input
          ref={inputRef}
          type="file"
          accept={kind.accept}
          onChange={handleChange}
          disabled={isUploading}
          className="hidden"
        />
        <div className="flex items-start gap-3">
          <div
            className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
              has
                ? "bg-emerald-100 text-emerald-700"
                : "bg-[#142845]/5 text-[#142845]"
            }`}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : has ? (
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
              {file?.applied && (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  Applied
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#888]">{kind.description}</p>
          </div>
        </div>
        {!isUploading && (
          <p className="text-[10px] text-[#aaa] mt-2 flex items-center gap-1">
            <Upload className="size-2.5" />
            {has ? "Click to swap" : `${kind.accept} · 1 file`}
          </p>
        )}
      </label>

      {file && (
        <ul className="mt-2 space-y-1 pt-2 border-t border-emerald-200/60">
          <li className="flex items-center gap-1.5 text-[10px]">
            <span
              className="flex-1 min-w-0 truncate font-mono text-[#142845]"
              title={file.filename}
            >
              {file.filename}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove()
              }}
              className="size-5 rounded hover:bg-red-50 text-[#999] hover:text-red-600 flex items-center justify-center shrink-0"
              aria-label="Remove"
              title="Discard this file"
            >
              <Trash2 className="size-2.5" />
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

// ─── Review step (per kind) ─────────────────────────────────────────

function ReviewStep({
  kind,
  upload,
  ptcPreview,
  ptcLoading,
  ptcError,
}: {
  kind: BidderDocKind
  upload: UploadedFile
  ptcPreview: TendererSubmissionPreview | null
  ptcLoading: boolean
  ptcError: string | null
}) {
  if (kind.hasParseReview) {
    return (
      <div className="px-6 py-5">
        <Header kind={kind} upload={upload} />
        {ptcLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-[#666] mt-4">
            <Loader2 className="size-3 animate-spin" /> Parsing the workbook
            and matching against the project BoQ…
          </div>
        ) : ptcError ? (
          <div className="mt-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {ptcError}
          </div>
        ) : ptcPreview ? (
          <PtcSummary preview={ptcPreview} />
        ) : null}
      </div>
    )
  }
  // Agent-backed kinds — extraction runs INLINE (no queue). The
  // wizard shows live state: running → ok (with verdict) or error.
  const ext = upload.extraction
  return (
    <div className="px-6 py-5">
      <Header kind={kind} upload={upload} />
      {ext.status === "running" && (
        <div className="mt-4 border border-[#e0e0e0] bg-white rounded-xl p-4 flex items-center gap-3 text-[12px] text-[#475569]">
          <Loader2 className="size-4 animate-spin text-[#142845]" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-[#142845]">Extracting…</span>
            <span>
              Running the <span className="font-mono">{kind.id}</span> agent
              against this file. This can take 10–60s depending on size.
            </span>
          </div>
        </div>
      )}
      {ext.status === "error" && (
        <div className="mt-4 border border-rose-200 bg-rose-50 rounded-xl p-4 text-[12px] text-rose-800">
          <p className="font-medium mb-1">Extraction failed</p>
          <p>{ext.message}</p>
        </div>
      )}
      {ext.status === "ok" && (
        <div className="mt-4 border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 text-[12px] text-[#142845]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="size-4 text-emerald-700" />
            <span className="font-medium text-emerald-800">
              Extraction complete
            </span>
            <span className="text-[10px] font-mono text-[#888] ml-auto">
              run {ext.workflowRunId.slice(0, 8)}…
            </span>
          </div>
          <VerdictPreview verdict={ext.verdict} />
        </div>
      )}
      {ext.status === "idle" && (
        <div className="mt-4 text-[12px] text-[#888]">
          File uploaded. The extraction will start automatically on the next
          upload action.
        </div>
      )}
    </div>
  )
}

/**
 * Friendly verdict preview — flatten the top level of the verdict
 * object and show key/value rows. The view never lies: anything we
 * don't recognise just renders as JSON-ified text.
 */
function VerdictPreview({ verdict }: { verdict: unknown }) {
  if (!verdict || typeof verdict !== "object") {
    return (
      <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-[#475569]">
        {String(verdict)}
      </pre>
    )
  }
  const entries = Object.entries(verdict as Record<string, unknown>).filter(
    ([k]) => !k.startsWith("_"),
  )
  if (entries.length === 0) {
    return (
      <p className="text-[#475569]">
        Agent returned an empty object. Open the workflow run in admin to see
        the raw output.
      </p>
    )
  }
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
      {entries.slice(0, 12).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[11px] font-mono text-[#475569]">{k}</dt>
          <dd className="text-[11px] text-[#142845] truncate">
            {renderVerdictValue(v)}
          </dd>
        </div>
      ))}
      {entries.length > 12 && (
        <p className="col-span-2 text-[10px] text-[#888] italic">
          + {entries.length - 12} more fields
        </p>
      )}
    </dl>
  )
}

function renderVerdictValue(v: unknown): string {
  if (v === null) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (Array.isArray(v)) return `[${v.length} item${v.length === 1 ? "" : "s"}]`
  if (typeof v === "object") {
    try {
      const json = JSON.stringify(v)
      return json.length > 80 ? json.slice(0, 80) + "…" : json
    } catch {
      return "[object]"
    }
  }
  return String(v)
}

function Header({ kind, upload }: { kind: BidderDocKind; upload: UploadedFile }) {
  const Icon = kind.icon
  return (
    <div className="flex items-start gap-3">
      <div className="size-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <h3 className="font-semibold text-[14px] text-[#142845]">
          {kind.label}
        </h3>
        <p
          className="text-[11px] font-mono text-[#475569] truncate"
          title={upload.filename}
        >
          {upload.filename}
        </p>
      </div>
    </div>
  )
}

function PtcSummary({ preview }: { preview: TendererSubmissionPreview }) {
  const total = preview.rows.length
  const matched = preview.stats.matched
  const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0
  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat
        label="Match rate"
        value={`${matchRate}%`}
        tone={matchRate >= 90 ? "good" : matchRate >= 50 ? "warn" : "bad"}
      />
      <Stat label="Priced" value={preview.stats.priced.toString()} />
      <Stat
        label="Unpriced"
        value={preview.stats.unpriced.toString()}
        tone={preview.stats.unpriced > 0 ? "warn" : "neutral"}
      />
      <Stat
        label="Missing"
        value={preview.stats.missing.toString()}
        tone={preview.stats.missing > 0 ? "warn" : "neutral"}
      />
      <Stat
        label="Unmatched"
        value={preview.stats.unmatched.toString()}
        tone={preview.stats.unmatched > 0 ? "warn" : "neutral"}
      />
      <Stat
        label="Tender sum"
        value={`AED ${Number(preview.tenderSumCents).toLocaleString()}`}
        full
      />
    </div>
  )
}

function Stat({
  label,
  value,
  tone = "neutral",
  full,
}: {
  label: string
  value: string
  tone?: "good" | "warn" | "bad" | "neutral"
  full?: boolean
}) {
  const palette =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "bad"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-[#e9e9e9] bg-white text-[#262626]"
  return (
    <div
      className={`border ${palette} rounded-lg p-3 flex flex-col gap-0.5 ${
        full ? "col-span-2 md:col-span-4" : ""
      }`}
    >
      <span className="text-[10px] uppercase tracking-wide text-[#888]">
        {label}
      </span>
      <span className="text-[16px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}

// ─── Apply step ────────────────────────────────────────────────────

function ApplyStep({
  uploads,
  ptcPreview,
  error,
  applying,
}: {
  uploads: Partial<Record<KindId, UploadedFile>>
  ptcPreview: TendererSubmissionPreview | null
  error: string | null
  applying: boolean
}) {
  const items = DOC_KINDS.filter((k) => uploads[k.id])
  return (
    <div className="px-6 py-5">
      <h3 className="font-semibold text-[14px] text-[#142845] mb-2">
        Ready to apply
      </h3>
      <p className="text-[12px] text-[#666] mb-4">
        PTC writes its priceset + rates to the bidder's submission. Other
        kinds are already queued for extraction — clicking Apply just
        closes the wizard.
      </p>
      <ul className="flex flex-col gap-2">
        {items.length === 0 && (
          <li className="text-[12px] text-[#888]">
            No files uploaded yet. Go back to the pick step to attach
            documents.
          </li>
        )}
        {items.map((k) => {
          const upload = uploads[k.id]!
          const Icon = k.icon
          return (
            <li
              key={k.id}
              className="flex items-center gap-3 border border-[#e9e9e9] rounded-lg p-3"
            >
              <div className="size-8 rounded-lg bg-[#142845]/5 text-[#142845] flex items-center justify-center shrink-0">
                <Icon className="size-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[12px] font-medium text-[#142845]">
                  {k.label}
                </span>
                <span
                  className="text-[11px] font-mono text-[#888] truncate"
                  title={upload.filename}
                >
                  {upload.filename}
                </span>
              </div>
              {k.id === "boq-priceset" && ptcPreview && (
                <span className="text-[11px] text-emerald-700 font-medium whitespace-nowrap">
                  {ptcPreview.stats.matched} matched · {ptcPreview.stats.priced}{" "}
                  priced
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {error && (
        <div className="mt-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      {applying && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-[#666]">
          <Loader2 className="size-3 animate-spin" /> Applying…
        </div>
      )}
    </div>
  )
}
