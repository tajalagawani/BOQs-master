"use client"

import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  RotateCw,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { classifyFile } from "@/modules/ai-extraction/actions"
import {
  cancelExtractionJob,
  getExtractionStatus,
  getInFlightUploads,
  retryExtractionJob,
} from "@/modules/ai-extraction/queue/actions"
import { DOC_SPECS, getDocSpec, type DocSpecId } from "@/modules/ai-extraction"
import { requestDocumentUpload } from "@/modules/documents/actions"

import { uploadFileLocally } from "./upload-client"
import { useProjectExtractionStream } from "./use-extraction-stream"

type FileStage =
  | "queued-for-classify"
  | "classifying"
  | "classified"
  | "uploading"
  | "blob-done"
  | "queued"
  | "claimed"
  | "running"
  | "succeeded"
  | "failed"

interface AgentProgress {
  iteration: number
  maxIterations: number
  lastAction: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheCreateTokens?: number
}

interface FileItem {
  /** Stable client-side id. */
  uid: string
  file: File
  stage: FileStage
  /** Detected by the fingerprint classifier. */
  detectedCategoryId: DocSpecId | null
  detectedScore: number | null
  /** User can override the detected category. */
  selectedCategoryId: DocSpecId | null
  /** Set after requestDocumentUpload. */
  documentId: string | null
  /** Set after the Blob upload completes. */
  blobUrl: string | null
  /** Set once a queue row is observed via polling. */
  jobId: string | null
  /** Diagnostic / progress hint. */
  message: string | null
  /** Most recent error. */
  error: string | null
  /** % of Blob upload — 0..100. Only meaningful in "uploading". */
  uploadPercent: number
  /** Live agent progress, updated via polling. */
  agentProgress: AgentProgress | null
  /** V2-9 — token + cost preview from classifyFile. */
  surfaceTokens?: number
  estimatedCostUsd?: number
  routing?: "single_shot" | "chunked"
}

interface BulkUploadZoneProps {
  workspaceId: string
  projectId: string
  /** Restrict the list of categories the classifier may pick. Optional. */
  allowedCategoryIds?: DocSpecId[]
}

const CATEGORIES = Object.entries(DOC_SPECS) as [DocSpecId, (typeof DOC_SPECS)[DocSpecId]][]

export function BulkUploadZone({
  workspaceId,
  projectId,
  allowedCategoryIds,
}: BulkUploadZoneProps) {
  const [items, setItems] = useState<FileItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // One SSE channel for the whole project — every in-flight document
  // streams through here. Each FileRow reads its slice by documentId.
  const sse = useProjectExtractionStream(projectId || null)

  // On mount: pull every in-flight extraction for this project so a
  // page refresh doesn't lose the live progress. Each restored item
  // gets a synthetic File (filename only) — enough for the row UI;
  // SSE / polling drives the live state from there.
  useEffect(() => {
    if (!projectId) return
    let stopped = false
    void (async () => {
      try {
        const inflight = await getInFlightUploads(projectId)
        if (stopped || inflight.length === 0) return
        const restored: FileItem[] = inflight.map((u) => {
          const spec = getDocSpec(u.category)
          const stage: FileStage =
            u.jobStatus === "claimed"
              ? "claimed"
              : u.jobStatus === "running"
                ? "running"
                : "queued"
          return {
            uid: `restored-${u.documentId}`,
            file: new File([], u.filename),
            stage,
            detectedCategoryId: (spec?.id as DocSpecId) ?? null,
            detectedScore: null,
            selectedCategoryId: (spec?.id as DocSpecId) ?? null,
            documentId: u.documentId,
            blobUrl: null,
            jobId: null,
            message: "Restored from server — extraction still in progress.",
            error: u.lastError,
            uploadPercent: 100,
            agentProgress: u.progress
              ? {
                  iteration: u.progress.iteration,
                  maxIterations: u.progress.maxIterations,
                  lastAction: u.progress.lastAction,
                  inputTokens: u.progress.inputTokens,
                  outputTokens: u.progress.outputTokens,
                  cacheReadTokens: u.progress.cacheReadTokens,
                  cacheCreateTokens: u.progress.cacheCreateTokens,
                }
              : null,
          }
        })
        setItems((prev) => {
          // Don't duplicate documents the user just uploaded in this session.
          const existing = new Set(
            prev.map((p) => p.documentId).filter((x): x is string => !!x),
          )
          return [
            ...restored.filter((r) => !existing.has(r.documentId!)),
            ...prev,
          ]
        })
      } catch (err) {
        console.warn("[bulk] in-flight restore failed", err)
      }
    })()
    return () => {
      stopped = true
    }
  }, [projectId])

  const update = (uid: string, patch: Partial<FileItem>) => {
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...patch } : it)))
  }

  const addFiles = (incoming: File[]) => {
    const next: FileItem[] = incoming.map((f) => ({
      uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      stage: "queued-for-classify",
      detectedCategoryId: null,
      detectedScore: null,
      selectedCategoryId: null,
      documentId: null,
      blobUrl: null,
      jobId: null,
      message: null,
      error: null,
      uploadPercent: 0,
      agentProgress: null,
    }))
    setItems((prev) => [...prev, ...next])
    void Promise.all(next.map((item) => classifyOne(item, update, allowedCategoryIds)))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files ?? [])
    if (dropped.length > 0) addFiles(dropped)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length > 0) addFiles(picked)
    e.target.value = ""
  }

  // After classification, when the user clicks "Upload", run the upload
  // pipeline. NOTE: must NOT be called from inside a setState updater —
  // runUploadPipeline calls Server Actions that trigger router
  // transitions, and React forbids router updates during state reducers.
  const confirmAndUpload = (uid: string) => {
    const item = items.find((i) => i.uid === uid)
    if (!item || !item.selectedCategoryId) return
    void runUploadPipeline(item, update, { workspaceId, projectId })
  }

  // Auto-upload anything that has high-confidence classification (>= 4)
  useEffect(() => {
    for (const item of items) {
      if (
        item.stage === "classified" &&
        item.selectedCategoryId &&
        item.detectedScore !== null &&
        item.detectedScore >= 4
      ) {
        void runUploadPipeline(item, update, { workspaceId, projectId })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.uid}:${i.stage}`).join("|")])

  // Poll queue status while any file is in flight on the server side
  const inFlightDocIds = useMemo(
    () =>
      items
        .filter((i) =>
          ["blob-done", "queued", "claimed", "running"].includes(i.stage),
        )
        .map((i) => i.documentId)
        .filter((id): id is string => Boolean(id)),
    [items],
  )

  useEffect(() => {
    if (inFlightDocIds.length === 0) return
    let stopped = false

    const tick = async () => {
      try {
        const statuses = await getExtractionStatus(inFlightDocIds)
        if (stopped) return
        setItems((prev) =>
          prev.map((it) => {
            if (!it.documentId) return it
            const s = statuses.find((x) => x.documentId === it.documentId)
            if (!s || s.status === "none") return it
            const stage = mapJobStatusToStage(s.status)
            return {
              ...it,
              stage,
              jobId: s.jobId,
              error: s.lastError ?? it.error,
              agentProgress: s.progress
                ? {
                    iteration: s.progress.iteration,
                    maxIterations: s.progress.maxIterations,
                    lastAction: s.progress.lastAction,
                    inputTokens: s.progress.inputTokens,
                    outputTokens: s.progress.outputTokens,
                    cacheReadTokens: s.progress.cacheReadTokens,
                    cacheCreateTokens: s.progress.cacheCreateTokens,
                  }
                : it.agentProgress,
            }
          }),
        )
      } catch (err) {
        if (!stopped) {
          console.error("[bulk] status poll failed", err)
        }
      }
    }

    void tick()
    const id = window.setInterval(tick, 2000)
    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [inFlightDocIds.join("|")])

  return (
    <div className="bg-white flex flex-col gap-4 p-10 rounded-2xl w-full">
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-[#141414] text-[18px] leading-6">
            Drop the tender documents
          </h3>
          <p className="font-normal text-[#555] text-xs leading-4 max-w-md">
            Drop one file or all of them at once. The AI auto-detects each
            category, queues the extraction, and routes the result to the right
            slot below.
          </p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => setItems([])}
            className="text-xs text-[#888] underline hover:text-[#142845]"
          >
            Clear list
          </button>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col gap-4 min-h-[180px] items-center justify-center w-full rounded-xl border-2 border-dashed transition-colors ${
          dragOver
            ? "bg-[rgba(20,40,69,0.06)] border-[#142845]"
            : "bg-[rgba(226,237,247,0.5)] border-[#b9d2eb]"
        }`}
      >
        <CloudUpload className="size-7 text-[#142845]" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-[13px] font-medium text-[#142845]">
            Drag &amp; drop tender documents here
          </p>
          <p className="text-[11px] text-[#888]">
            PDF, DOCX, XLSX — one or many at once
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileInput}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#142845] flex gap-2 items-center justify-center px-4 py-2 rounded-xl hover:bg-[#0e1d34]"
        >
          <span className="font-medium text-white text-xs">Browse files</span>
        </button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-2 mt-2">
          {items.map((it) => {
            const ssePogress = it.documentId
              ? sse.liveByDoc.get(it.documentId)
              : undefined
            const ssseLive: AgentProgress | null = ssePogress
              ? {
                  iteration: ssePogress.iteration,
                  maxIterations: ssePogress.maxIterations,
                  lastAction: ssePogress.lastAction,
                  inputTokens: ssePogress.inputTokens,
                  outputTokens: ssePogress.outputTokens,
                  cacheReadTokens: ssePogress.cacheReadTokens,
                  cacheCreateTokens: ssePogress.cacheCreateTokens,
                }
              : null
            return (
              <FileRow
              key={it.uid}
              item={it}
              allowedCategoryIds={allowedCategoryIds}
              ssseLive={ssseLive}
              onCategoryChange={(cat) =>
                update(it.uid, { selectedCategoryId: cat })
              }
              onConfirm={() => confirmAndUpload(it.uid)}
              onRemove={() =>
                setItems((prev) => prev.filter((p) => p.uid !== it.uid))
              }
              onRetry={async () => {
                if (!it.jobId) return
                try {
                  await retryExtractionJob(it.jobId)
                  update(it.uid, { stage: "queued", error: null })
                } catch (err) {
                  update(it.uid, {
                    error: err instanceof Error ? err.message : "Retry failed",
                  })
                }
              }}
              onCancel={async () => {
                if (!it.jobId) return
                try {
                  await cancelExtractionJob(it.jobId)
                  update(it.uid, { stage: "failed", error: "Cancelled" })
                } catch (err) {
                  update(it.uid, {
                    error: err instanceof Error ? err.message : "Cancel failed",
                  })
                }
              }}
            />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Row component
// ─────────────────────────────────────────────────────────────────────

interface FileRowProps {
  item: FileItem
  allowedCategoryIds?: DocSpecId[]
  /** Slice of the project-wide SSE stream for this document, if any. */
  ssseLive?: AgentProgress | null
  onCategoryChange: (cat: DocSpecId) => void
  onConfirm: () => void
  onRemove: () => void
  onRetry: () => void
  onCancel: () => void
}

function FileRow({
  item,
  allowedCategoryIds,
  ssseLive,
  onCategoryChange,
  onConfirm,
  onRemove,
  onRetry,
  onCancel,
}: FileRowProps) {
  const opts = (allowedCategoryIds
    ? CATEGORIES.filter(([id]) => allowedCategoryIds.includes(id))
    : CATEGORIES)

  const isTerminal = item.stage === "succeeded" || item.stage === "failed"
  const isInFlight = ["blob-done", "queued", "claimed", "running"].includes(
    item.stage,
  )

  // Prefer the SSE-streamed event (instant) over the polled snapshot.
  const liveProgress = ssseLive ?? item.agentProgress

  return (
    <div className="flex flex-col gap-2 bg-[#fafafa] rounded-xl border border-[#eee] px-4 py-3">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-[#888] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#142845] truncate">
            {item.file.name}
          </p>
          <p className="text-[10px] text-[#888]">
            {formatSize(item.file.size)}
            {item.surfaceTokens != null ? (
              <>
                {" · "}
                {item.surfaceTokens.toLocaleString()} tokens
                {item.routing === "chunked"
                  ? ` · chunked (${Math.ceil(item.surfaceTokens / 150_000)} chunks)`
                  : " · single-shot"}
                {item.estimatedCostUsd != null
                  ? ` · est. $${item.estimatedCostUsd.toFixed(3)}`
                  : null}
              </>
            ) : null}
          </p>
        </div>

        <StageIndicator item={item} />

        {!isTerminal && !isInFlight ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-[#888] hover:text-[#c32a4f]"
            aria-label="Remove"
          >
            <X className="size-4" />
          </button>
        ) : null}

        {item.stage === "failed" ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs text-[#142845] underline hover:text-[#0e1d34] flex items-center gap-1"
          >
            <RotateCw className="size-3" />
            Retry
          </button>
        ) : null}

        {isInFlight ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] text-[#888] hover:text-[#c32a4f] underline"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {/* Classification / category picker — shown until uploading */}
      {(item.stage === "classified" ||
        item.stage === "queued-for-classify" ||
        item.stage === "classifying") && (
        <div className="flex items-center gap-2 pl-8">
          <span className="text-[11px] text-[#555]">Category:</span>
          <select
            className="text-[11px] border border-[#ddd] rounded px-1 py-0.5 bg-white"
            value={item.selectedCategoryId ?? ""}
            disabled={item.stage !== "classified"}
            onChange={(e) => onCategoryChange(e.target.value as DocSpecId)}
          >
            <option value="" disabled>
              {item.stage === "classifying"
                ? "Classifying…"
                : "— pick a category —"}
            </option>
            {opts.map(([id, spec]) => (
              <option key={id} value={id}>
                {spec.shortLabel} — {spec.label}
              </option>
            ))}
          </select>
          {item.detectedCategoryId ? (
            <span className="text-[10px] text-[#888]">
              detected: <span className="font-medium">{item.detectedCategoryId}</span>
              {item.detectedScore != null
                ? ` (score ${item.detectedScore.toFixed(2)})`
                : ""}
            </span>
          ) : null}
          {item.stage === "classified" && item.selectedCategoryId ? (
            <button
              type="button"
              onClick={onConfirm}
              className="ml-auto text-[11px] bg-[#142845] text-white rounded px-2 py-0.5 hover:bg-[#0e1d34]"
            >
              Upload &amp; extract
            </button>
          ) : null}
        </div>
      )}

      {/* Progress for the Blob upload */}
      {item.stage === "uploading" ? (
        <div className="pl-8">
          <div className="h-1 bg-[#eee] rounded overflow-hidden">
            <div
              className="h-full bg-[#142845] transition-[width]"
              style={{ width: `${item.uploadPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-[#888] mt-1">
            Uploading {item.uploadPercent}%
          </p>
        </div>
      ) : null}

      {/* Error / message line */}
      {item.error ? (
        <div className="pl-8 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {item.error}
        </div>
      ) : item.message ? (
        <p className="pl-8 text-[11px] text-[#555]">{item.message}</p>
      ) : null}

      {/* Live agent iteration line — driven by SSE, falls back to poll snapshot */}
      {liveProgress && isInFlight ? (
        <div className="pl-8 flex items-center gap-2 text-[11px] text-[#142845]">
          <Loader2 className="size-3 animate-spin text-amber-700 shrink-0" />
          <span className="font-mono text-[10px] text-[#888] tabular-nums">
            iter {liveProgress.iteration}/{liveProgress.maxIterations}
          </span>
          <span className="truncate min-w-0 flex-1">{liveProgress.lastAction}</span>
          {liveProgress.inputTokens != null && liveProgress.inputTokens > 0 ? (
            <span className="font-mono text-[10px] text-[#888] tabular-nums whitespace-nowrap">
              {liveProgress.inputTokens}→{liveProgress.outputTokens}
              {liveProgress.cacheReadTokens
                ? ` · r${liveProgress.cacheReadTokens}/c${liveProgress.cacheCreateTokens}`
                : ""}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function StageIndicator({ item }: { item: FileItem }) {
  const stage = item.stage
  if (stage === "queued-for-classify" || stage === "classifying") {
    return (
      <span className="text-[10px] text-amber-700 flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Classifying
      </span>
    )
  }
  if (stage === "classified") {
    return (
      <span className="text-[10px] text-blue-700">Ready</span>
    )
  }
  if (stage === "uploading") {
    return (
      <span className="text-[10px] text-amber-700 flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Uploading
      </span>
    )
  }
  if (stage === "blob-done" || stage === "queued") {
    return (
      <span className="text-[10px] text-[#555] flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Queued
      </span>
    )
  }
  if (stage === "claimed" || stage === "running") {
    return (
      <span className="text-[10px] text-amber-700 flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Extracting
      </span>
    )
  }
  if (stage === "succeeded") {
    return (
      <span className="text-[10px] text-emerald-700 flex items-center gap-1">
        <CheckCircle2 className="size-3" />
        Done
      </span>
    )
  }
  return (
    <span className="text-[10px] text-red-700 flex items-center gap-1">
      <AlertCircle className="size-3" />
      Failed
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Pipeline helpers
// ─────────────────────────────────────────────────────────────────────

async function classifyOne(
  item: FileItem,
  update: (uid: string, patch: Partial<FileItem>) => void,
  allowedCategoryIds: DocSpecId[] | undefined,
) {
  update(item.uid, { stage: "classifying" })
  try {
    const base64 = await fileToBase64(item.file)
    const result = await classifyFile({
      filename: item.file.name,
      mimeType: item.file.type || null,
      base64,
    })
    if (!result.ok || !result.topCategoryId) {
      update(item.uid, {
        stage: "classified",
        detectedCategoryId: null,
        detectedScore: null,
        selectedCategoryId: null,
        error: result.error ?? "Could not classify; pick a category manually.",
      })
      return
    }

    // If we're restricted to a subset (e.g. Step 2 docs only), and the
    // top-scoring category isn't in the allow list, fall back to the highest
    // allowed score.
    let topId = result.topCategoryId as DocSpecId
    let topScore = result.topScore ?? null
    if (allowedCategoryIds && !allowedCategoryIds.includes(topId)) {
      const allowedSorted = Object.entries(result.allScores ?? {})
        .filter(([id]) => allowedCategoryIds.includes(id as DocSpecId))
        .sort(([, a], [, b]) => b.score - a.score)
      const first = allowedSorted[0]
      if (first) {
        topId = first[0] as DocSpecId
        topScore = first[1].score
      }
    }

    update(item.uid, {
      stage: "classified",
      detectedCategoryId: topId,
      detectedScore: topScore,
      selectedCategoryId: topId,
      surfaceTokens: result.surfaceTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      routing: result.routing,
    })
  } catch (err) {
    update(item.uid, {
      stage: "classified",
      error: err instanceof Error ? err.message : "Classify failed",
    })
  }
}

async function runUploadPipeline(
  item: FileItem,
  update: (uid: string, patch: Partial<FileItem>) => void,
  context: { workspaceId: string; projectId: string },
) {
  const categoryId = item.selectedCategoryId
  if (!categoryId) return

  // Guard against re-entry
  if (item.stage !== "classified") return
  update(item.uid, { stage: "uploading", uploadPercent: 0 })

  const spec = DOC_SPECS[categoryId]
  try {
    // 1. Reserve a doc row + storage pathname
    const handle = await requestDocumentUpload({
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      targetKind: "project",
      targetId: context.projectId,
      scope: spec.scope,
      category: spec.category,
      filename: item.file.name,
      mimeType: item.file.type || null,
      sizeBytes: item.file.size,
    })
    update(item.uid, { documentId: handle.documentId })

    // 2. Multipart upload to local-disk route (dev). Same downstream
    //    pipeline as the Blob path — the route writes the file then
    //    enqueues the extraction job.
    const result = await uploadFileLocally({
      documentId: handle.documentId,
      file: item.file,
      onProgress: (percentage) => update(item.uid, { uploadPercent: percentage }),
    })

    update(item.uid, {
      stage: "blob-done",
      blobUrl: result.url,
      uploadPercent: 100,
      message: "Upload complete — waiting for the extraction worker.",
    })
    // The /api/documents/upload route handler enqueues + pokes the worker
    // in onUploadCompleted. From here the poller takes over.
  } catch (err) {
    update(item.uid, {
      stage: "failed",
      error: err instanceof Error ? err.message : "Upload failed",
    })
  }
}

function mapJobStatusToStage(s: string): FileStage {
  switch (s) {
    case "queued":
      return "queued"
    case "claimed":
      return "claimed"
    case "running":
      return "running"
    case "succeeded":
      return "succeeded"
    case "failed":
      return "failed"
    default:
      return "blob-done"
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.onload = () => {
      const data = reader.result as string
      const comma = data.indexOf(",")
      resolve(comma >= 0 ? data.slice(comma + 1) : data)
    }
    reader.readAsDataURL(file)
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
